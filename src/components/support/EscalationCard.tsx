import { maskEmail } from "@/lib/support/email";
import { CheckIcon, ClockIcon } from "./icons";

export function EscalationCard({
  email,
  reference,
}: {
  email: string | null;
  reference: string;
}) {
  return (
    <div className="ml-11 max-w-[78%] shrink-0 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-line bg-canvas/60 px-4 py-2.5">
        <CheckIcon className="h-4 w-4 text-brand" />
        <span className="text-[13px] font-semibold text-ink">
          Support request created
        </span>
      </div>
      <dl className="divide-y divide-line/70 px-4 text-[13.5px]">
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">Status</dt>
          <dd className="inline-flex items-center gap-1.5 font-semibold text-gold-strong">
            <ClockIcon className="h-3.5 w-3.5" />
            Awaiting support review
          </dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">Reference</dt>
          <dd className="font-mono font-semibold text-ink">{reference}</dd>
        </div>
        {email ? (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted">We&apos;ll email</dt>
            <dd className="font-semibold text-ink">{maskEmail(email)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
