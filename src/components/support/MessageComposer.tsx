"use client";

import { useEffect, useRef } from "react";
import { SendIcon } from "./icons";

export const MAX_MESSAGE_LENGTH = 1000;

export function MessageComposer({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const canSend = value.trim().length > 0 && !disabled;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="flex items-end gap-3 border-t border-line bg-canvas/50 p-4">
      <label htmlFor="composer" className="sr-only">
        Type your question
      </label>
      <textarea
        id="composer"
        ref={textareaRef}
        rows={1}
        value={value}
        maxLength={MAX_MESSAGE_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
        placeholder="Type your question…"
        className="max-h-40 min-h-[46px] flex-1 resize-none rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] text-ink outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-brand-soft"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        aria-label="Send message"
        className={[
          "inline-flex h-[46px] shrink-0 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft",
          canSend
            ? "bg-brand text-white hover:bg-brand-strong"
            : "cursor-not-allowed bg-brand/35 text-white",
        ].join(" ")}
      >
        <SendIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Send</span>
      </button>
    </div>
  );
}
