import type { StudioEmail } from "@/lib/studio/emails";
import { formatStudioDateTime } from "@/lib/studio/formatDate";

type EmailHistoryProps = {
  emails: StudioEmail[];
};

export default function EmailHistory({ emails }: EmailHistoryProps) {
  if (emails.length === 0) {
    return (
      <p className="text-sm text-brand-gray">No emails sent yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {emails.map((email) => (
        <li
          key={email.id}
          className="rounded-2xl border border-brand-lavender/70 bg-white px-4 py-3"
        >
          <p className="text-sm font-medium text-brand-ink">{email.subject}</p>
          <p className="mt-1 text-xs text-brand-gray">
            {formatStudioDateTime(email.createdAt)} · {email.toEmail} ·{" "}
            {email.sentBy ? "sent by hand" : "automatic"}
            {email.status === "failed" ? <span className="text-brand-error-strong"> · failed</span> : null}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-gray">
            {email.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
