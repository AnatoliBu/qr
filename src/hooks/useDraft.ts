"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearDraft, loadDraft, saveDraft } from "@/lib/indexedDb";

export function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  // Snapshot the first `initial` so reset() restores deterministically even if
  // callers pass an inline object/array whose identity changes each render.
  const initialRef = useRef(initial);
  // Skip the next save effect once, used to avoid re-persisting right after a reset.
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    loadDraft<T>(key).then((draft) => {
      if (!mounted) return;
      // loadDraft resolves null only when there is no stored draft, so falsy
      // but valid drafts (0, "", false) are preserved.
      if (draft !== null) {
        skipNextSaveRef.current = true;
        setValue(draft);
      }
      setHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveDraft(key, value).catch((error) => {
      console.warn("Не удалось сохранить черновик", error);
    });
  }, [key, value, hydrated]);

  const reset = useCallback(async () => {
    // Skip the save effect this value change would otherwise trigger, so the
    // cleared draft is not immediately re-persisted (clearDraft/saveDraft race).
    skipNextSaveRef.current = true;
    setValue(initialRef.current);
    await clearDraft(key);
  }, [key]);

  return { value, setValue, hydrated, reset };
}
