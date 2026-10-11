import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createOpaqueToken,
  hashToken,
  createCsrfToken,
  safeEqual,
  slugify,
} from "./security.js";

describe("credential and token helpers", () => {
  it("hashes passwords with Argon2id and verifies them", async () => {
    const encoded = await hashPassword("correct horse battery staple");
    expect(encoded).toContain("argon2id");
    await expect(
      verifyPassword(encoded, "correct horse battery staple"),
    ).resolves.toBe(true);
    await expect(verifyPassword(encoded, "incorrect password")).resolves.toBe(
      false,
    );
  });

  it("creates opaque refresh and CSRF tokens without storing the raw refresh value", () => {
    const token = createOpaqueToken();
    const csrf = createCsrfToken();
    expect(token).toHaveLength(43);
    expect(csrf).toHaveLength(43);
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).not.toBe(token);
  });

  it("compares CSRF values safely and normalizes workspace slugs", () => {
    expect(safeEqual("token", "token")).toBe(true);
    expect(safeEqual("token", "other")).toBe(false);
    expect(safeEqual("short", "longer")).toBe(false);
    expect(slugify("İstanbul Dev Tools")).toBe("istanbul-dev-tools");
  });
});
