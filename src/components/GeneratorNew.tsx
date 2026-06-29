"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { getTypeDefinition, type QRType } from "@/lib/qrTypes";
import { bytesToBinaryString } from "@/lib/binary";
import { useDraft } from "@/hooks/useDraft";
import { QR_SYSTEM, calculateMarginPx } from "@/lib/qrConstants";
import styles from "./Generator.module.css";

import { AdvancedPanel } from "./generator/AdvancedPanel";
import { ContentPanel } from "./generator/ContentPanel";
import { StylePanel } from "./generator/StylePanel";
import { buildQrOptions } from "./generator/buildQrOptions";
import {
  LOGO_SIZE_LIMITS,
  defaultStyle,
  fieldKey
} from "./generator/constants";
import { degreesToRadians, getContrastRatio } from "./generator/colorUtils";
import { triggerHaptic } from "./generator/haptics";
import { migrateDraft } from "./generator/migrateDraft";
import { spacingExtension } from "./generator/svgExtension";
import { useQrPreview } from "./generator/useQrPreview";
import { validate } from "./generator/validate";
import type {
  ExportFormat,
  GeneratorDraft,
  Gradient,
  GradientKey,
  GradientType,
  StyleOptions
} from "./generator/types";

export function GeneratorNew() {
  const { value: draft, setValue: setDraft, hydrated } = useDraft<GeneratorDraft>("generator", {
    type: "url",
    formValues: {},
    style: defaultStyle
  });

  // Миграция старых черновиков выполняется один раз после гидрации.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || migratedRef.current) return;
    migratedRef.current = true;
    setDraft((prev) => migrateDraft(prev));
  }, [hydrated, setDraft]);

  const [activeTab, setActiveTab] = useState<"content" | "style" | "advanced">("content");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [byteLength, setByteLength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { containerRef, ctor, ready, render } = useQrPreview();

  const activeDefinition = useMemo(() => getTypeDefinition(draft.type), [draft.type]);

  const updateStyle = useCallback(
    (update: Partial<StyleOptions>) => {
      setDraft((prev) => ({ ...prev, style: { ...prev.style, ...update } }));
    },
    [setDraft]
  );

  const handleMarginChange = useCallback(
    (percent: number) => {
      const clamped = Math.min(
        QR_SYSTEM.MARGIN.MAX,
        Math.max(QR_SYSTEM.MARGIN.MIN, Math.round(percent))
      );
      updateStyle({ marginPercent: clamped });
    },
    [updateStyle]
  );

  const handleExportSizeChange = useCallback(
    (value: number) => {
      const clamped = Math.min(
        QR_SYSTEM.EXPORT.MAX_SIZE,
        Math.max(
          QR_SYSTEM.EXPORT.MIN_SIZE,
          Math.round(value / QR_SYSTEM.EXPORT.STEP) * QR_SYSTEM.EXPORT.STEP
        )
      );
      // Размер экспорта НЕ влияет на preview.
      updateStyle({ exportSize: clamped });
    },
    [updateStyle]
  );

  // Все обновления градиентов идут через функциональный апдейт, без захвата draft.
  const updateGradientStyle = useCallback(
    (key: GradientKey, updater: (current: Gradient) => Gradient) => {
      setDraft((prev) => {
        const current = prev.style[key];
        if (!current) return prev;
        return { ...prev, style: { ...prev.style, [key]: updater(current) } };
      });
    },
    [setDraft]
  );

  const handleGradientToggle = useCallback(
    (key: GradientKey, enabled: boolean) => {
      triggerHaptic("light");
      const flagKey = (
        {
          dotsGradient: "useDotsGradient",
          backgroundGradient: "useBackgroundGradient",
          cornersGradient: "useCornersGradient"
        } as const
      )[key];
      updateStyle({ [flagKey]: enabled } as Partial<StyleOptions>);
    },
    [updateStyle]
  );

  const handleGradientTypeChange = useCallback(
    (key: GradientKey, type: GradientType) => {
      triggerHaptic("light");
      updateGradientStyle(key, (current) => ({ ...current, type }));
    },
    [updateGradientStyle]
  );

  const handleGradientRotationChange = useCallback(
    (key: GradientKey, degrees: number) => {
      updateGradientStyle(key, (current) => ({ ...current, rotation: degreesToRadians(degrees) }));
    },
    [updateGradientStyle]
  );

  const handleGradientColorChange = useCallback(
    (key: GradientKey, stopIndex: number, color: string) => {
      updateGradientStyle(key, (current) => ({
        ...current,
        colorStops: current.colorStops.map((stop, index) =>
          index === stopIndex ? { ...stop, color } : stop
        )
      }));
    },
    [updateGradientStyle]
  );

  const updateValue = useCallback(
    (name: string, value: string) => {
      setDraft((prev) => ({
        ...prev,
        formValues: {
          ...prev.formValues,
          [fieldKey(prev.type, name)]: value
        }
      }));
    },
    [setDraft]
  );

  const switchType = useCallback(
    (type: QRType) => {
      triggerHaptic("light");
      setErrors({});
      setDraft((prev) => ({ ...prev, type }));
    },
    [setDraft]
  );

  const maxLogoSize = useMemo(
    () => LOGO_SIZE_LIMITS[draft.style.errorCorrection] ?? 30,
    [draft.style.errorCorrection]
  );

  const logoSizeExceedsLimit = Boolean(
    draft.style.logoDataUrl && draft.style.logoSize > maxLogoSize
  );

  useEffect(() => {
    if (draft.style.logoDataUrl && draft.style.logoSize > maxLogoSize) {
      updateStyle({ logoSize: maxLogoSize });
    }
  }, [draft.style.logoDataUrl, draft.style.logoSize, maxLogoSize, updateStyle]);

  const handleFileUpload = useCallback(
    (file: File | null) => {
      if (!file) {
        triggerHaptic("light");
        updateStyle({ logoDataUrl: undefined });
        return;
      }
      if (!file.type.startsWith("image/")) {
        triggerHaptic("light");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        triggerHaptic("medium");
        updateStyle({ logoDataUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    },
    [updateStyle]
  );

  const formValues = useMemo(() => {
    const scoped: Record<string, string> = {};
    for (const field of activeDefinition.fields) {
      const key = fieldKey(draft.type, field.name);
      const stored = draft.formValues[key];
      if (stored === undefined && field.prefill !== undefined) {
        scoped[field.name] = field.prefill;
      } else {
        scoped[field.name] = stored ?? "";
      }
    }
    return scoped;
  }, [draft.formValues, draft.type, activeDefinition.fields]);

  const contrastRatio = useMemo(
    () => getContrastRatio(draft.style.foreground, draft.style.background),
    [draft.style.foreground, draft.style.background]
  );
  const showContrastWarning = contrastRatio > 0 && contrastRatio < 4.5;

  const regenerate = useCallback(
    (haptics = true): boolean => {
      const result = validate(activeDefinition, formValues);
      setByteLength(result.byteLength);
      setErrors(result.errors);

      if (!result.valid) {
        if (haptics) triggerHaptic("light");
        return false;
      }

      if (haptics) triggerHaptic("medium");

      const data = bytesToBinaryString(new TextEncoder().encode(result.payload));
      const previewSize = QR_SYSTEM.PREVIEW.LOGICAL_SIZE;
      const previewMargin = calculateMarginPx(previewSize, draft.style.marginPercent);
      render(buildQrOptions(draft.style, { size: previewSize, margin: previewMargin, data }));
      return true;
    },
    [activeDefinition, formValues, draft.style, render]
  );

  // Перерисовка preview при готовности инстанса и любых изменениях стиля/данных.
  useEffect(() => {
    if (!ready) return;
    regenerate(false);
  }, [ready, regenerate]);

  const exportBlob = useCallback(
    async (format: ExportFormat) => {
      if (!ctor) return;
      // Валидация без перерисовки preview.
      const result = validate(activeDefinition, formValues);
      setByteLength(result.byteLength);
      setErrors(result.errors);
      if (!result.valid) {
        triggerHaptic("light");
        return;
      }

      setIsLoading(true);
      triggerHaptic("heavy");

      try {
        const payload = result.payload;
        const data = bytesToBinaryString(new TextEncoder().encode(payload));
        const exportSize = draft.style.exportSize;
        const exportMargin = calculateMarginPx(exportSize, draft.style.marginPercent);

        const exportQR = new ctor(
          buildQrOptions(draft.style, { size: exportSize, margin: exportMargin, data })
        );
        exportQR.applyExtension(spacingExtension);

        const blob = await exportQR.getRawData(format);
        if (!blob) {
          return;
        }

        const slug =
          payload
            .slice(0, 32)
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase() || "qr";
        const fileName = `${slug}.${format}`;
        const mimeType = format === "svg" ? "image/svg+xml" : "image/png";
        const nav = typeof window !== "undefined" ? window.navigator : undefined;
        const shareBlob = blob as Blob;

        if (nav && typeof nav.share === "function" && typeof File !== "undefined") {
          const filesSupported = typeof nav.canShare === "function";
          const shareFile = new File([shareBlob], fileName, { type: mimeType });

          if (!filesSupported || nav.canShare({ files: [shareFile] })) {
            try {
              await nav.share({
                files: [shareFile],
                title: "QR код",
                text: payload
              });
              return;
            } catch (error) {
              if (error instanceof DOMException && error.name === "AbortError") {
                return;
              }
              // fall through to download fallback if sharing fails for another reason
            }
          }
        }

        const url = URL.createObjectURL(shareBlob);
        try {
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } finally {
          URL.revokeObjectURL(url);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [ctor, activeDefinition, formValues, draft.style]
  );

  return (
    <section className={styles.generator}>
      <div className={classNames(styles.qrPreview, "preview")}>
        <div className={classNames(styles.qrCode, "preview__canvas")}>
          <div ref={containerRef} className={styles.qrCanvas} />
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          aria-pressed={activeTab === "content"}
          className={classNames(styles.tab, { [styles.tabActive]: activeTab === "content" })}
          onClick={() => {
            setActiveTab("content");
            triggerHaptic("light");
          }}
        >
          📝 Контент
        </button>
        <button
          aria-pressed={activeTab === "style"}
          className={classNames(styles.tab, { [styles.tabActive]: activeTab === "style" })}
          onClick={() => {
            setActiveTab("style");
            triggerHaptic("light");
          }}
        >
          🎨 Стиль
        </button>
        <button
          aria-pressed={activeTab === "advanced"}
          className={classNames(styles.tab, { [styles.tabActive]: activeTab === "advanced" })}
          onClick={() => {
            setActiveTab("advanced");
            triggerHaptic("light");
          }}
        >
          ⚙️ Продвинутые
        </button>
      </div>

      <ContentPanel
        active={activeTab === "content"}
        activeType={draft.type}
        definition={activeDefinition}
        formValues={formValues}
        errors={errors}
        byteLength={byteLength}
        onSwitchType={switchType}
        onValueChange={updateValue}
      />

      <StylePanel
        active={activeTab === "style"}
        style={draft.style}
        maxLogoSize={maxLogoSize}
        logoSizeExceedsLimit={logoSizeExceedsLimit}
        contrastRatio={contrastRatio}
        showContrastWarning={showContrastWarning}
        onUpdateStyle={updateStyle}
        onGradientToggle={handleGradientToggle}
        onGradientTypeChange={handleGradientTypeChange}
        onGradientRotationChange={handleGradientRotationChange}
        onGradientColorChange={handleGradientColorChange}
        onFileUpload={handleFileUpload}
      />

      <AdvancedPanel
        active={activeTab === "advanced"}
        style={draft.style}
        onUpdateStyle={updateStyle}
        onExportSizeChange={handleExportSizeChange}
        onMarginChange={handleMarginChange}
      />

      <div className={classNames(styles.actionButtons, "preview__actions")}>
        <button
          className={classNames(styles.btn, styles.btnSecondary)}
          onClick={() => {
            regenerate();
          }}
        >
          👁️ Превью
        </button>
        <button
          className={classNames(styles.btn, styles.btnPrimary)}
          onClick={() => exportBlob(draft.style.exportFormat)}
        >
          ⬇️ Скачать QR
        </button>
      </div>

      {isLoading && (
        <div className={classNames(styles.loading, styles.loadingActive)}>
          ⏳ Генерация QR-кода...
        </div>
      )}
    </section>
  );
}
