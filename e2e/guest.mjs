import { devices } from "playwright";
import { BASE, OUT, launch, reporter, supabasePublicEnv } from "./common.mjs";

const { check, finish } = reporter();

const browser = await launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));
const badResponses = [];
page.on("response", (r) => r.status() >= 400 && badResponses.push(`${r.status()} ${r.url()}`));

// 1. Landing page
const t0 = Date.now();
await page.goto(`${BASE}/celebration/sample`);
await page.screenshot({ path: `${OUT}01-landing.png`, fullPage: false });
check("header shows name", await page.getByRole("heading", { level: 1, name: "James Robert Brown" }).isVisible());
check("life dates", await page.getByText("1938 – 2026").isVisible());
check("welcome message", await page.getByText(/overwhelming love and support/).isVisible());
check("note under button", await page.getByText("Please select an item that is still needed").isVisible());
const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check("no horizontal scroll on phone", noHScroll);

// 1b. Both ways to help are on the first screen; gifts page works.
const giftsOn = (await page.getByRole("link", { name: "MAKE A MONETARY GIFT" }).count()) > 0;
if (giftsOn) {
  const vh = page.viewportSize().height;
  const foodBtn = await page.getByRole("link", { name: "VIEW FOOD & SUPPLY LIST" }).boundingBox();
  const giftBtn = await page.getByRole("link", { name: "MAKE A MONETARY GIFT" }).first().boundingBox();
  check("food-list button on first screen", foodBtn.y + foodBtn.height <= vh, `${Math.round(foodBtn.y + foodBtn.height)} <= ${vh}`);
  check("monetary gift button on first screen", giftBtn.y + giftBtn.height <= vh, `${Math.round(giftBtn.y + giftBtn.height)} <= ${vh}`);
  check("gift card at bottom of food list", await page.getByRole("heading", { name: "Another Way to Help" }).isVisible());
  await page.getByRole("link", { name: "MAKE A MONETARY GIFT" }).first().click();
  await page.waitForURL(/\/give$/);
  check("gifts page title", await page.getByRole("heading", { name: "Monetary Gifts" }).isVisible());
  check("Cash App opens the family's cashtag", (await page.getByRole("link", { name: "Open Cash App" }).getAttribute("href")) === "https://cash.app/$BrothersFamily");
  check("Zelle shows a copy button", await page.getByRole("button", { name: "Copy Zelle info" }).isVisible());
  await page.screenshot({ path: `${OUT}01b-gifts.png`, fullPage: true });
  await page.getByRole("link", { name: "RETURN TO FOOD LIST" }).click();
  await page.waitForURL(/\/celebration\/sample/);
} else {
  console.log("(monetary gifts not enabled — skipping gift checks)");
}

