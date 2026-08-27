import type { Metadata } from "next";
import { PageHeader } from "@/components/support/PageHeader";
import { SupportChat } from "@/components/support/SupportChat";

export const metadata: Metadata = {
  title: "Help & Contact | SpreadBliss",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PageHeader />
      <main className="mx-auto max-w-[820px] px-6 pb-20 pt-12">
        <div className="text-center">
          <h1 className="text-[34px] font-bold tracking-tight text-ink sm:text-[40px]">
            How can we help?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">
            Ask a question about your SpreadBliss account, organization
            profiles, recommendations, donations, privacy or technical issues.
          </p>
        </div>

        <SupportChat />

        <p className="mx-auto mt-6 max-w-xl text-center text-[12.5px] leading-relaxed text-muted">
          AI responses are based on SpreadBliss help content. Questions
          requiring account-specific or sensitive review are sent to a support
          specialist.
        </p>
      </main>
    </div>
  );
}
