"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

interface ScanResult {
  id: string;
  text: string;
  timestamp: number;
  source: "camera" | "file";
}

function createResult(text: string, source: ScanResult["source"]): ScanResult {
  return {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now(),
    source
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function Scanner() {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const mountedRef = useRef(true);
  const stopRequestedRef = useRef(false);
  const [active, setActive] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const tgPlatform = window.Telegram?.WebApp?.platform;
    if (tgPlatform && ["ios", "android", "android_x"].includes(tgPlatform)) {
      return true;
    }
    const ua = window.navigator?.userAgent ?? "";
    return /iphone|ipad|ipod|android/i.test(ua);
  }, []);

  // Centralised teardown: stop the ZXing decode loop (releases the stream)
  // and, belt-and-suspenders, stop any remaining tracks and detach srcObject.
  const teardownCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopRequestedRef.current = true;
    teardownCamera();
    setActive(false);
  }, [teardownCamera]);

  useEffect(() => {
    mountedRef.current = true;
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      mountedRef.current = false;
      teardownCamera();
    };
  }, [teardownCamera]);

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

  const handleFile = useCallback(async (file: File, source: ScanResult["source"] = "file") => {
    if (!readerRef.current) return;
    setError(null);
    const url = URL.createObjectURL(file);
    try {
      const result = await readerRef.current.decodeFromImageUrl(url);
      if (!mountedRef.current) return;
      setResults((prev) => [createResult(result.getText(), source), ...prev].slice(0, 20));
    } catch (err: unknown) {
      if (mountedRef.current) {
        setError(errorMessage(err, "Файл не содержит QR-код"));
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (isMobile) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.style.display = "none";

      const cleanup = () => {
        input.removeEventListener("change", onChange);
        window.removeEventListener("focus", onWindowFocus);
        input.value = "";
        input.parentNode?.removeChild(input);
      };
      const onChange = () => {
        const file = input.files?.[0];
        if (file) {
          void handleFile(file, "camera");
        }
        cleanup();
      };
      // If the user cancels the picker, "change" never fires but the window
      // regains focus — use that to remove the orphaned detached input.
      const onWindowFocus = () => {
        // Defer so a real "change" (which also refocuses) runs first.
        setTimeout(() => {
          if (input.parentNode) cleanup();
        }, 0);
      };

      input.addEventListener("change", onChange);
      window.addEventListener("focus", onWindowFocus, { once: true });
      document.body.appendChild(input);
      input.click();
      return;
    }
    if (!readerRef.current) return;
    if (!videoRef.current) return;
    if (hasCamera === false) {
      setError("Камера не найдена. Загрузите изображение.");
      fileInputRef.current?.click();
      return;
    }
    setError(null);
    stopRequestedRef.current = false;
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const first = devices[0]?.deviceId ?? undefined;
      const controls = await readerRef.current.decodeFromVideoDevice(
        first,
        videoRef.current,
        (result, decodeError) => {
          if (result) {
            const text = result.getText();
            setResults((prev) => {
              // Dedupe consecutive identical scans from the continuous loop.
              if (prev[0]?.text === text) return prev;
              return [createResult(text, "camera"), ...prev].slice(0, 20);
            });
          }
          if (decodeError && decodeError.name !== "NotFoundException") {
            setError(decodeError.message ?? "Ошибка сканирования");
          }
        }
      );
      // If the component unmounted or the user pressed Stop while we awaited,
      // the controls were assigned after teardown ran — stop them now.
      if (stopRequestedRef.current || !mountedRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setActive(true);
    } catch (err: unknown) {
      teardownCamera();
      if (mountedRef.current) {
        setError(errorMessage(err, "Не удалось получить доступ к камере"));
        setActive(false);
      }
    }
  }, [handleFile, hasCamera, isMobile, teardownCamera]);

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Клиентский сканер</h2>
          <p>Камера или изображение, всё локально.</p>
        </div>
      </header>

      <div className="scanner">
        <div className="scanner__video">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="Предпросмотр камеры"
            className={active ? "active" : ""}
          />
          <div className="scanner__controls">
            {active ? (
              <button type="button" onClick={stopCamera} className="secondary">
                Остановить
              </button>
            ) : (
              <button type="button" onClick={startCamera} className="primary">
                Включить камеру
              </button>
            )}
            <label className="upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                aria-label="Загрузить изображение с QR-кодом"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleFile(file);
                  }
                }}
              />
              <span>Загрузить изображение</span>
            </label>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <div className="scanner__results">
          <h3>Последние результаты</h3>
          {results.length === 0 ? (
            <p className="hint">Пока нет данных</p>
          ) : (
            <ul>
              {results.map((item) => (
                <li key={item.id}>
                  <span
                    className="pill pill__small"
                    role="img"
                    aria-label={item.source === "camera" ? "Источник: камера" : "Источник: изображение"}
                  >
                    {item.source === "camera" ? "📷" : "🖼️"}
                  </span>
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
