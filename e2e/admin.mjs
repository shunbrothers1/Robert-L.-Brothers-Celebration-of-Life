import { devices } from "playwright";
import { ADMIN_EMAIL, BASE, OUT, OUTSIDER_EMAIL, PASSWORD, launch, reporter } from "./common.mjs";

const { check, finish } = reporter();
const browser = await launch();

async function login(ctx, email) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`);
  check(`unauthenticated /admin redirects to login (${email})`, page.url().includes("/admin/login"));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"));
  return page;
}

// --- Non-admin account: signed in but not approved ---
const cousinCtx = await browser.newContext();
const cousin = await login(cousinCtx, OUTSIDER_EMAIL);
await cousin.waitForLoadState("networkidle");
check("non-admin sees 'Not approved yet'", await cousin.getByText("Not approved yet").isVisible());
check("non-admin sees no event data", !(await cousin.content()).includes("James Robert Brown"));
const sampleEventIdRes = await cousin.request.get(`${BASE}/admin/events/00000000-0000-0000-0000-000000000000/export`);
check("non-admin CSV export is 401", sampleEventIdRes.status() === 401, String(sampleEventIdRes.status()));
await cousin.screenshot({ path: `${OUT}20-not-approved.png` });

// Anonymous export request -> redirected to login by middleware
const anonCtx = await browser.newContext();
const anonRes = await anonCtx.request.get(`${BASE}/admin/events/00000000-0000-0000-0000-000000000000/export`, { maxRedirects: 0 });
check("anonymous CSV export redirects to login", anonRes.status() === 307 && (anonRes.headers()["location"] ?? "").includes("/admin/login"));
// Open-redirect guard on login ?next=
const evilCtx = await browser.newContext();
const evil = await evilCtx.newPage();
await evil.goto(`${BASE}/admin/login?next=https://evil.example.com`);
await evil.getByLabel("Email").fill(ADMIN_EMAIL);
await evil.getByLabel("Password").fill(PASSWORD);
await evil.getByRole("button", { name: "Sign in" }).click();
await evil.waitForURL((u) => !u.pathname.endsWith("/login"));
check("login ignores off-site ?next= redirect", new URL(evil.url()).host === "localhost:3000", evil.url());

// --- Real admin ---
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await login(ctx, ADMIN_EMAIL);
await page.getByRole("link", { name: /James Robert Brown/ }).click();
await page.waitForURL(/\/admin\/events\/[0-9a-f-]{36}$/);
const eventUrl = page.url();
await page.screenshot({ path: `${OUT}21-admin-overview.png`, fullPage: true });
const overview = await page.innerText("body");
check("overview shows Repast Preparation %", /\d+% Covered/.test(overview));
for (const label of ["Total Items Needed", "Contributions Claimed", "Items Still Needed", "Items Fully Covered", "Pending Suggestions", "Total Contributors"]) {
  check(`overview stat: ${label}`, overview.toUpperCase().includes(label.toUpperCase()));
}

// Suggestions: approve Deviled Eggs
await page.goto(`${eventUrl}/suggestions`);
check("pending suggestion visible with phone", (await page.innerText("body")).includes("555-777-8888"));
await page.getByRole("button", { name: "APPROVE" }).click();
await page.getByText("Pending (0)").waitFor();
check("suggestion approved", /approved/i.test(await page.innerText("body")));

// Contributors: contact info visible, approved suggestion is a confirmed contribution
await page.goto(`${eventUrl}/contributors`);
const contributorsText = await page.innerText("body");
check("contributors list shows phone (admin only)", contributorsText.includes("555-123-4567"));
check("approved suggestion became a contribution", contributorsText.includes("Deviled Eggs") && contributorsText.includes("Aunt May Johnson"));
await page.screenshot({ path: `${OUT}22-admin-contributors.png`, fullPage: true });

// Mark one received, then move a contribution to a full item -> friendly error
const tashaRow = page.locator("li", { hasText: "Tasha Brown" }).filter({ hasText: "Ham" });
await tashaRow.getByRole("button", { name: "✓ Received" }).click();
await page.waitForTimeout(800);
check("mark received", (await tashaRow.innerText()).toLowerCase().includes("received"));

const marcusRow = page.locator("li", { hasText: "Marcus Hill" });
await marcusRow.getByRole("button", { name: "Edit / Move" }).click();
await page.getByLabel(/^Item/).selectOption({ label: "Ham — covered" });
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.locator("form [role=alert]").waitFor();
check("admin move onto full item is refused", /covered|last one/i.test(await page.locator("form [role=alert]").innerText()));
await page.getByLabel(/^Item/).selectOption({ label: "Collard Greens — 2 open" });
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.waitForTimeout(1000);
check("admin move to open item works", (await page.locator("li", { hasText: "Marcus Hill" }).innerText()).includes("Collard Greens"));

