# glam-repairs
A skin care website

## Contributing

### Credential wording — never "licensed"

Pakistan has no licensing authority for aestheticians or cosmetologists.
IHRA licenses clinics; PMDC's aesthetic-medicine board covers physicians.
There is no licence this role can hold, so the claim is unsubstantiable and
is precisely the kind of statement that causes confusion as to licensure.

**Never use, anywhere on the site or in marketing copy, about Ayma or any
future practitioner:**

- "licensed", "licensed professional", "licensed practitioner"
- "Dr.", "MD"
- "medical professional", "clinician", "doctor"

**Approved vocabulary:** *certified*, *qualified*, *trained*, *credentialed*.

This applies to visible copy, JSON-LD (`lib/seo/schema.ts`), and the author
registry (`lib/seo/authors.ts`) alike. Before merging any PR that touches
practitioner-facing copy, grep for the banned terms:

```sh
rg -i '\blicensed\b|medical professional|\bclinician\b|\bdoctor\b' app components lib
rg '\bDr\.' app components lib
rg '\bMD\b' app components lib
```

(The `MD`/`Dr.` checks are case-sensitive on purpose — a case-insensitive
scan drowns in false positives from Tailwind's `md:` breakpoint prefix and
`max-w-md` classes.)

A hit inside `lib/legal/terms.ts` or `lib/legal/privacy.ts` advising a
*reader* to "see a doctor" or "see a medical professional" for a concerning
symptom is fine — the rule is about how we describe our own staff, not
about advice to the user.

### Credentials are a single source of truth

Ayma's title, degree, HEC attestation reference, and IDS membership number
live in exactly one place: `AUTHORS["ayma-arif"]` in `lib/seo/authors.ts`.
Every page that shows her credentials — `/about`, `/authors/ayma-arif`,
blog bylines, the plan-selection step — renders them through
`components/seo/CredentialsBlock.tsx`, which reads that record. Never
hardcode a credential string in a page or component; extend the author
record instead.

Label the IDS entry as **membership**, never certification. IDS membership
is free and open (16,000+ members across 160+ countries) — a professional
interest society, not a credentialing body. "Certificate No." or "IDS
Certified" next to an HEC-attested degree invites the reader to read a free
membership as an earned clinical certification, which discredits the
genuinely valuable HEC reference sitting beside it.

Note: this repo's `.gitignore` excludes `*.md` — this file is tracked only
because it predates that rule. Don't add other standalone `.md` files
expecting them to ship; put contributor-facing notes here instead.
