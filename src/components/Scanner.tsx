"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ScanResult {
  text: string;
  timestamp: number;
  source: "camera" | "file";
}

interface WorkerSuccessMessage {
  type: "result";
  requestId: number;
  text: string;
  format: string | null;
  rawBytes?: number[];
}

interface WorkerErrorMessage {
  type: "error";
  requestId: number;
  name: string;
  message: string;
  notFound?: boolean;
}

type WorkerMessage = WorkerSuccessMessage | WorkerErrorMessage;

interface WorkerDecodeError extends Error {
  notFound?: boolean;
}

interface DecodeResult {
  text: string;
  format: string | null;
  rawBytes?: number[];
}

const SCAN_INTERVAL = 250;
const FLASH_DURATION = 220;
const PAUSE_DURATION = 1500;
const MAX_RESULTS = 20;

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchSettings = MediaTrackSettings & { torch?: boolean };

export function Scanner() {
  const workerRef = useRef<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const pendingRequestRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef(0);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const resolversRef = useRef(
    new Map<number, { resolve: (value: DecodeResult) => void; reject: (reason: WorkerDecodeError) => void }>()
  );

  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [flash, setFlash] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const tgPlatform = (window as unknown as { Telegram?: { WebApp?: { platform?: string } } }).Telegram?.WebApp
      ?.platform;
    if (tgPlatform && ["ios", "android", "android_x"].includes(tgPlatform)) {
      return true;
    }
    const ua = window.navigator?.userAgent ?? "";
    return /iphone|ipad|ipod|android/i.test(ua);
  }, []);

  const statusMessage = useMemo(() => {
    if (isLoadingCamera) {
      return "Запрашиваем доступ к камере…";
    }
    if (active) {
      return paused ? "Код считан — продолжаем через секунду" : "Наведите камеру на QR-код";
    }
    if (hasCamera === false) {
      return "Камера не найдена — воспользуйтесь загрузкой";
    }
    return "Камера выключена";
  }, [active, paused, hasCamera, isLoadingCamera]);

  const clearTimeouts = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearTimeouts();
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (pendingRequestRef.current !== null) {
      pendingRequestRef.current = null;
      workerRef.current?.postMessage({ type: "reset" });
    }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
    }
    setActive(false);
    setPaused(false);
    setFlash(false);
    setTorchAvailable(false);
    setTorchEnabled(false);
    setIsLoadingCamera(false);
  }, [clearTimeouts]);

  useEffect(() => {
    const worker = new Worker(new URL("@/workers/qrScanner.worker.ts", import.meta.url));
    workerRef.current = worker;
    const resolversMap = resolversRef.current;
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;
      const resolver = resolversRef.current.get(data.requestId);
      if (!resolver) {
        return;
      }
      resolversRef.current.delete(data.requestId);
      pendingRequestRef.current = null;
      if (data.type === "result") {
        resolver.resolve({
          text: data.text,
          format: data.format,
          rawBytes: data.rawBytes
        });
      } else {
        const err = new Error(data.message) as WorkerDecodeError;
        err.name = data.name;
        if (data.notFound) {
          err.notFound = true;
        }
        resolver.reject(err);
      }
    };
    return () => {
      worker.postMessage({ type: "reset" });
      worker.terminate();
      pendingRequestRef.current = null;
      resolversMap.forEach(({ reject }) => {
        const err = new Error("Воркер остановлен") as WorkerDecodeError;
        reject(err);
      });
      resolversMap.clear();
    };
  }, []);

  const requestDecode = useCallback(
    (imageData: ImageData, options?: { enhance?: boolean }) => {
      const worker = workerRef.current;
      if (!worker) {
        return Promise.reject(new Error("Сканер ещё не готов"));
      }
      const requestId = ++requestIdRef.current;
      pendingRequestRef.current = requestId;
      return new Promise<DecodeResult>((resolve, reject) => {
        resolversRef.current.set(requestId, {
          resolve,
          reject: reject as (reason: WorkerDecodeError) => void
        });
        worker.postMessage({
          type: "decode",
          requestId,
          imageData,
          enhance: options?.enhance
        });
      });
    },
    []
  );

  const playFeedback = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    const AudioCtor = (window.AudioContext || (window as any).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!AudioCtor) {
      return;
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }
    const context = audioContextRef.current;
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return;
      }
    }
    const duration = 0.18;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);

  const handleSuccess = useCallback(
    (text: string, source: ScanResult["source"]) => {
      setResults((prev) => {
        const filtered = prev.filter((item) => !(item.source === source && item.text === text));
        return [
          { text, timestamp: Date.now(), source },
          ...filtered
        ].slice(0, MAX_RESULTS);
      });
      setError(null);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(200);
        } catch {}
      }
      void playFeedback();
      setFlash(true);
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = setTimeout(() => {
        setFlash(false);
        flashTimeoutRef.current = null;
      }, FLASH_DURATION);

      if (source === "camera") {
        setPaused(true);
        if (videoRef.current) {
          try {
            videoRef.current.pause();
          } catch {}
        }
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
        }
        pauseTimeoutRef.current = setTimeout(() => {
          setPaused(false);
          pauseTimeoutRef.current = null;
          if (videoRef.current) {
            void videoRef.current.play().catch(() => undefined);
          }
        }, PAUSE_DURATION);
      }
    },
    [playFeedback]
  );

  const scanLoop = useCallback(
    (timestamp: number) => {
      if (!active || paused) {
        return;
      }

      const scheduleNext = () => {
        animationFrameRef.current = requestAnimationFrame(scanLoop);
      };

      if (pendingRequestRef.current !== null) {
        scheduleNext();
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
        scheduleNext();
        return;
      }

      if (timestamp - lastScanTimeRef.current < SCAN_INTERVAL) {
        scheduleNext();
        return;
      }

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        scheduleNext();
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      lastScanTimeRef.current = timestamp;

      requestDecode(frame)
        .then((result) => {
          handleSuccess(result.text, "camera");
        })
        .catch((err: WorkerDecodeError) => {
          if (err?.notFound || err?.name === "NotFoundException") {
            return;
          }
          setError(err?.message ?? "Ошибка сканирования");
        });

      scheduleNext();
    },
    [active, paused, requestDecode, handleSuccess]
  );

  useEffect(() => {
    if (!active || paused) {
      return;
    }
    animationFrameRef.current = requestAnimationFrame(scanLoop);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [active, paused, scanLoop]);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Камера не поддерживается в этом браузере");
      fileInputRef.current?.click();
      return;
    }
    setError(null);
    setIsLoadingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {}
      }
      const [track] = stream.getVideoTracks();
      const capabilities = (track?.getCapabilities?.() as TorchCapabilities | undefined) ?? undefined;
      setTorchAvailable(Boolean(capabilities?.torch));
      const torchSetting = (track?.getSettings?.() as TorchSettings | undefined)?.torch;
      setTorchEnabled(Boolean(torchSetting));
      setActive(true);
      setPaused(false);
      setHasCamera(true);
      lastScanTimeRef.current = 0;
    } catch (err: any) {
      stopCamera();
      const message = err?.message ?? "Не удалось получить доступ к камере";
      setError(message);
      if (isMobile) {
        fileInputRef.current?.click();
      }
    } finally {
      setIsLoadingCamera(false);
    }
  }, [isMobile, stopCamera]);

  const handleFile = useCallback(
    async (file: File, source: ScanResult["source"] = "file") => {
      if (!file) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return;
      }

      setError(null);
      try {
        if (typeof createImageBitmap !== "undefined") {
          const bitmap = await createImageBitmap(file);
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          context.drawImage(bitmap, 0, 0);
          if (typeof bitmap.close === "function") {
            bitmap.close();
          }
        } else {
          const url = URL.createObjectURL(file);
          await new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
              context.drawImage(image, 0, 0);
              resolve();
            };
            image.onerror = () => reject(new Error("Не удалось загрузить изображение"));
            image.src = url;
          }).finally(() => {
            URL.revokeObjectURL(url);
          });
        }

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = await requestDecode(imageData, { enhance: true });
        handleSuccess(result.text, source);
      } catch (err: any) {
        if ((err as WorkerDecodeError)?.notFound) {
          setError("Не удалось найти QR-код на изображении");
        } else {
          const message = err?.message ?? "Файл не содержит QR-код";
          setError(message);
        }
      }
    },
    [handleSuccess, requestDecode]
  );

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current;
    const track = stream?.getVideoTracks()[0];
    if (!track?.getCapabilities) {
      return;
    }
    const capabilities = track.getCapabilities() as TorchCapabilities;
    if (!capabilities?.torch) {
      return;
    }
    try {
      const constraints = {
        advanced: [{ torch: !torchEnabled } as unknown as MediaTrackConstraintSet]
      } as MediaTrackConstraints;
      await track.applyConstraints(constraints);
      setTorchEnabled((prev) => !prev);
    } catch (err: any) {
      setError(err?.message ?? "Не удалось переключить фонарик");
    }
  }, [torchEnabled]);

  useEffect(() => {
    let cancelled = false;
    async function checkCamera() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
        setHasCamera(false);
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setHasCamera(devices.some((device) => device.kind === "videoinput"));
        }
      } catch {
        if (!cancelled) {
          setHasCamera(false);
        }
      }
    }
    void checkCamera();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (audioContextRef.current) {
        void audioContextRef.current.close?.();
      }
    };
  }, [stopCamera]);

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Клиентский сканер</h2>
          <p>Камера, вебка или изображение — всё локально.</p>
        </div>
      </header>

      <div className="scanner">
        <div className="scanner__viewport">
          <div className="scanner__video">
            <div className={`scanner__frame${flash ? " scanner__frame--flash" : ""}`}>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={paused ? "paused" : ""}
              />
              <div className="scanner__overlay" aria-hidden>
                <div className="scanner__mask" />
                <div className="scanner__target">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="scanner__canvas" aria-hidden />
            <div className="scanner__controls">
              <button
                type="button"
                onClick={active ? stopCamera : startCamera}
                className={active ? "secondary" : "primary"}
                disabled={isLoadingCamera}
              >
                {active ? "Остановить" : isLoadingCamera ? "Запуск…" : "Включить камеру"}
              </button>
              {active && torchAvailable ? (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={torchEnabled ? "secondary active" : "secondary"}
                  aria-pressed={torchEnabled}
                >
                  {torchEnabled ? "Фонарик выкл." : "Фонарик"}
                </button>
              ) : null}
              <label className="upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleFile(file);
                    }
                    event.target.value = "";
                  }}
                />
                <span>Загрузить изображение</span>
              </label>
            </div>
            <p className="scanner__status">{statusMessage}</p>
            {error ? <p className="error-text" role="alert">{error}</p> : null}
          </div>
        </div>

        <div className="scanner__results">
          <h3>Последние результаты</h3>
          {results.length === 0 ? (
            <p className="hint">Пока нет данных</p>
          ) : (
            <ul>
              {results.map((item) => (
                <li key={`${item.timestamp}-${item.text}`}>
                  <span className="pill pill__small">{item.source === "camera" ? "📷" : "🖼️"}</span>
                  <code>{item.text}</code>
                  <small>{new Date(item.timestamp).toLocaleTimeString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

