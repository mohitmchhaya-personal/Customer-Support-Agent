import type { Metadata } from "next";
import { SupportPagePlaceholder } from "@/components/support/SupportPagePlaceholder";

export const metadata: Metadata = {
  title: "Help & Contact | SpreadBliss",
};

export default function HelpPage() {
  return <SupportPagePlaceholder />;
}
