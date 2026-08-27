import { Avatar } from "./ChatMessage";
import { ClockIcon } from "./icons";

export function StillWorkingNotice({
  onCheckAgain,
}: {
  onCheckAgain: () => void;
}) {
  return (
    <div className="flex items-start gap-3" role="status">
      <Avatar role="support" />
      <div className="max-w-[78%] rounded-2xl rounded-tl-md border border-line bg-white p-4">
        <p className="flex items-start gap-2 text-[14px] font-medium text-ink">
          <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          Still working on your question — this is taking a little longer than
          usual.
        </p>
        <button
          type="button"
          onClick={onCheckAgain}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand/60 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        >
          Check again
        </button>
      </div>
    </div>
  );
}
