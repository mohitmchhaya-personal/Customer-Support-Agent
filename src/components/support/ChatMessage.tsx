import type { ReactNode } from "react";
import { BookIcon, SparkleIcon } from "./icons";

export function Avatar({ role }: { role: "support" | "customer" }) {
  if (role === "support") {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-white">
        <SparkleIcon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">
      You
    </span>
  );
}

export function ChatMessageBubble({
  role,
  children,
  sources,
}: {
  role: "support" | "customer";
  children: ReactNode;
  sources?: string[];
}) {
  const isSupport = role === "support";
  return (
    <div
      className={`flex items-start gap-3 ${isSupport ? "" : "flex-row-reverse"}`}
    >
      <Avatar role={role} />
      <div
        className={`flex min-w-0 max-w-[78%] flex-col gap-1.5 ${
          isSupport ? "items-start" : "items-end"
        }`}
      >
        <div
          className={[
            "whitespace-pre-line rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed",
            isSupport
              ? "rounded-tl-md border border-line bg-white text-ink"
              : "rounded-tr-md bg-brand text-white",
          ].join(" ")}
        >
          {children}
        </div>
        {sources && sources.length > 0 ? (
          <p className="flex items-center gap-1.5 px-1 text-[12px] text-muted">
            <BookIcon className="h-3.5 w-3.5 text-gold" />
            Based on: {sources.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