// Food list management: add item, priority, hide, lower-below-claimed error
await page.goto(`${eventUrl}/menu`);
await page.getByRole("button", { name: "+ Add item" }).click();
await page.getByLabel("Item", { exact: true }).fill("Sweet Potato Pie");
await page.getByLabel("Category").selectOption({ label: "Desserts" });
await page.getByLabel("Quantity needed").fill("3");
await page.getByLabel("Unit (plural)").fill("pies");
await page.getByLabel(/Priority/).check();
await page.getByRole("button", { name: "Save item" }).click();
await page.waitForTimeout(1000);
check("new item added", (await page.innerText("body")).includes("Sweet Potato Pie"));
const greens = page.locator("li", { hasText: "Collard Greens" }).first();
await greens.getByRole("button", { name: "Edit" }).click();
await page.getByLabel("Quantity needed").fill("0");
await page.getByRole("button", { name: "Save item" }).click();
await page.locator("form [role=alert]").waitFor();
check("can't lower quantity below claimed", /already signed up/i.test(await page.locator("form [role=alert]").innerText()));
await page.getByRole("button", { name: "Cancel" }).click();
const fish = page.locator("li", { hasText: "Fish" }).first();
await fish.getByRole("button", { name: "Hide" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}23-admin-menu.png`, fullPage: false });

// Settings: toggle names on, memorial on, upload photo, save
await page.goto(`${eventUrl}/settings`);
await page.getByRole("switch").nth(2).check(); // show contributor names
await page.getByRole("switch").nth(4).check(); // memorial section
await page.getByLabel("Favorite saying or quote").fill("Leave every place a little better than you found it.");
// Generate a test photo and upload it.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mN8+P9/PQMDAwMjjAEGAH5qB/+O6QnLAAAAAElFTkSuQmCC",
  "base64"
);
await page.locator("#photo-photo").setInputFiles({ name: "grandpa.png", mimeType: "image/png", buffer: png });
await page.getByRole("button", { name: "Replace photo" }).waitFor({ timeout: 15000 });
await page.getByRole("button", { name: "Save changes" }).click();
await page.getByText("Saved ✓").waitFor();
check("settings saved with uploaded photo", true);

const pubPage = await ctx.newPage();
await pubPage.goto(`${BASE}/celebration/sample`);
const pubText = await pubPage.innerText("body");
check("public shows 'Claimed by Tasha B.' when enabled", pubText.includes("Claimed by Tasha B."));
check("public still hides phone numbers", !pubText.includes("555-"));
check("memorial section shown", pubText.includes("Celebrating James Robert Brown"));
check("hidden item not on public page", !(await pubPage.getByRole("heading", { name: "Fish", exact: true }).count()));
check("new priority item in Most Needed", pubText.includes("Sweet Potato Pie"));
const imgOk = await pubPage.locator("header img").evaluate((img) => img.complete && img.naturalWidth > 0);
check("uploaded photo loads from storage", imgOk);
await pubPage.screenshot({ path: `${OUT}24-public-after-admin.png`, fullPage: true });

// Print + CSV
await page.goto(`${eventUrl}/print`);
const printText = await page.innerText("body");
check("print checklist has MAIN DISHES-style sections", printText.includes("MAIN DISHES") || printText.includes("Main Dishes"));
check("print includes phones", printText.includes("555-123-4567"));
check("print shows still-needed lines", printText.includes("still needed"));
await page.emulateMedia({ media: "print" });
await page.screenshot({ path: `${OUT}25-print.png`, fullPage: true });
await page.emulateMedia({ media: "screen" });
const csv = await page.request.get(`${eventUrl}/export`);
const csvText = await csv.text();
check("CSV download works", csv.status() === 200 && csvText.includes("Tasha Brown") && csvText.includes("Phone"));

// Admins page: add cousin as admin, then cousin gets access
await page.goto(`${BASE}/admin/admins`);
await page.getByLabel("Approve another admin by email").fill("nobody-" + Date.now() + "@example.test");
await page.getByRole("button", { name: "Approve admin" }).click();
await page.getByText(/No account exists/).waitFor();
check("approving unknown email gives a clear message", true);
await page.getByLabel("Approve another admin by email").fill(OUTSIDER_EMAIL);
await page.getByRole("button", { name: "Approve admin" }).click();
await page.waitForTimeout(1000);
await cousin.reload();
check("approved cousin now has access", (await cousin.innerText("body")).includes("James Robert Brown"));
const cousinRow = page.locator("li", { hasText: OUTSIDER_EMAIL });
await cousinRow.waitFor();
page.once("dialog", (d) => d.accept());
await cousinRow.getByRole("button", { name: "Remove" }).click();
await page.waitForTimeout(1000);
await cousin.reload();
check("removed cousin loses access", (await cousin.innerText("body")).includes("Not approved yet"));

// Deadline: set to the past -> public sign-ups closed, admin can still edit
await page.goto(`${eventUrl}/settings`);
await page.getByLabel("Sign-up deadline").fill("2020-01-01");
await page.getByRole("button", { name: "Save changes" }).click();
await page.getByText("Saved ✓").waitFor();
await pubPage.reload();
check("after deadline public shows closed", (await pubPage.innerText("body")).includes("Sign-ups have closed"));
check("after deadline sign-up buttons disabled", (await pubPage.getByRole("button", { name: "SIGN UP TO BRING THIS" }).count()) === 0);
await page.getByLabel("Sign-up deadline").fill("");
await page.getByRole("button", { name: "Save changes" }).click();
await page.getByText("Saved ✓").waitFor();

await browser.close();
finish();
