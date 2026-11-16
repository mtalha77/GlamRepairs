/**
 * Topic hubs, /blog/<cluster> (Handover 73 Part 4).
 *
 * One entry per value of studio_blog_posts.cluster. Each introduction is
 * written for its cluster, not generated: a hub without one is not
 * published (`isPublishableHub`), because an empty hub is worse than none.
 * The list of posts under each hub is read from the database, published
 * only, so a hub can never show a draft or miss a new post.
 *
 * The keys share the /blog/[slug] route with posts, so the database refuses
 * a post slug equal to one of them (constraint blog_slug_not_a_cluster).
 */

export type Cluster = {
  /** Visible heading and breadcrumb label. */
  title: string;
  /** Under 160 characters, for the meta description. */
  description: string;
  /** Paragraphs, plain text. */
  intro: string[];
  /** An internal page this cluster leans on, if any. */
  see?: { label: string; href: string };
};

export const CLUSTERS: Record<string, Cluster> = {
  "korean-skincare": {
    title: "Korean skincare, chosen for Pakistani skin",
    description:
      "Korean skincare by concern and by ingredient: what suits oily skin in humidity, acne, pigmentation and sunscreen, and how to spot a counterfeit in Pakistan.",
    intro: [
      "Korean skincare is easy to buy in Pakistan and easy to get wrong here. Most of it was formulated for a cooler climate and softer water, and the most popular products are also the most counterfeited.",
      "These guides take it by concern and by ingredient: what suits oily skin in humidity, what helps acne and what quietly makes it worse, which sunscreens disappear on brown skin, and how to check that what arrived is genuine. We take no commission from any brand, so nothing here is ranked by what pays.",
    ],
  },
  "air-quality": {
    title: "Air quality and your skin",
    description:
      "What the AQI number means for your face, which Pakistani cities have had the worst air, and what an air purifier can and cannot do for your skin.",
    intro: [
      "Every winter, particulate pollution across Punjab reaches levels that change what skin needs. We publish live PM2.5 readings for cities in Pakistan and abroad, and these articles explain what the numbers mean for your face.",
      "How to read the AQI you check each morning, which cities have had the worst air, and what an air purifier can and cannot do for your skin.",
    ],
    see: { label: "Live air quality by city", href: "/air-quality" },
  },
  diagnostic: {
    title: "Reading your skin",
    description:
      "Oily or dehydrated, three kinds of dark spot, fungal acne, a damaged barrier: how to tell look-alike skin concerns apart before you choose a product.",
    intro: [
      "Most skin concerns look alike at first and respond to different things. Oily or dehydrated, three kinds of dark spot, fungal acne that ordinary acne products make worse, a damaged barrier mistaken for sensitive skin: getting the pattern right comes before choosing a product.",
      "These articles explain how to tell them apart. The brand guides alongside them set out what popular ranges actually contain and who each product suits.",
    ],
  },
  ingredients: {
    title: "Ingredients, explained",
    description:
      "The actives people most often get wrong: how to start retinol without wrecking your barrier, and which dark spot creams sold in Pakistan help or harm.",
    intro: [
      "An ingredient at the wrong strength, started too fast, can do more harm than not using it at all.",
      "These articles cover the actives people most often get wrong: how to start retinol without wrecking your barrier, and which creams sold for dark spots in Pakistan fade them and which make them worse.",
    ],
  },
  pakistan: {
    title: "Skin in Pakistan's climate",
    description:
      "Hard water, smog, humidity and year-round sun: what living in Pakistan does to skin, and why a routine that worked elsewhere can stop working here.",
    intro: [
      "Hard water, smog, humidity and year-round sun each change what your skin does, and advice written for temperate climates rarely accounts for any of them.",
      "These articles explain what living in Pakistan does to skin, and why a routine that worked somewhere else can stop working here.",
    ],
  },
  practical: {
    title: "Getting the right help",
    description:
      "Some skin concerns need a doctor and many need someone who will spend time on your routine. How to tell which is which, so you go to the right place first.",
    intro: [
      "Some skin concerns need a doctor. Many need someone who will spend time on your routine. This section helps you tell which is which, so you go to the right place first.",
    ],
  },
};

export const clusterFor = (key: string | null | undefined): Cluster | null => (key && CLUSTERS[key]) || null;

export const isPublishableHub = (c: Cluster | null): c is Cluster => Boolean(c && c.intro.length && c.intro.every((p) => p.trim()));
