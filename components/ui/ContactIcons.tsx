/**
 * Icons for the contact links. The number itself is never printed on the
 * page (Talha, 30 October 2026): the link is the icon and its label, and
 * the digits live only in the href and the structured data. A generic chat
 * bubble rather than the WhatsApp logo, which has its own brand rules.
 */

export function ChatIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.7 0 2.2 1 4.2 2.7 5.6L5.5 20.5l4-1.9c.8.2 1.6.3 2.5.3 4.7 0 8.5-3.4 8.5-7.7S16.7 3.5 12 3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 10.5h7M8.5 13.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M6.6 3.5h2.6l1.4 4-1.9 1.3a11 11 0 006.5 6.5l1.3-1.9 4 1.4v2.6a2 2 0 01-2.2 2A16.5 16.5 0 014.6 5.7a2 2 0 012-2.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
