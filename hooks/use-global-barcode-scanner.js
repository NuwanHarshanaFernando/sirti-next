import { useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for global barcode scanning detection
 * Detects rapid character input that indicates barcode scanner input
 */
const useGlobalBarcodeScanner = (onBarcodeScanned, options = {}) => {
  const {
    minLength = 4,
    maxLength = 50,
    timeout = 100, // Time between characters to consider it a barcode scan
    endCharacter = "Enter", // Character that typically ends a barcode scan
    preventDefaultOnScan = true,
    enabled = true,
  } = options;

  const bufferRef = useRef("");
  const timeoutRef = useRef(null);
  const lastInputTimeRef = useRef(0);
  const isActiveRef = useRef(false);

  const clearBuffer = useCallback(() => {
    bufferRef.current = "";
    isActiveRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const processPotentialBarcode = useCallback(
    (code) => {
      const trimmedCode = code.trim();
      if (trimmedCode.length >= minLength && trimmedCode.length <= maxLength) {
        onBarcodeScanned(trimmedCode);
        return true;
      }
      return false;
    },
    [minLength, maxLength, onBarcodeScanned]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Ignore if user is typing in an input field (unless it's our search field)
      const target = event.target;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";

      // Allow barcode scanning in search fields
      const isSearchField =
        target.placeholder?.toLowerCase().includes("search") ||
        target.placeholder?.toLowerCase().includes("barcode") ||
        target.placeholder?.toLowerCase().includes("sku");

      if (isInputField && !isSearchField) {
        clearBuffer();
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastInputTimeRef.current;

      // Handle Enter key (common barcode scanner ending)
      if (event.key === "Enter") {
        if (bufferRef.current.length > 0) {
          const wasProcessed = processPotentialBarcode(bufferRef.current);
          if (wasProcessed && preventDefaultOnScan) {
            event.preventDefault();
          }
          clearBuffer();
          return;
        }
      }

      // Handle printable characters
      if (event.key.length === 1) {
        // If too much time has passed, start a new buffer
        if (timeDiff > timeout) {
          bufferRef.current = "";
        }

        // Add character to buffer
        bufferRef.current += event.key;
        lastInputTimeRef.current = currentTime;
        isActiveRef.current = true;

        // Set timeout to process the buffer if no more input comes
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          if (bufferRef.current.length >= minLength) {
            const wasProcessed = processPotentialBarcode(bufferRef.current);
            if (wasProcessed && preventDefaultOnScan) {
              // We can't prevent default retroactively, but we can clear the buffer
            }
          }
          clearBuffer();
        }, timeout * 2);

        // For very rapid input (typical of barcode scanners), start preventing defaults
        if (timeDiff < 50 && bufferRef.current.length > 2) {
          event.preventDefault();
        }
      }
    },
    [
      enabled,
      timeout,
      minLength,
      clearBuffer,
      processPotentialBarcode,
      preventDefaultOnScan,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      clearBuffer();
    };
  }, [enabled, handleKeyDown, clearBuffer]);

  // Return current scanning state for UI feedback
  return {
    isScanning: isActiveRef.current,
    currentBuffer: bufferRef.current,
    clearBuffer,
  };
};

export default useGlobalBarcodeScanner;
