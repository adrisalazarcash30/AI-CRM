"use client";

import { useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";

interface Props {
  message: string;
  variant?: "success" | "error";
  onUndo?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

export default function Toast({
  message,
  variant = "success",
  onUndo,
  onDismiss,
  duration = 8000,
}: Props) {
  useEffect(() => {
    if (!onDismiss) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [duration, onDismiss]);

  return (
    <div
      className="fixed bottom-6 right-6 z-[80] bg-white border border-hairline rounded text-[13px] px-4 py-3 flex items-center gap-3"
      style={{
        boxShadow:
          "0 4px 16px rgba(10,10,10,0.08), 0 1px 3px rgba(10,10,10,0.06)",
      }}
    >
      {variant === "success" ? (
        <Check size={14} className="text-forest" />
      ) : (
        <AlertCircle size={14} className="text-[#9F2D2D]" />
      )}
      <span className="text-inkDeep">{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          className="text-forest hover:underline text-[12px] ml-1"
        >
          undo
        </button>
      )}
    </div>
  );
}
