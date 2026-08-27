export function SuggestionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-line bg-white px-4 py-2 text-left text-[13.5px] font-medium text-ink shadow-sm transition hover:border-brand/60 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
    >
      {label}
    </button>
  );
}
