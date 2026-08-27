import Image from "next/image";
import { ArrowIcon, BookIcon } from "./icons";

export function PageHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/spreadbliss-logo.png"
            alt="SpreadBliss"
            width={159}
            height={48}
            priority
            className="h-12 w-auto shrink-0 select-none mix-blend-multiply"
          />
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-[12px] font-semibold text-muted sm:inline-flex">
            <BookIcon className="h-3.5 w-3.5 text-brand" />
            Help Center
          </span>
        </div>
        <span
          aria-disabled="true"
          className="inline-flex cursor-default items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-semibold text-brand"
        >
          <ArrowIcon className="h-4 w-4" />
          Back to SpreadBliss
        </span>
      </div>
    </header>
  );
}