// 2. View list
await page.getByRole("link", { name: "VIEW FOOD & SUPPLY LIST" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}02-list.png` });
check("filter chips present", await page.getByRole("button", { name: "SIDES", exact: true }).isVisible());
check("most needed group", await page.getByRole("heading", { name: /Most Needed/ }).isVisible());

// 3. Sign up for Macaroni & Cheese (3 large trays)
const mac = page.locator("article", { has: page.getByRole("heading", { name: "Macaroni & Cheese" }) });
check("mac card shows 3 needed", (await mac.innerText()).includes("3 large trays needed"));
await mac.getByRole("button", { name: "SIGN UP TO BRING THIS" }).click();
await page.getByLabel(/Your Name/).fill("Tasha Brown");
await page.getByLabel(/Phone Number/).fill("555-123-4567");
await page.screenshot({ path: `${OUT}03-signup-form.png` });
// Submit without checkbox -> friendly error
await page.getByRole("button", { name: "CONFIRM MY CONTRIBUTION" }).click();
check("requires acknowledgment", await page.getByText("Please check the box").isVisible());
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "CONFIRM MY CONTRIBUTION" }).click();
await page.getByText("Thank You ❤️").waitFor();
const elapsed = (Date.now() - t0) / 1000;
await page.screenshot({ path: `${OUT}04-thank-you.png` });
check("thank-you message", await page.getByText("Thank you for helping our family celebrate the life of James Robert Brown").isVisible());
check("you signed up to bring", await page.getByRole("dialog").getByText("Macaroni & Cheese — 1 large tray").isVisible());
const manageUrl = await page.locator("p.font-mono").innerText();
check("manage link shown", /\/contribution\/[A-Za-z0-9_-]{30,}/.test(manageUrl), manageUrl);
check(`automated sign-up end to end took ${elapsed.toFixed(1)}s`, elapsed < 60);
await page.getByRole("button", { name: "RETURN TO FOOD LIST" }).click();
await page.waitForTimeout(800);
check("progress updated to 1 of 3", (await mac.innerText()).includes("1 of 3 claimed"));
check("remembered on this phone", await page.getByText("Your sign-ups from this phone").isVisible());

// 4. Final slot via UI: Ham (1 whole ham)
const ham = page.locator("article", { has: page.getByRole("heading", { name: "Ham", exact: true }) });
await ham.getByRole("button", { name: "SIGN UP TO BRING THIS" }).click();
check("name prefilled from last time", (await page.getByLabel(/Your Name/).inputValue()) === "Tasha Brown");
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "CONFIRM MY CONTRIBUTION" }).click();
await page.getByText("Thank You ❤️").waitFor();
await page.getByRole("button", { name: "RETURN TO FOOD LIST" }).click();
await page.waitForTimeout(800);
const hamText = await ham.innerText();
check("final slot -> COVERED", hamText.includes("COVERED — THANK YOU!"), hamText.replace(/\n/g, " | "));
check("covered item has no sign-up button", (await ham.getByRole("button").count()) === 0);
await ham.screenshot({ path: `${OUT}05-covered-card.png` });

// 5. Race in the UI: open form for Yellow Rice (1 needed), someone else claims first via API
const rice = page.locator("article", { has: page.getByRole("heading", { name: "Yellow Rice" }) });
await rice.getByRole("button", { name: "SIGN UP TO BRING THIS" }).click();
// Look up Yellow Rice's id through the public (anon) RPC, as a guest would.
const env = supabasePublicEnv();
const rpc = async (fn, body) =>
  (
    await fetch(`${env.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: env.anon, Authorization: `Bearer ${env.anon}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  ).json();
const ev = await rpc("get_public_event", { p_slug: "sample" });
const riceId = ev.items.find((i) => i.name === "Yellow Rice").id;
const other = await fetch(`${BASE}/api/celebration/claim`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ itemId: riceId, name: "Marcus Hill", quantity: 1, acknowledged: true }),
});
check("other guest claims rice first", other.status === 201);
await page.getByLabel(/Your Name/).fill("Late Larry");
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "CONFIRM MY CONTRIBUTION" }).click();
const alertBox = page.locator("form [role=alert]");
await alertBox.waitFor();
const alertText = await alertBox.innerText();
check("loser of race sees friendly message", /covered|last one/i.test(alertText), alertText);
await page.screenshot({ path: `${OUT}06-race-lost.png` });
await page.getByRole("button", { name: "Close" }).click();

// 6. Filters & still-needed toggle
await page.getByRole("button", { name: "SIDES", exact: true }).click();
await page.getByRole("button", { name: /STILL NEEDED/ }).click();
await page.waitForTimeout(300);
const sideHeadings = await page.locator("#food-list h3").allInnerTexts();
check("SIDES filter shows only Side Dishes", sideHeadings.includes("Side Dishes") && !sideHeadings.some((h) => /Main|Dessert/.test(h)), sideHeadings.join(","));
check("still-needed hides covered rice", (await page.getByRole("heading", { name: "Yellow Rice" }).count()) === 0);
await page.screenshot({ path: `${OUT}07-filtered.png` });
await page.getByRole("button", { name: "ALL", exact: true }).click();
await page.getByRole("button", { name: /STILL NEEDED/ }).click();

// 7. Manage link: change quantity then cancel
await page.goto(manageUrl);
check("manage page shows item", await page.getByText("Macaroni & Cheese").first().isVisible());
await page.getByRole("button", { name: "More" }).click();
await page.getByRole("button", { name: "SAVE CHANGES" }).click();
await page.getByText("Your changes have been saved").waitFor();
check("quantity changed to 2", await page.getByText("2 large trays").first().isVisible());
await page.screenshot({ path: `${OUT}08-manage.png` });
let pubNow = await rpc("get_public_event", { p_slug: "sample" });
check("public count = 2 after change", pubNow.items.find((i) => i.name === "Macaroni & Cheese").quantity_claimed === 2);
await page.getByRole("button", { name: "CANCEL MY SIGN-UP" }).click();
await page.getByRole("button", { name: "Yes, cancel" }).click();
await page.getByText("Your sign-up has been cancelled").waitFor();
pubNow = await rpc("get_public_event", { p_slug: "sample" });
check("cancel returns quantity to the list", pubNow.items.find((i) => i.name === "Macaroni & Cheese").quantity_claimed === 0);

// 8. Suggest an item
await page.goto(`${BASE}/celebration/sample#food-list`);
await page.getByRole("button", { name: "SUGGEST AN ITEM" }).click();
await page.getByLabel(/^Name/).fill("Aunt May Johnson");
await page.getByLabel(/^Phone/).fill("555-777-8888");
await page.getByLabel(/^Item/).fill("Deviled Eggs");
await page.getByLabel(/^Quantity/).fill("3 dozen");
await page.getByRole("button", { name: "SEND SUGGESTION" }).click();
await page.getByText("Pending Family Approval").waitFor();
check("suggestion is pending approval", true);
await page.screenshot({ path: `${OUT}09-suggested.png` });
await page.getByRole("button", { name: "RETURN TO FOOD LIST" }).click();
pubNow = await rpc("get_public_event", { p_slug: "sample" });
check("suggestion not on public list yet", !pubNow.items.some((i) => i.name === "Deviled Eggs"));

// 9. Privacy: public HTML + API never contain contact details
const html = await (await fetch(`${BASE}/celebration/sample`)).text();
check("public HTML has no phone numbers", !html.includes("555-123-4567") && !html.includes("555-777-8888"));
check("public RPC has no contributor names by default", !JSON.stringify(pubNow).includes("Tasha"));

// Full-page mobile screenshot
await page.goto(`${BASE}/celebration/sample`);
await page.screenshot({ path: `${OUT}10-full-mobile.png`, fullPage: true });
// The one expected failed request is the race loser's 409 from /api/celebration/claim.
const unexpected = badResponses.filter((r) => !r.startsWith("409 ") || !r.includes("/api/celebration/claim"));
check("no unexpected failed requests", unexpected.length === 0, unexpected.join(" | "));
check("no JS errors", consoleErrors.filter((e) => !e.startsWith("Failed to load resource")).length === 0, consoleErrors.join(" | "));

await browser.close();
finish();
