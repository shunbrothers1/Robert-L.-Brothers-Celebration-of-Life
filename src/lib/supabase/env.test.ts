import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./env";

describe("normalizeSupabaseUrl", () => {
  it("leaves a correct project URL alone", () => {
    expect(normalizeSupabaseUrl("https://abcd.supabase.co")).toBe("https://abcd.supabase.co");
  });
  it("strips the REST endpoint suffix, trailing slashes and whitespace", () => {
    expect(normalizeSupabaseUrl(" https://abcd.supabase.co/rest/v1/ ")).toBe("https://abcd.supabase.co");
    expect(normalizeSupabaseUrl("https://abcd.supabase.co/rest/v1")).toBe("https://abcd.supabase.co");
    expect(normalizeSupabaseUrl("https://abcd.supabase.co/auth/v1/")).toBe("https://abcd.supabase.co");
    expect(normalizeSupabaseUrl("https://abcd.supabase.co/")).toBe("https://abcd.supabase.co");
  });
});
