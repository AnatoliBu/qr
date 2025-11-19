      const raw = result.getRawBytes?.();
      let rawBytes: number[] | undefined = undefined;
      
      // Safely convert raw bytes to array, preventing iteration errors
      if (raw) {
        try {
          // Check if the value is iterable before attempting Array.from
          if (typeof raw === 'object' && raw !== null && (Array.isArray(raw) || Symbol.iterator in raw)) {
            rawBytes = Array.from(raw);
          }
        } catch (e) {
          // If Array.from fails, leave rawBytes as undefined
          // This prevents runtime errors from propagating to the UI
        }
      }
      
      const payload: DecodeSuccess = {
        type: "result",
        requestId,
        text,
        format,
        rawBytes
      };