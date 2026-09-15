import {
  describePhotoCount,
  getPlanSettings,
  type PlanSettings,
} from "@/lib/plans/planSettings";
import {
  formatRegionPrice,
  getPricingRegionByCode,
  listActivePricingRegions,
  type PricingRegion,
} from "@/lib/pricing/regions";

/**
 * HANDOVER-22 §5b — the comparison matrix, built from live data.
 *
 * ── Why the prices are read rather than typed ────────────────────────────
 * "Prices must come from pricing_regions and plan_settings, not be typed
 * into the table. Otherwise this page contradicts the pricing page the
 * first time a number changes." Every Glam Repairs figure below — the two
 * prices, the photo counts, the support window, the call length — is read
 * from the database at request time.
 *
 * ── Why this page is priced in rupees, not the visitor's currency ────────
 * Every competing figure here is a Pakistani market figure: Lahore clinic
 * fees, Pakistani online consultation fees, creams sold in Lahore. Showing
 * a British visitor "£12 versus Rs. 2,000–5,000" compares nothing. So the
 * matrix pins itself to the PK region and says so, rather than mixing
 * currencies inside one table. `/pricing` remains the page that shows the
 * visitor their own price.
 *
 * ── Two rows we lose, on purpose ─────────────────────────────────────────
 * "Can prescribe medication" and "Can diagnose skin disease" both read no
 * for Glam Repairs and yes for doctors. They stay, prominently. A matrix
 * where the author wins every row is marketing; one that concedes the two
 * things a doctor genuinely does better is credible — and it is the same
 * position the rest of the site takes, where a client who needs a doctor is
 * referred and refunded.
 *
 * ── And every alternative keeps something ────────────────────────────────
 * A column with nothing good in it is a straw man, and a reader who spots
 * one stops trusting the whole table. Each non-Glam-Repairs column wins at
 * least one row outright.
 */

export type CellTone = "win" | "lose" | "neutral";

export type CompareCell = {
  value: string;
  tone?: CellTone;
  /** Key into COMPARE_SOURCES. Every figure that is not our own carries one. */
  sourceId?: string;
};

export type CompareColumnId =
  | "clinic"
  | "onlineDoctor"
  | "transform"
  | "products"
  | "freeAdvice";

export type CompareColumn = {
  id: CompareColumnId;
  label: string;
  sublabel: string;
  /** Our own column, styled as the subject of the comparison. */
  ours?: boolean;
};

export type CompareRow = {
  id: string;
  label: string;
  /** Shown under the row label where the row needs a sentence to be fair. */
  note?: string;
  cells: Record<CompareColumnId, CompareCell>;
};

export type CompareMatrix = {
  region: PricingRegion;
  columns: CompareColumn[];
  rows: CompareRow[];
  /** Ids of every source actually referenced, in first-use order. */
  usedSourceIds: string[];
};

/**
 * The trial-and-error range is an estimate, not research.
 *
 * The handover is explicit: "Label the illustrative figure honestly. Saying
 * so costs nothing and protects every other number on the page." No
 * credible published figure for average Pakistani skincare spend could be
 * found, so this stays labelled as illustrative wherever it appears and
 * carries no source id — because it has no source.
 */
export const ILLUSTRATIVE_PRODUCT_SPEND = "Rs. 5,000–15,000";

function supportLabel(plan: PlanSettings): string {
  if (!plan.supportDays) return "None";
  const channel = plan.includesWhatsapp ? " on WhatsApp" : "";
  return `${plan.supportDays} days${channel}`;
}

function conversationLabel(plan: PlanSettings): string {
  if (plan.includesVideoCall && plan.videoMinutes) {
    return `WhatsApp + ${plan.videoMinutes}-minute video call`;
  }
  if (plan.includesWhatsapp) return "WhatsApp messaging";
  return "None";
}

