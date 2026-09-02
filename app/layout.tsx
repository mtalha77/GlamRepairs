/**
 * MERGED FILE — replaces app/layout.tsx.
 *
 * Everything the dev already had is preserved verbatim: the four font
 * definitions, the `h-full antialiased` html classes, the body classes and
 * `suppressHydrationWarning`, and the Google Analytics gtag block.
 *
 * ⚠️ Do NOT add a second analytics tag anywhere. GA (G-5B70X63TRH) is wired
 * here via next/script and is confirmed firing. A duplicate would double-count
 * every session and quietly corrupt the funnel data the ad spend depends on.
 *
 * What is new:
 *   • metadataBase + canonical  → fixes "Duplicate pages without canonical" (4 errors)
 *   • real title / description  → fixes "Title too short", "Meta description too short"
 *   • openGraph + twitter       → fixes "Open Graph tags missing" (23), "X card missing" (23)
 *   • site-wide JSON-LD graph   → E-E-A-T entities, invisible to Ahrefs but the
 *                                 single biggest lever for a YMYL site
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import JsonLd from "@/components/seo/JsonLd";
import { AUTHORS, DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { graph, organizationSchema, personSchema, websiteSchema } from "@/lib/seo/schema";
import { SITE } from "@/lib/seo/site";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-5B70X63TRH";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes every relative canonical/OG URL resolve against the www host.
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    // Page-level titles render as "Pricing | GlamRepairs".
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  publisher: SITE.legalName,
  category: "Health & Beauty",
  // Root canonical. Every other route should export its own
  // `alternates: { canonical: "/its-path" }` — see README.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Unchanged from the dev's version. See README for the 1 MB icon problem —
  // it is a real conversion issue, but it needs the replacement files present
  // before this config changes.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "96x96" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml", sizes: "256x256" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const practitioner = AUTHORS[DEFAULT_AUTHOR_SLUG];

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-background text-foreground"
      >
        {/* Site-wide entity graph. The Person node carries the credential that
            earns E-E-A-T credit on every YMYL page that references it. */}
        <JsonLd
          data={graph(
            organizationSchema(),
            websiteSchema(),
            personSchema(practitioner),
          )}
        />

        {/* Google tag (gtag.js) — once in root layout covers every page */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
