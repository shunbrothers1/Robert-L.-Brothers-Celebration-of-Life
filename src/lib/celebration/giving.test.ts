import { describe, expect, it } from "vitest";
import { givingDisplay, givingHref, givingIsAvailable, normalizeGivingMethods, safeHttpUrl } from "./giving";

describe("giving links", () => {
  it("builds Cash App, Venmo and PayPal links from handles however they're typed", () => {
    expect(givingHref({ type: "cashapp", value: "$BrothersFamily" })).toBe("https://cash.app/$BrothersFamily");
    expect(givingHref({ type: "cashapp", value: "BrothersFamily" })).toBe("https://cash.app/$BrothersFamily");
    expect(givingDisplay({ type: "cashapp", value: "BrothersFamily" })).toBe("$BrothersFamily");
    expect(givingHref({ type: "venmo", value: "@brothers-family" })).toBe("https://venmo.com/u/brothers-family");
    expect(givingDisplay({ type: "venmo", value: "brothers-family" })).toBe("@brothers-family");
    expect(givingHref({ type: "paypal", value: "https://paypal.me/BrothersFam" })).toBe("https://paypal.me/BrothersFam");
    expect(givingHref({ type: "paypal", value: "BrothersFam" })).toBe("https://paypal.me/BrothersFam");
  });

  it("treats Zelle as copy-only and shows the details as typed", () => {
    expect(givingHref({ type: "zelle", value: "family@example.com" })).toBeNull();
    expect(givingDisplay({ type: "zelle", value: " 555-123-4567 " })).toBe("555-123-4567");
  });

  it("only allows web links for GoFundMe and other links", () => {
    expect(givingHref({ type: "gofundme", value: "gofund.me/abc123" })).toBe("https://gofund.me/abc123");
    expect(givingHref({ type: "link", value: "javascript:alert(1)" })).toBeNull();
    expect(safeHttpUrl("data:text/html,hi")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });

  it("strips characters that could break out of a handle", () => {
    expect(givingHref({ type: "cashapp", value: "$abc/../evil?x=1" })).toBe("https://cash.app/$abc..evilx1");
  });

  it("normalizes stored methods and decides availability", () => {
    const methods = normalizeGivingMethods([
      { type: "cashapp", value: " $Fam " },
      { type: "zelle", value: "" },
      { type: "bitcoin", value: "x" },
      null,
    ]);
    expect(methods).toEqual([{ type: "cashapp", value: "$Fam", label: undefined }]);
    expect(normalizeGivingMethods("nope")).toEqual([]);
    expect(givingIsAvailable({ enabled: true, title: null, message: null, methods })).toBe(true);
    expect(givingIsAvailable({ enabled: false, title: null, message: null, methods })).toBe(false);
    expect(givingIsAvailable({ enabled: true, title: null, message: null, methods: [] })).toBe(false);
  });
});
