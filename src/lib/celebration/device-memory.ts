// Per-phone conveniences, kept in localStorage: the guest's own sign-ups
// (so the page can show "You're bringing…" with their change/cancel link
// even if they lose the confirmation), and their name/phone/email to
// prefill the next form. Nothing here is needed for the site to work, and
// every access is wrapped because storage can be blocked or throw.

export type RememberedSignup = {
  token: string;
  slug: string;
  itemName: string;
  amount: string;
  kind: "contribution" | "suggestion";
  createdAt: string;
};

export type RememberedContact = { name: string; phone: string; email: string };

const SIGNUPS_KEY = "celebration:signups";
const CHANGE_EVENT = "celebration:signups-changed";
const CONTACT_KEY = "celebration:contact";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage disabled — fine, it's only a convenience.
  }
  if (key === SIGNUPS_KEY) window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For useSyncExternalStore: notifies on changes from this tab or another. */
export function subscribeToSignups(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Raw stored string — a stable snapshot for useSyncExternalStore. */
export function readSignupsSnapshot(): string {
  try {
    return window.localStorage.getItem(SIGNUPS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseSignups(raw: string, slug: string): RememberedSignup[] {
  try {
    const all = raw ? (JSON.parse(raw) as RememberedSignup[]) : [];
    return Array.isArray(all) ? all.filter((s) => s && s.slug === slug && typeof s.token === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSignup(signup: RememberedSignup) {
  const all = read<RememberedSignup[]>(SIGNUPS_KEY, []);
  write(SIGNUPS_KEY, [...(Array.isArray(all) ? all : []).filter((s) => s.token !== signup.token), signup].slice(-30));
}

export function forgetSignup(token: string) {
  const all = read<RememberedSignup[]>(SIGNUPS_KEY, []);
  write(SIGNUPS_KEY, (Array.isArray(all) ? all : []).filter((s) => s.token !== token));
}

export function getRememberedContact(): RememberedContact {
  const c = read<Partial<RememberedContact>>(CONTACT_KEY, {});
  return { name: c.name ?? "", phone: c.phone ?? "", email: c.email ?? "" };
}

export function rememberContact(contact: RememberedContact) {
  write(CONTACT_KEY, contact);
}
