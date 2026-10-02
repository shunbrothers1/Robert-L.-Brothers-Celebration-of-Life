// Monetary gift options shown on /celebration/[slug]/give. Pure helpers so
// they're shared by the admin form and the public page, and unit-tested.
// The site never handles money: these just build links to the family's
// own Cash App / Venmo / PayPal / GoFundMe pages, or show Zelle details.

export type GivingType = "cashapp" | "zelle" | "venmo" | "paypal" | "gofundme" | "link";

export type GivingMethod = {
  type: GivingType;
  /** $cashtag, Zelle email/phone, @venmo, PayPal.me name, or a URL. */
  value: string;
  /** Optional account name to show, e.g. "Brothers Family". */
  label?: string;
};

export type GivingInfo = {
  enabled: boolean;
  title: string | null;
  message: string | null;
  methods: GivingMethod[];
};

export const GIVING_TYPES: { type: GivingType; name: string; placeholder: string; hint: string }[] = [
  { type: "cashapp", name: "Cash App", placeholder: "$YourCashtag", hint: "Your $cashtag" },
  { type: "zelle", name: "Zelle", placeholder: "email or phone number", hint: "The email or phone number your Zelle uses" },
  { type: "venmo", name: "Venmo", placeholder: "@your-username", hint: "Your Venmo @username" },
  { type: "paypal", name: "PayPal", placeholder: "paypal.me name", hint: "Your PayPal.me name (the part after paypal.me/)" },
  { type: "gofundme", name: "GoFundMe", placeholder: "https://gofund.me/…", hint: "The full GoFundMe link" },
  { type: "link", name: "Other link", placeholder: "https://…", hint: "Any other giving page, e.g. a church or charity" },
];

export const DEFAULT_GIVING_TITLE = "Monetary Gifts";
export const DEFAULT_GIVING_MESSAGE =
  "For those who have asked about giving in other ways, the family is gratefully accepting monetary gifts to help with the repast and related expenses. Any amount is deeply appreciated.";

export function givingTypeName(type: GivingType): string {
  return GIVING_TYPES.find((t) => t.type === type)?.name ?? "Gift";
}

/** Only allow plain web links — never javascript: or other schemes. */
export function safeHttpUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const handle = (v: string, prefix: RegExp) => v.trim().replace(prefix, "").replace(/[^A-Za-z0-9._-]/g, "");

/** What to show for a method, e.g. "$BrothersFamily" or "@brothers-family". */
export function givingDisplay(m: GivingMethod): string {
  switch (m.type) {
    case "cashapp":
      return `$${handle(m.value, /^\$+/)}`;
    case "venmo":
      return `@${handle(m.value, /^@+/)}`;
    case "paypal":
      return `paypal.me/${handle(m.value.replace(/^https?:\/\/(www\.)?paypal\.me\//i, ""), /^@+/)}`;
    default:
      return m.value.trim();
  }
}

/** Where the method's button goes, or null when it's copy-only (Zelle) or invalid. */
export function givingHref(m: GivingMethod): string | null {
  switch (m.type) {
    case "cashapp": {
      const h = handle(m.value, /^\$+/);
      return h ? `https://cash.app/$${h}` : null;
    }
    case "venmo": {
      const h = handle(m.value, /^@+/);
      return h ? `https://venmo.com/u/${h}` : null;
    }
    case "paypal": {
      const h = handle(m.value.replace(/^https?:\/\/(www\.)?paypal\.me\//i, ""), /^@+/);
      return h ? `https://paypal.me/${h}` : null;
    }
    case "zelle":
      return null;
    default:
      return safeHttpUrl(m.value);
  }
}

/** Cleans up whatever the admin typed, dropping empty or unknown rows. */
export function normalizeGivingMethods(raw: unknown): GivingMethod[] {
  if (!Array.isArray(raw)) return [];
  const types = new Set(GIVING_TYPES.map((t) => t.type));
  return raw
    .filter((m): m is GivingMethod => !!m && typeof m === "object" && types.has((m as GivingMethod).type))
    .map((m) => ({
      type: m.type,
      value: String(m.value ?? "").trim().slice(0, 200),
      label: m.label ? String(m.label).trim().slice(0, 80) : undefined,
    }))
    .filter((m) => m.value.length > 0)
    .slice(0, 8);
}

/** True when the gift option should be offered to guests. */
export function givingIsAvailable(g: GivingInfo | null | undefined): g is GivingInfo {
  return Boolean(g && g.enabled && g.methods.length > 0);
}