export async function buildCompareMatrix(): Promise<CompareMatrix> {
  const [pkRegion, allRegions, plans] = await Promise.all([
    getPricingRegionByCode("PK"),
    listActivePricingRegions(),
    getPlanSettings(),
  ]);

  // If the PK row is ever deactivated, fall back to the default region
  // rather than rendering an empty price. The page's sourcing note names
  // the region it is quoting, so it stays honest either way.
  const region =
    pkRegion ?? allRegions.find((r) => r.isDefault) ?? allRegions[0];

  const transform = plans.transform;

  const columns: CompareColumn[] = [
    {
      id: "clinic",
      label: "Private clinic visit",
      sublabel: "A dermatologist, in person",
    },
    {
      id: "onlineDoctor",
      label: "Online doctor consult",
      sublabel: "A dermatologist, over video",
    },
    /*
     * HANDOVER-27 §1.4 — one Glam Repairs column, not two.
     *
     * Clarity is retired, so a column for it compared the reader against a
     * plan they cannot buy. The sublabel now states the video call outright
     * rather than using it to distinguish two tiers: at Rs. 3,000 as the
     * only paid option it is the reason to choose this over the clinic
     * column sitting next to it at the same price.
     */
    {
      id: "transform",
      label: `Glam Repairs · ${transform.label}`,
      sublabel: transform.includesVideoCall && transform.videoMinutes
        ? `Written assessment + ${transform.videoMinutes} min video call`
        : "Written assessment",
      ours: true,
    },
    {
      id: "products",
      label: "Buying products and hoping",
      sublabel: "Working it out yourself",
    },
    {
      id: "freeAdvice",
      label: "Free advice online",
      sublabel: "Instagram, brand quizzes",
    },
  ];

  const usedSourceIds: string[] = [];
  // Named `cite`, not `use`: a bare `use` trips react-hooks/rules-of-hooks,
  // which reads any call to `use()` outside a component as the React hook.
  const cite = (id: string) => {
    if (!usedSourceIds.includes(id)) usedSourceIds.push(id);
    return id;
  };

  const rows: CompareRow[] = [
    {
      id: "price",
      label: "Price",
      cells: {
        clinic: {
          value: "Rs. 300–5,000",
          sourceId: cite("oladocLahore"),
        },
        onlineDoctor: {
          value: "Rs. 1,000–3,500",
          sourceId: cite("oladocVideo"),
        },
        transform: {
          value: formatRegionPrice(region, "transform"),
          tone: "neutral",
        },
        products: { value: `${ILLUSTRATIVE_PRODUCT_SPEND} (illustrative)` },
        freeAdvice: { value: "Free", tone: "win" },
      },
    },
    {
      id: "assessor",
      label: "Who assesses you",
      cells: {
        clinic: { value: "A qualified doctor", tone: "win" },
        onlineDoctor: { value: "A qualified doctor", tone: "win" },
        transform: {
          value: "A named practitioner with an HEC-attested degree",
          tone: "win",
        },
        products: { value: "Nobody", tone: "lose" },
        freeAdvice: { value: "An algorithm, or a stranger", tone: "lose" },
      },
    },
    {
      id: "looks",
      label: "Looks at your actual skin",
      cells: {
        clinic: { value: "Yes, in person", tone: "win" },
        onlineDoctor: { value: "Sometimes, on video", tone: "neutral" },
        transform: { value: describePhotoCount(transform), tone: "neutral" },
        products: { value: "No", tone: "lose" },
        freeAdvice: { value: "No", tone: "lose" },
      },
    },
    {
      id: "written",
      label: "Written plan you keep",
      cells: {
        clinic: { value: "Usually a prescription only", tone: "neutral" },
        onlineDoctor: { value: "Usually a prescription only", tone: "neutral" },
        transform: { value: "Full written assessment, as a PDF", tone: "win" },
        products: { value: "None", tone: "lose" },
        freeAdvice: { value: "A product list", tone: "lose" },
      },
    },
    {
      id: "time",
      label: "Time to advice",
      cells: {
        clinic: { value: "Same day to several days, plus travel" },
        onlineDoctor: { value: "Same day to a few days" },
        transform: { value: "Within 24 hours", tone: "win" },
        products: { value: "Immediate, and usually wrong" },
        freeAdvice: { value: "Immediate", tone: "win" },
      },
    },
    {
      id: "conversation",
      label: "Live conversation",
      cells: {
        clinic: { value: "In person", tone: "win" },
        onlineDoctor: { value: "Video call", tone: "win" },
        transform: { value: conversationLabel(transform), tone: "neutral" },
        products: { value: "None", tone: "lose" },
        freeAdvice: { value: "None", tone: "lose" },
      },
    },
    {
      id: "followUp",
      label: "Follow-up included",
      cells: {
        clinic: { value: "No — a second visit is a second fee", tone: "lose" },
        onlineDoctor: { value: "No — usually a second fee", tone: "lose" },
        transform: { value: supportLabel(transform), tone: "win" },
        products: { value: "None", tone: "lose" },
        freeAdvice: { value: "None", tone: "lose" },
      },
    },
    {
      id: "prescribe",
      label: "Can prescribe medication",
      note:
        "One of the two rows where a doctor is simply the right choice and we are not.",
      cells: {
        clinic: { value: "Yes", tone: "win" },
        onlineDoctor: { value: "Yes", tone: "win" },
        transform: { value: "No", tone: "lose" },
        products: { value: "No", tone: "lose" },
        freeAdvice: { value: "No", tone: "lose" },
      },
    },
    {
      id: "diagnose",
      label: "Can diagnose skin disease",
      note:
        "The other. If we think you have one, we say so, refer you, and refund you.",
      cells: {
        clinic: { value: "Yes", tone: "win" },
        onlineDoctor: { value: "Yes", tone: "win" },
        transform: { value: "No", tone: "lose" },
        products: { value: "No", tone: "lose" },
        freeAdvice: { value: "No", tone: "lose" },
      },
    },
    {
      id: "bias",
      label: "Commercial bias",
      cells: {
        clinic: {
          value: "A private clinic sells the treatment it recommends",
          tone: "lose",
        },
        onlineDoctor: {
          value: "The platform takes a fee per consultation",
          tone: "neutral",
        },
        transform: { value: "None — no brand commission", tone: "win" },
        products: { value: "Whatever the shelf pushes", tone: "lose" },
        freeAdvice: {
          value: "Paid partnerships and own-brand ranges",
          tone: "lose",
          sourceId: cite("ftcInfluencers"),
        },
      },
    },
    {
      id: "travel",
      label: "Travel required",
      cells: {
        clinic: { value: "Yes", tone: "lose" },
        onlineDoctor: { value: "No", tone: "win" },
        transform: { value: "No", tone: "win" },
        products: { value: "To the shop", tone: "neutral" },
        freeAdvice: { value: "No", tone: "win" },
      },
    },
    {
      id: "bestFor",
      label: "Best for",
      cells: {
        clinic: {
          value:
            "Anything painful, spreading or changing. Procedures. Prescription-strength treatment.",
        },
        onlineDoctor: {
          value: "A prescription you already know you need, without the travel.",
        },
        transform: {
          value:
            "The same, when you want to talk it through and have more to show.",
        },
        products: { value: "Repurchasing something that already works for you." },
        freeAdvice: { value: "General reading. Not a decision about your skin." },
      },
    },
  ];

  return { region, columns, rows, usedSourceIds };
}
