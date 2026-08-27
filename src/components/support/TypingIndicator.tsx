import { Avatar } from "./ChatMessage";

export function TypingIndicator() {
  return (
    <div
      className="flex items-start gap-3"
      role="status"
      aria-label="SpreadBliss Support is typing"
    >
      <Avatar role="support" />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-white px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-muted/60"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}
