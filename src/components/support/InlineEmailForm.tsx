"use client";

import { useState } from "react";
import { isValidEmail } from "@/lib/support/email";
import { AlertIcon } from "./icons";

export function InlineEmailForm({
  onSubmit,
  onDismiss,
}: {
  onSubmit: (email: string) => void;
  onDismiss: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    onSubmit(email.trim());
  }

  return (
    <div className="ml-11 max-w-[78%] rounded-2xl border border-line bg-canvas/60 p-4">
      <label
        htmlFor="support-email"
        className="mb-1.5 block text-[13px] font-semibold text-ink"
      >
        Email address
      </label>
      <input
        id="support-email"
        type="email"
        value={email}
        maxLength={254}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="you@organization.org"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "support-email-error" : "support-email-help"}
        className={[
          "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition placeholder:text-muted/60 focus:ring-4",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-line focus:border-brand focus:ring-brand-soft",
        ].join(" ")}
      />
      {error ? (
        <p
          id="support-email-error"
          className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-red-600"
        >
          <AlertIcon className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : (
        <p id="support-email-help" className="mt-1.5 text-[12.5px] text-muted">
          We&apos;ll only use this address to respond to this support request.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        >
          Send to support
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
