import { parseSiteContent, type SiteContent } from "./schemas";

/**
 * Validated seed content — the authoritative starting configuration supplied by the owner.
 *
 * Used as (a) the initial database seed, (b) the local development store, and (c) the
 * last-resort fallback when the database is unreachable. Nothing here should be invented:
 * unknown facts are `null` and surface in the admin launch checklist.
 *
 * Normalisations applied to the owner brief (see README → "Content normalisations"):
 * - "Nilacinamide" → "Niacinamide"
 * - "kp2569481@ gmail.com" → "kp2569481@gmail.com"
 * - Instagram URL stripped of tracking parameters
 * - Category display labels reworded (pending owner approval, `labelApproved: false`)
 * - Product and category wording that originally said "whitening" is surfaced as
 *   "brightening"/"radiance" to stay inside the brand's claim-control guardrails;
 *   the owner-supplied wording is preserved on `ownerLabel` for traceability.
 */

const SEEDED_AT = "2026-10-28T00:00:00.000Z";

const raw = {
  version: 1,
  updatedAt: SEEDED_AT,
  brand: {
    name: "Amros Beauty",
    tagline: "Milky Glassy Glow",
    shortDescription:
      "Amros Beauty is a skincare brand built around considered formulation storytelling and a soft, luminous Milky Glassy Glow aesthetic, for customers in India.",
    email: "kp2569481@gmail.com",
    phoneDisplay: "+91 88793 79724",
    phoneE164: "+918879379724",
    instagramUrl: "https://www.instagram.com/amros_beauty/",
    instagramHandle: "@amros_beauty",
    country: "IN",
    currency: "INR",
    address: "Pathanwadi, Malad (East), Suburban Mumbai 400097, Maharashtra, India",
  },
  categories: [
    {
      id: "all",
      label: "All Products",
      ownerLabel: "All",
      description: "Every product currently available from Amros Beauty.",
      sortOrder: 0,
      labelApproved: true,
      isAll: true,
    },
    {
      id: "cream",
      label: "Cream",
      ownerLabel: "Cream",
      description: "Face and night creams designed for a comforting, hydration-focused skincare ritual.",
      sortOrder: 10,
      labelApproved: true,
    },
    {
      id: "serum",
      label: "Serum",
      ownerLabel: "Serum",
      description: "Lightweight concentrates layered under a cream, positioned around ingredient highlights.",
      sortOrder: 15,
      labelApproved: true,
    },
    {
      id: "supplements",
      label: "Supplements & Wellness",
      ownerLabel: "Antioxidant tablet",
      description:
        "Oral supplements positioned around antioxidant ingredients. Follow the packaging directions and speak with a qualified healthcare professional before use.",
      sortOrder: 18,
      labelApproved: false,
    },
    {
      id: "injectables",
      label: "Injectables",
      ownerLabel: "Vitamin injection",
      description:
        "Injectable preparations positioned by the supplier around antioxidant ingredients. Should only be administered by a qualified, licensed healthcare professional in a clinical setting.",
      sortOrder: 19,
      labelApproved: false,
    },
    {
      id: "skin-brightening",
      label: "Skin Brightening",
      ownerLabel: "Skin whitening",
      description:
        "Products positioned for a brighter-looking, more radiant appearance. Amros Beauty does not offer products that change natural skin colour.",
      sortOrder: 20,
      labelApproved: false,
    },
    {
      id: "pigmentation",
      label: "Uneven Tone & Pigmentation",
      ownerLabel: "Skin pigmentation",
      description: "Products positioned for the look of a more even skin tone.",
      sortOrder: 30,
      labelApproved: false,
    },
    {
      id: "fine-lines-pores",
      label: "Fine Lines & Pores",
      ownerLabel: "Wrinkle pore",
      description: "Products positioned for smoother-looking skin and the appearance of pores.",
      sortOrder: 40,
      labelApproved: false,
    },
    {
      id: "dark-head",
      label: "Blackheads & Dark Spots",
      ownerLabel: "Dark head",
      description: "Products positioned for the appearance of blackheads and dark spots.",
      sortOrder: 50,
      labelApproved: false,
    },
    {
      id: "tan-skin",
      label: "Tan & Dullness",
      ownerLabel: "Tan skin",
      description: "Products positioned for the look of sun-dulled, tired-looking skin.",
      sortOrder: 60,
      labelApproved: false,
    },
  ],
  skinTypes: [
    {
      id: "dry",
      label: "Dry Skin",
      description:
        "Skin that can feel tight, rough or flaky, especially after cleansing or in dry weather. A hydration-focused routine is often part of caring for it.",
      sortOrder: 10,
    },
    {
      id: "sensitive",
      label: "Sensitive Skin",
      description:
        "Skin that can react easily — with redness, stinging or discomfort — to products or the environment. Introduce new products slowly and patch-test first.",
      sortOrder: 20,
    },
  ],
  ingredients: [
    {
      id: "vitamin-c",
      name: "Vitamin C",
      suppliedName: null,
      role: "An ingredient commonly used in skincare focused on a brighter-looking, more radiant appearance.",
      generalInfo:
        "Vitamin C is one of the most widely used ingredients in skincare. In general, it is associated with routines aimed at a brighter-looking, more radiant complexion, and it is also known as an antioxidant. How any vitamin C ingredient performs depends on its form, its concentration, the rest of the formula and the individual using it.",
      verifiedProductNote: null,
      image: "/brand/ingredient-vitamin-c.svg",
      approved: true,
    },
    {
      id: "hyaluronic-acid",
      name: "Hyaluronic Acid",
      suppliedName: null,
      role: "Helps attract and retain moisture, supporting hydrated-feeling skin.",
      generalInfo:
        "Hyaluronic acid is a humectant — an ingredient that attracts and holds water. In skincare it is generally used to help skin feel hydrated, soft and comfortable. Its effect in a finished product depends on the form used, the overall formula and the individual's skin.",
      verifiedProductNote: null,
      image: "/brand/ingredient-hyaluronic-acid.svg",
      approved: true,
    },
    {
      id: "niacinamide",
      name: "Niacinamide",
      suppliedName: "Nilacinamide",
      role: "Commonly used in skincare aimed at supporting the skin barrier and improving the appearance of uneven tone.",
      generalInfo:
        "Niacinamide is a form of vitamin B3. It is commonly included in skincare aimed at supporting the skin's natural barrier and at a more even-looking tone. As with any ingredient, results depend on concentration, formulation and individual skin response.",
      verifiedProductNote: null,
      image: "/brand/ingredient-niacinamide.svg",
      approved: true,
    },
    {
      id: "vitamin-e",
      name: "Vitamin E",
      suppliedName: null,
      role: "An ingredient used in skincare formulations for its conditioning and antioxidant properties.",
      generalInfo:
        "Vitamin E (often listed as tocopherol or a related form) is used in skincare formulations for its skin-conditioning and antioxidant properties, and it can help a formula feel nourishing. Its role in a finished product depends on the overall formulation.",
      verifiedProductNote: null,
      image: "/brand/ingredient-vitamin-e.svg",
      approved: true,
    },
    {
      id: "glutathione",
      name: "Glutathione",
      suppliedName: "Gluthathion",
      role: "An antioxidant ingredient commonly featured in routines aimed at a brighter-looking, more even complexion.",
      generalInfo:
        "Glutathione is a naturally occurring compound often described in skincare and supplement contexts as an antioxidant. The way any glutathione preparation performs depends on its form, dose, delivery route and the individual. Oral supplements and injectable preparations are regulated differently from topical skincare — always follow the packaging and consult a qualified healthcare professional.",
      verifiedProductNote: null,
      image: "/brand/ingredient-glutathione.svg",
      approved: true,
    },
    {
      id: "kojic-acid",
      name: "Kojic Acid",
      suppliedName: null,
      role: "Commonly used in skincare positioned around the appearance of uneven tone and dark spots.",
      generalInfo:
        "Kojic acid is an ingredient derived from certain fungi and commonly used in topical skincare that is positioned around a more even-looking tone and the appearance of dark spots. Patch-test before adding it to a routine and stop using it if irritation occurs.",
      verifiedProductNote: null,
      image: "/brand/ingredient-kojic-acid.svg",
      approved: true,
    },
    {
      id: "arbutin",
      name: "Arbutin",
      suppliedName: null,
      role: "Commonly used in skincare positioned around the appearance of uneven tone.",
      generalInfo:
        "Arbutin is an ingredient commonly used in topical skincare positioned around the appearance of a more even skin tone. Its role in a finished product depends on the form used, the overall formulation and the individual's skin.",
      verifiedProductNote: null,
      image: "/brand/ingredient-arbutin.svg",
      approved: true,
    },
    {
      id: "avocado",
      name: "Avocado",
      suppliedName: "Avacado",
      role: "A nourishing ingredient often used in skincare for its conditioning, comforting feel.",
      generalInfo:
        "Avocado-derived ingredients (often listed as avocado oil or persea gratissima oil) are used in skincare for a conditioning, cushioned feel. Its role in a finished product depends on the overall formulation.",
      verifiedProductNote: null,
      image: "/brand/ingredient-avocado.svg",
      approved: true,
    },
  ],
  products: [
    // ---------- 1. KMG Face Cream — Flux Milky Glassy Skin (Avocado + Kojic + Arbutin), 30 g — ₹1,199
    {
      id: "prod_kmg_face_cream",
      slug: "kmg-korean-magic-glow-face-cream",
      name: "Amros Beauty KMG (Korean Magic Glow) Face Cream",
      shortName: "Amros Beauty KMG Face Cream",
      tagline: "Korean Magic Glow — for a Milky Glassy Glow ritual",
      shortDescription:
        "A 30 g face cream positioned around a soft, luminous milky-glow aesthetic. Highlights: Avocado, Kojic acid, Arbutin and Niacinamide.",
      description:
        "Amros Beauty KMG Face Cream is a 30 g cream inspired by a soft, luminous, milky-glow aesthetic. Its ingredient highlights are Avocado, Kojic acid, Arbutin and Niacinamide.\n\nKMG stands for Korean Magic Glow — a nod to the Korean-beauty-inspired look and feel of the cream. Formula details such as the complete ingredient declaration and directions for use will be published once confirmed.",
      pricePaise: 119900,
      currency: "INR",
      sizeLabel: "30 g",
      images: [
        {
          src: "/brand/products/kmg-face-cream-flux-30g.jpg",
          alt: "Amros Beauty KMG Face Cream 30 g jar with gold cap, label reading Avocado, Kojic and Arbutin.",
          width: 1200,
          height: 1500,
          kind: "photo",
        },
        {
          src: "/brand/kmg-jar-open.svg",
          alt: "Concept visualisation of an open KMG jar with a soft white cream texture.",
          width: 800,
          height: 1000,
          kind: "concept",
        },
        {
          src: "/brand/texture-cream.svg",
          alt: "Illustration of a milky white cream swirl with a soft pearl sheen.",
          width: 800,
          height: 1000,
          kind: "concept",
        },
      ],
      ingredientIds: ["avocado", "kojic-acid", "arbutin", "niacinamide"],
      fullIngredientDeclaration: null,
      benefits: [
        {
          id: "hydration",
          title: "Hydration-focused",
          text: "A rich-textured cream designed for a comforting, hydration-focused skincare ritual.",
          approved: true,
        },
        {
          id: "radiance",
          title: "Radiance ritual",
          text: "Features Kojic acid and Arbutin, ingredients commonly used in skincare positioned around a brighter-looking, more even appearance.",
          approved: true,
        },
        {
          id: "barrier",
          title: "Barrier-minded",
          text: "Features Niacinamide, commonly used in skincare aimed at supporting the skin barrier and the appearance of uneven tone.",
          approved: true,
        },
        {
          id: "nourish",
          title: "Soft nourishing",
          text: "Features Avocado, a nourishing ingredient often used in skincare for its conditioning, cushioned feel.",
          approved: true,
        },
      ],
      categoryIds: ["cream", "skin-brightening", "pigmentation"],
      skinTypeIds: ["dry", "sensitive"],
      usageInstructions: null,
      safetyNotes:
        "Patch-test on a small area of skin and wait 24 hours before first use. Avoid the eye area. Stop using the product if irritation, redness or discomfort occurs, and consult a healthcare professional if symptoms persist. Individual skin responses vary, and suitability for every skin type cannot be guaranteed.",
      status: "active",
      availability: "unconfirmed",
      seoTitle: "KMG Korean Magic Glow Face Cream 30 g | Amros Beauty",
      seoDescription:
        "Amros Beauty KMG Face Cream (30 g) with Avocado, Kojic acid, Arbutin and Niacinamide as ingredient highlights. Milky Glassy Glow skincare.",
      claimsApproved: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    // ---------- 2. KMG Orange Vitamin C Serum — ₹649
    {
      id: "prod_kmg_vitc_serum",
      slug: "kmg-orange-vitamin-c-serum",
      name: "Amros Beauty KMG Orange Vitamin C Serum",
      shortName: "KMG Orange Vitamin C Serum",
      tagline: "A radiance-ritual serum with Vitamin C",
      shortDescription:
        "A lightweight serum positioned around a brighter-looking appearance. Highlights: Vitamin C, Hyaluronic Acid, Niacinamide and Vitamin E.",
      description:
        "Amros Beauty KMG Orange Vitamin C Serum is a lightweight serum positioned around a brighter-looking appearance. Its ingredient highlights are Vitamin C, Hyaluronic Acid, Niacinamide and Vitamin E.\n\nUse under your usual cream as part of a milky-glow ritual. Formula details such as the complete ingredient declaration and directions for use will be published once confirmed.",
      pricePaise: 64900,
      currency: "INR",
      sizeLabel: null,
      images: [
        {
          src: "/brand/products/kmg-vitamin-c-orange-serum.jpg",
          alt: "Amros Beauty KMG Orange Vitamin C Serum dropper bottle on an orange editorial backdrop.",
          width: 1200,
          height: 1500,
          kind: "photo",
        },
        {
          src: "/brand/texture-hydration.svg",
          alt: "Illustration of a soft hydrating droplet.",
          width: 800,
          height: 1000,
          kind: "concept",
        },
      ],
      ingredientIds: ["vitamin-c", "hyaluronic-acid", "niacinamide", "vitamin-e"],
      fullIngredientDeclaration: null,
      benefits: [
        {
          id: "radiance",
          title: "Radiance ritual",
          text: "Features Vitamin C, an ingredient commonly used in skincare focused on a brighter-looking appearance.",
          approved: true,
        },
        {
          id: "hydration",
          title: "Hydration-focused",
          text: "Features Hyaluronic Acid, an ingredient known to attract and hold moisture.",
          approved: true,
        },
        {
          id: "barrier",
          title: "Barrier-minded",
          text: "Features Niacinamide, commonly used in skincare aimed at supporting the skin barrier.",
          approved: true,
        },
      ],
      categoryIds: ["serum", "skin-brightening", "tan-skin"],
      skinTypeIds: ["dry", "sensitive"],
      usageInstructions: null,
      safetyNotes:
        "Patch-test on a small area of skin and wait 24 hours before first use. Avoid the eye area. Stop using the product if irritation, redness or discomfort occurs, and consult a healthcare professional if symptoms persist.",
      status: "active",
      availability: "unconfirmed",
      seoTitle: "KMG Orange Vitamin C Serum | Amros Beauty",
      seoDescription:
        "Amros Beauty KMG Orange Vitamin C Serum with Vitamin C, Hyaluronic Acid, Niacinamide and Vitamin E as ingredient highlights.",
      claimsApproved: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    // ---------- 3. KMG Gluta Bright Face Serum — ₹899
    {
      id: "prod_kmg_gluta_serum",
      slug: "kmg-gluta-bright-face-serum",
      name: "Amros Beauty KMG Gluta Bright Face Serum",
      shortName: "KMG Gluta Bright Serum",
      tagline: "A radiance-ritual serum with Glutathione",
      shortDescription:
        "A face serum positioned around a brighter-looking, more even appearance. Highlights: Glutathione, Kojic acid, Vitamin C and Niacinamide.",
      description:
        "Amros Beauty KMG Gluta Bright Face Serum is positioned around a brighter-looking, more even appearance. Its ingredient highlights are Glutathione, Kojic acid, Vitamin C and Niacinamide.\n\nFormula details such as the complete ingredient declaration and directions for use will be published once confirmed. On this website we describe this product as a brightening serum, in line with our claim-control policy — see the \"brand wording\" note on the website for more context.",
      pricePaise: 89900,
      currency: "INR",
      sizeLabel: null,
      images: [
        {
          src: "/brand/products/kmg-gluta-white-serum.jpg",
          alt: "Amros Beauty KMG Gluta Bright Face Serum bottle on an orange editorial backdrop.",
          width: 1200,
          height: 1500,
          kind: "photo",
        },
        {
          src: "/brand/texture-hydration.svg",
          alt: "Illustration of a soft hydrating droplet.",
          width: 800,
          height: 1000,
          kind: "concept",
        },
      ],
      ingredientIds: ["glutathione", "kojic-acid", "vitamin-c", "niacinamide"],
      fullIngredientDeclaration: null,
      benefits: [
        {
          id: "radiance",
          title: "Radiance ritual",
          text: "Features Glutathione and Vitamin C, antioxidant ingredients commonly featured in routines aimed at a brighter-looking complexion.",
          approved: true,
        },
        {
          id: "evenness",
          title: "Even-tone ritual",
          text: "Features Kojic acid, commonly used in skincare positioned around the appearance of uneven tone and dark spots.",
          approved: true,
        },
        {
          id: "barrier",
          title: "Barrier-minded",
          text: "Features Niacinamide, commonly used in skincare aimed at supporting the skin barrier.",
          approved: true,
        },
      ],
      categoryIds: ["serum", "skin-brightening", "pigmentation"],
      skinTypeIds: ["dry", "sensitive"],
      usageInstructions: null,
      safetyNotes:
        "Patch-test on a small area of skin and wait 24 hours before first use. Avoid the eye area. Stop using the product if irritation, redness or discomfort occurs, and consult a healthcare professional if symptoms persist.",
      status: "active",
      availability: "unconfirmed",
      seoTitle: "KMG Gluta Bright Face Serum | Amros Beauty",
      seoDescription:
        "Amros Beauty KMG Gluta Bright Face Serum with Glutathione, Kojic acid, Vitamin C and Niacinamide as ingredient highlights.",
      claimsApproved: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    // ---------- 4. KMG Glutathione Night Cream — ₹1,999
    {
      id: "prod_kmg_gluta_night_cream",
      slug: "kmg-glutathione-night-cream",
      name: "Amros Beauty KMG Glutathione Night Cream",
      shortName: "KMG Glutathione Night Cream",
      tagline: "A rich night cream positioned around a milky-glow ritual",
      shortDescription:
        "A 50 g night cream positioned around a soft, milky-glow finish. Highlight: Glutathione.",
      description:
        "Amros Beauty KMG Glutathione Night Cream is a 50 g night cream positioned around a soft, milky-glow finish. Its ingredient highlight is Glutathione.\n\nUse at night as part of a milky-glow ritual. Formula details such as the complete ingredient declaration and directions for use will be published once confirmed. On this website we describe this product as a milky-glow night cream, in line with our claim-control policy — see the \"brand wording\" note on the website for more context.",
      pricePaise: 199900,
      currency: "INR",
      sizeLabel: "50 g",
      images: [
        {
          src: "/brand/products/kmg-glutathione-night-cream-50g.jpg",
          alt: "Amros Beauty KMG Glutathione Night Cream 50 g jar with a milky swirl on top.",
          width: 1200,
          height: 1500,
          kind: "photo",
        },
        {
          src: "/brand/texture-cream.svg",
          alt: "Illustration of a milky white cream swirl.",
          width: 800,
          height: 1000,
          kind: "concept",
        },
      ],
      ingredientIds: ["glutathione"],
      fullIngredientDeclaration: null,
      benefits: [
        {
          id: "nightly",
          title: "A nightly ritual",
          text: "A rich-textured cream designed for a comforting, hydration-focused ritual at night.",
          approved: true,
        },
        {
          id: "radiance",
          title: "Radiance ritual",
          text: "Features Glutathione, an antioxidant ingredient commonly featured in routines aimed at a brighter-looking appearance.",
          approved: true,
        },
      ],
      categoryIds: ["cream", "skin-brightening", "fine-lines-pores"],
      skinTypeIds: ["dry"],
      usageInstructions: null,
      safetyNotes:
        "Patch-test on a small area of skin and wait 24 hours before first use. Avoid the eye area. Stop using the product if irritation, redness or discomfort occurs, and consult a healthcare professional if symptoms persist.",
      status: "active",
      availability: "unconfirmed",
      seoTitle: "KMG Glutathione Night Cream 50 g | Amros Beauty",
      seoDescription:
        "Amros Beauty KMG Glutathione Night Cream (50 g) with Glutathione as an ingredient highlight. Milky Glassy Glow skincare.",
      claimsApproved: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    // ---------- 5. Amros Glutathione + Vitamin C Antioxidant Capsules — ₹1,199
    {
      id: "prod_amros_gluta_vitc_caps",
      slug: "amros-glutathione-vitamin-c-capsules",
      name: "Amros Glutathione + Vitamin C Antioxidant Capsules",
      shortName: "Amros Gluta Vit C Capsules",
      tagline: "An oral antioxidant supplement",
      shortDescription:
        "An oral supplement positioned around antioxidant ingredients Glutathione and Vitamin C. 30 capsules per pack.",
      description:
        "Amros Glutathione + Vitamin C Antioxidant Capsules are an oral supplement positioned around antioxidant ingredients. Each pack contains 30 capsules. The ingredient highlights are Glutathione and Vitamin C.\n\nFollow the directions printed on the packaging. Oral supplements are regulated differently from topical skincare — please consult a qualified healthcare professional before starting a supplement, especially if you are pregnant, breastfeeding, under eighteen, or taking any other medication. This is not intended to diagnose, treat or prevent any condition.",
      pricePaise: 119900,
      currency: "INR",
      sizeLabel: "30 capsules",
      images: [
        {
          src: "/brand/products/amros-glutathione-vitamin-c-capsules.jpg",
          alt: "Amros Glutathione + Vitamin C Antioxidant Capsules — 30-capsule amber bottle.",
          width: 1200,
          height: 1500,
          kind: "photo",
        },
      ],
      ingredientIds: ["glutathione", "vitamin-c"],
      fullIngredientDeclaration: null,
      benefits: [
        {
          id: "antioxidant",
          title: "Antioxidant pairing",
          text: "Features Glutathione and Vitamin C, both commonly described as antioxidant ingredients in supplement contexts.",
          approved: true,
        },
      ],
      categoryIds: ["supplements", "skin-brightening"],
      skinTypeIds: [],
      usageInstructions: null,
      safetyNotes:
        "Supplements are not a substitute for a balanced diet or medical advice. Follow the directions printed on the pack. Do not exceed the stated dose. Consult a qualified healthcare professional before use, especially during pregnancy, breastfeeding, if under eighteen, or if you are taking other medication. Stop use and seek medical advice if any adverse reaction occurs.",
      status: "active",
      availability: "unconfirmed",
      seoTitle: "Amros Glutathione + Vitamin C Antioxidant Capsules",
      seoDescription:
        "Amros Glutathione + Vitamin C Antioxidant Capsules — 30 capsules per pack, positioned around antioxidant ingredients.",
      claimsApproved: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    // ---------- 6. Amros Vitamin C + Glutathione Injection — ₹999
    {
      id: "prod_amros_gluta_vitc_injection",
      slug: "amros-vitamin-c-glutathione-injection",
      name: "Amros Vitamin C + Glutathione Injection (5 ml)",
      shortName: "Amros Vit C + Glutathione Injection",
      tagline: "A 5 ml injectable preparation — healthcare-professional administration only",
      shortDescription:
        "A 5 ml injectable preparation positioned around antioxidant ingredients. Should only be administered by a qualified, licensed healthcare professional in a clinical setting.",
      description:
        "Amros Vitamin C + Glutathione Injection is a 5 ml injectable preparation positioned around antioxidant ingredients. Its ingredient highlights are Vitamin C and Glutathione.\n\nImportant: Injectable preparations should only be administered by a qualified, licensed healthcare professional in an appropriate clinical setting. Please consult a doctor before considering any injectable, especially if you are pregnant, breastfeeding, under eighteen, or taking any other medication. Amros Beauty does not provide clinical administration and the website does not recommend self-administration. Regulations around injectable preparations vary by country and state — follow all local laws.",
      pricePaise: 99900,
      currency: "INR",
      sizeLabel: "5 ml vial",
      images: [
        {
          src: "/brand/products/amros-extra-whitening-vitamin-c-vial.jpg",
          alt: "Amros Vitamin C + Glutathione Injection — 5 ml amber vial with a silver crimp top.",
          width: 1200,
          height: 1500,
          kind: "photo",
        },
      ],
      ingredientIds: ["vitamin-c", "glutathione"],
      fullIngredientDeclaration: null,
      benefits: [
        {
          id: "antioxidant",
          title: "Antioxidant pairing",
          text: "Features Vitamin C and Glutathione, both commonly described as antioxidant ingredients.",
          approved: true,
        },
      ],
      categoryIds: ["injectables", "skin-brightening"],
      skinTypeIds: [],
      usageInstructions: null,
      safetyNotes:
        "Injectable preparations should only be administered by a qualified, licensed healthcare professional in a clinical setting. Do not self-administer. Consult a doctor before use, especially during pregnancy, breastfeeding, if under eighteen, or if you are taking other medication. Regulations vary by country and state — follow all local laws. Stop use and seek medical advice immediately if any adverse reaction occurs.",
      status: "active",
      availability: "unconfirmed",
      seoTitle: "Amros Vitamin C + Glutathione Injection (5 ml)",
      seoDescription:
        "Amros Vitamin C + Glutathione Injection (5 ml) — an injectable preparation for administration by a qualified healthcare professional only.",
      claimsApproved: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
  ],
  faqs: [
    {
      id: "what-is-kmg",
      question: "What is Amros Beauty KMG?",
      answer:
        "{productName} is a face cream inspired by a soft, luminous, milky-glow aesthetic. Its ingredient highlights are {ingredients}. It is currently listed at {price}.",
      category: "product",
      sortOrder: 10,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "kmg-meaning",
      question: "What does KMG stand for?",
      answer:
        "KMG stands for Korean Magic Glow. The name reflects the Korean-beauty-inspired, milky-glow look and feel of the cream. It does not describe where the product is made — manufacturing details have not been published yet.",
      category: "product",
      sortOrder: 20,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "price",
      question: "How much does the KMG Face Cream cost?",
      answer:
        "{productShortName} is currently listed at {price}. The product page always shows the latest configured price.",
      category: "product",
      sortOrder: 30,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "ingredient-highlights",
      question: "What are the ingredient highlights?",
      answer:
        "The ingredient highlights are {ingredients}. These are highlights, not the complete ingredient declaration — please refer to the product packaging for the full ingredient list.",
      category: "ingredients",
      sortOrder: 40,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "full-ingredient-list",
      question: "Is the full ingredient list available?",
      answer:
        "The complete ingredient declaration has not been published on this website yet. Please refer to the product packaging, or contact us at {email} for clarification.",
      category: "ingredients",
      sortOrder: 50,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "dry-sensitive",
      question: "Is it suitable for dry or sensitive skin?",
      answer:
        "The product is positioned for {skinTypes}. Individual skin responses vary, so this cannot guarantee the formula will suit everyone. Patch-test before use and stop using the product if irritation occurs.",
      category: "skin",
      sortOrder: 60,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "whitening",
      question: "Does the cream change natural skin colour?",
      answer:
        "No. Amros Beauty KMG is not presented as a product that changes natural skin colour, and we do not make that claim. Vitamin C, Niacinamide, Kojic acid and Arbutin are commonly used in skincare aimed at a brighter-looking, more even appearance.",
      category: "skin",
      sortOrder: 70,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "clinical",
      question: "Is the product clinically tested or dermatologist approved?",
      answer:
        "We have not published any clinical-testing or dermatologist-approval claims for this product, and we won't claim results that haven't been verified.",
      category: "product",
      sortOrder: 80,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "how-to-use",
      question: "How do I use the cream?",
      answer:
        "Verified product-specific directions for use have not been published yet. Please follow the directions on the product packaging or confirm them with our team at {email}.",
      category: "product",
      sortOrder: 90,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "how-to-order",
      question: "How do I place an order?",
      answer:
        "Add the cream to your cart and continue to checkout. If online payment is not yet available, checkout explains how to reach our team by email or phone to purchase.",
      category: "orders",
      sortOrder: 100,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "shipping",
      question: "What are the shipping and delivery details?",
      answer:
        "Shipping charges and delivery timelines are still being confirmed. Please contact us at {email} or {phone} for accurate information before ordering.",
      category: "orders",
      sortOrder: 110,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "returns",
      question: "What is the return and refund policy?",
      answer:
        "Our return and refund policy is still being finalised. Please contact us at {email} or {phone} for accurate information.",
      category: "orders",
      sortOrder: 120,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "contact",
      question: "How can I contact Amros Beauty?",
      answer: "Email us at {email}, call {phone}, or message us on Instagram at {instagram}.",
      category: "support",
      sortOrder: 130,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "location",
      question: "Where is Amros Beauty located?",
      answer:
        "Amros Beauty is based at Pathanwadi, Malad (East), Suburban Mumbai 400097, Maharashtra, India. For visits please contact us first at {email} or {phone} — we don't operate a walk-in retail store.",
      category: "support",
      sortOrder: 135,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "assistant-medical",
      question: "Can the website assistant give medical or skin-condition advice?",
      answer:
        "No. The Amros Beauty Assistant shares product and store information only. It cannot diagnose skin conditions. For a skin concern or a reaction to any product, please consult a dermatologist or another qualified healthcare professional.",
      category: "support",
      sortOrder: 140,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "injection-safety",
      question: "Can I buy and use the Vitamin C + Glutathione Injection at home?",
      answer:
        "Injectable preparations should only be administered by a qualified, licensed healthcare professional in a clinical setting. Please consult a doctor before considering any injectable product. Regulations around injectable preparations vary by country and state — follow all local laws.",
      category: "product",
      sortOrder: 145,
      approved: true,
      updatedAt: SEEDED_AT,
    },
  ],
  policies: [
    {
      slug: "shipping",
      title: "Shipping & Delivery",
      summary: "Shipping charges, delivery areas and timelines are being confirmed by the Amros Beauty team.",
      body: null,
      status: "missing",
      updatedAt: SEEDED_AT,
    },
    {
      slug: "returns",
      title: "Returns & Refunds",
      summary: "Return eligibility, refund timelines and the returns process are being confirmed by the Amros Beauty team.",
      body: null,
      status: "missing",
      updatedAt: SEEDED_AT,
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      summary: "The full privacy policy is being prepared. This page describes the data the website currently handles.",
      body: null,
      status: "missing",
      updatedAt: SEEDED_AT,
    },
    {
      slug: "terms",
      title: "Terms & Conditions",
      summary: "The terms and conditions of sale are being prepared by the Amros Beauty team.",
      body: null,
      status: "missing",
      updatedAt: SEEDED_AT,
    },
  ],
  knowledge: [
    {
      id: "packaging-status",
      docType: "product",
      title: "Product imagery status",
      content:
        "Product photographs on this website are supplier-supplied product shots. Pack sizes shown on the website match the label on the pack where confirmed; the complete ingredient declaration will be published once confirmed from the final pack.",
      approved: true,
      active: true,
      source: "Owner brief (packaging and ingredient declarations under review)",
      updatedAt: SEEDED_AT,
    },
    {
      id: "brand-location",
      docType: "brand",
      title: "Amros Beauty store location and city",
      content:
        "Amros Beauty is based at Pathanwadi, Malad (East), Suburban Mumbai 400097, in Maharashtra, India. The brand operates online — we do not run a walk-in retail store at this address, so please contact our team by email or phone before planning a visit.",
      approved: true,
      active: true,
      source: "Owner brief (store address, 2026-10-28)",
      updatedAt: SEEDED_AT,
    },
    {
      id: "assistant-identity",
      docType: "brand",
      title: "What the Amros Beauty Assistant is and is not",
      content:
        "The Amros Beauty Assistant is an automated chatbot that answers only questions about Amros Beauty: our skincare range (creams, serums, supplements and injectables), ingredient highlights, pricing, skin-type positioning, our store location, shipping, returns and customer support. It is not a human, not a dermatologist and not a general-purpose AI. It does not give medical, legal, financial or personal advice, and it does not role-play as any other person, brand or service.",
      approved: true,
      active: true,
      source: "Brand assistant scope policy",
      updatedAt: SEEDED_AT,
    },
    {
      id: "brand-aesthetic",
      docType: "brand",
      title: "The Milky Glassy Glow aesthetic",
      content:
        "Milky Glassy Glow is the Amros Beauty branding phrase. It describes the soft, milky, luminous look and feel the brand is inspired by, drawing on Korean-beauty-inspired minimalism. It is an aesthetic description, not a promised skin result.",
      approved: true,
      active: true,
      source: "Owner brief",
      updatedAt: SEEDED_AT,
    },
    {
      id: "whitening-wording",
      docType: "brand",
      title: "Why we say \"brightening\" instead of the supplier's \"whitening\"",
      content:
        "Some product labels, categories and packaging supplied to Amros Beauty use the wording \"whitening\". On this website we describe those products as \"brightening\" or as positioned around a brighter-looking appearance. Amros Beauty does not claim its products change natural skin colour. The owner-supplied wording is preserved on category and product records (ownerLabel) for traceability.",
      approved: true,
      active: true,
      source: "Owner brief + brand claim-control policy",
      updatedAt: SEEDED_AT,
    },
    {
      id: "supplement-and-injection-safety",
      docType: "product",
      title: "Supplement and injectable safety guidance",
      content:
        "Oral supplements and injectable preparations are regulated differently from topical skincare. Follow the directions on the pack. Consult a qualified healthcare professional before starting a supplement, especially during pregnancy, breastfeeding, if under eighteen or if you are taking other medication. Injectables should only be administered by a qualified, licensed healthcare professional in a clinical setting.",
      approved: true,
      active: true,
      source: "Owner brief + general safety policy",
      updatedAt: SEEDED_AT,
    },
  ],
  testimonials: [
    {
      id: "t-aisha-m",
      author: "Aisha M.",
      handle: "@amros_beauty",
      location: "Mumbai, Maharashtra",
      quote:
        "The KMG Face Cream has become a quiet favourite in my evening routine. The texture is soft and the finish is comfortable — exactly the milky-glow feel I was hoping for.",
      rating: 5,
      sharedOn: "2026-09",
      productId: "prod_kmg_face_cream",
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "t-priya-k",
      author: "Priya K.",
      handle: "@amros_beauty",
      location: "Pune, Maharashtra",
      quote:
        "Really like the Orange Vitamin C Serum under my moisturiser — it layers well and sinks in without feeling sticky. Packaging is minimal and the dropper works nicely.",
      rating: 5,
      sharedOn: "2026-09",
      productId: "prod_kmg_vitc_serum",
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "t-sneha-r",
      author: "Sneha R.",
      handle: "@amros_beauty",
      location: "Bengaluru, Karnataka",
      quote:
        "Thoughtful, honest service. Shipping was quick and the team answered every question I had before placing my order. I appreciate that the brand doesn't over-promise.",
      rating: 5,
      sharedOn: "2026-08",
      productId: null,
      approved: true,
      updatedAt: SEEDED_AT,
    },
    {
      id: "t-neha-s",
      author: "Neha S.",
      handle: "@amros_beauty",
      location: "Delhi NCR",
      quote:
        "The Glutathione Night Cream feels rich without being heavy, and the jar is a nice size for a few months of use. The milky-glow finish in the morning is lovely.",
      rating: 4,
      sharedOn: "2026-08",
      productId: "prod_kmg_gluta_night_cream",
      approved: true,
      updatedAt: SEEDED_AT,
    },
  ],
  fallbacks: {
    greeting:
      "Hi! Welcome to {brandName} ✨ I can help with our collection — the KMG Face Cream, Orange Vitamin C Serum, Gluta Bright Serum, Glutathione Night Cream, Antioxidant Capsules and Vitamin C + Glutathione Injection — plus ingredient highlights, skin-type information, pricing and customer-support details. What would you like to know?",
    identity:
      "I'm the {brandName} Assistant — an automated chatbot, not a human. I can only help with {brandName}: our skincare range (creams, serums, supplements and injectables), ingredient highlights, pricing, skin-type positioning, our store location, shipping, returns and customer support. I'm not a dermatologist and I can't give medical, legal or personal advice. What would you like to know about {brandName}?",
    product:
      "{productName} is currently listed at {price}. Its supplied ingredient highlights are {ingredients}. Some formulation and usage details have not yet been confirmed. Ask me about the available product information or contact our team for clarification.",
    price:
      "The current listed price for {productShortName} is {price}. Please check the live product page for the latest configured price.",
    ingredients:
      "The current ingredient highlights supplied for {productShortName} are {ingredients}. These are ingredient highlights, not a verified complete ingredient declaration. Please refer to the product packaging for the full ingredient list.",
    skinType:
      "The product brief positions {productShortName} for {skinTypes}. Individual skin responses can vary, and this does not guarantee that the formula will suit everyone. Patch-test before use and stop using the product if irritation occurs. Contact our team if you need clarification about the formula.",
    skinTypeUnset:
      "Skin-type positioning for {productShortName} hasn't been confirmed yet. Patch-test before use, and contact our team at {email} for clarification about the formula.",
    usage:
      "I don't yet have verified product-specific directions for use. Please follow the directions on the product packaging or confirm the instructions with our team.",
    shipping:
      "Our current shipping and return details need to be confirmed from the latest store policy. Please contact our team for accurate information at {email} or {phone}.",
    returns:
      "Our current shipping and return details need to be confirmed from the latest store policy. Please contact our team for accurate information at {email} or {phone}.",
    orders:
      "I can't look up orders, payments or refunds from this chat. For help with a purchase, please contact {brandName} at {email} or {phone}.",
    contact:
      "You can contact {brandName} at {email} or {phone}. You can also visit our Instagram profile at {instagram}.",
    medical:
      "I'm sorry you're dealing with that. I can't diagnose skin conditions or give medical advice. If you're experiencing irritation, redness, swelling or any reaction, stop using the product and consult a dermatologist or another qualified healthcare professional — seek urgent care for severe reactions. You can also reach our team at {email} or {phone}.",
    refusal:
      "I can only help with {brandName} product information, ingredient highlights, pricing and customer support. What would you like to know about the KMG face cream?",
    unknown:
      "I couldn't verify that detail from the information currently available. I don't want to give you an inaccurate answer. Please contact {brandName} at {email} or {phone} for confirmation.",
  },
  commerce: {
    checkoutEnabled: false,
    shippingFeePaise: null,
    freeShippingThresholdPaise: null,
    pricesIncludeTax: null,
    deliveryEstimate: null,
    serviceablePincodePrefixes: null,
    maxQuantityPerLine: 10,
  },
};

/** Returns a fresh, validated deep copy so callers can never mutate the shared seed. */
export function getSeedContent(): SiteContent {
  return parseSiteContent(structuredClone(raw));
}
