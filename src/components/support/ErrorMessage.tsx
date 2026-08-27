import { AlertIcon, RetryIcon } from "./icons";

export function ErrorMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="ml-11 max-w-[78%] rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="flex items-start gap-2 text-[14px] font-medium text-red-700">
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
        We couldn&apos;t submit your question right now. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-[13.5px] font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
      >
        <RetryIcon className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}
