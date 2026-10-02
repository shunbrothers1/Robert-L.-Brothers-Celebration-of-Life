// Shared settings for the end-to-end scripts. See "Testing" in the README.
import fs from "node:fs";
import { chromium } from "playwright";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const OUT = new URL("./screenshots/", import.meta.url).pathname;
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@family.test";
export const OUTSIDER_EMAIL = process.env.E2E_OUTSIDER_EMAIL ?? "cousin@family.test";
export const PASSWORD = process.env.E2E_PASSWORD ?? "Passw0rd!family";
fs.mkdirSync(OUT, { recursive: true });

/** Reads NEXT_PUBLIC_SUPABASE_* from the environment or .env.local. */
export function supabasePublicEnv() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if ((!url || !anon) && fs.existsSync(".env.local")) {
    for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k === "NEXT_PUBLIC_SUPABASE_URL") url ??= rest.join("=").trim();
      if (k === "NEXT_PUBLIC_SUPABASE_ANON_KEY") anon ??= rest.join("=").trim();
    }
  }
  return { url, anon };
}

export function launch() {
  // PLAYWRIGHT_CHROMIUM_PATH lets you use an already-installed Chromium.
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  return chromium.launch({ executablePath });
}

export function reporter() {
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  };
  const finish = () => {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    process.exitCode = failed.length ? 1 : 0;
  };
  return { check, finish };
}
