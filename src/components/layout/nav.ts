export const primaryNav = [
  { href: "/shop", label: "Shop" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/skin-guide", label: "Skin Guide" },
  { href: "/about", label: "Our Story" },
  { href: "/faq", label: "FAQ" },
] as const;

export const footerNav = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "Shop all" },
      { href: "/shop?skin=dry", label: "For dry skin" },
      { href: "/shop?skin=sensitive", label: "For sensitive skin" },
      { href: "/cart", label: "Your bag" },
    ],
  },
  {
    title: "Discover",
    links: [
      { href: "/ingredients", label: "Ingredients" },
      { href: "/skin-guide", label: "Skin guide" },
      { href: "/about", label: "Our story" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Care",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/policies/shipping", label: "Shipping & delivery" },
      { href: "/policies/returns", label: "Returns & refunds" },
      { href: "/policies/privacy", label: "Privacy policy" },
      { href: "/policies/terms", label: "Terms & conditions" },
    ],
  },
] as const;
