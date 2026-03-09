import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "../hash.js";

describe("generateApiKey", () => {
  it("returns a raw key with the flk_ prefix", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey.startsWith("flk_")).toBe(true);
  });

  it("returns 64 hex characters after the prefix", () => {
    const { rawKey } = generateApiKey();
    const hex = rawKey.slice(4);
    expect(hex).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
  });

  it("sets keyPrefix to the first 12 characters of the raw key", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix).toBe(rawKey.slice(0, 12));
  });

  it("returns keyHash as a 64-char hex SHA-256 string", () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(keyHash)).toBe(true);
  });

  it("generates a unique key on each call", () => {
    const first = generateApiKey();
    const second = generateApiKey();
    expect(first.rawKey).not.toBe(second.rawKey);
    expect(first.keyHash).not.toBe(second.keyHash);
  });
});

describe("hashApiKey", () => {
  it("produces the same hash for the same input", () => {
    const key = "flk_testkey";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produces different hashes for different keys", () => {
    expect(hashApiKey("flk_aaa")).not.toBe(hashApiKey("flk_bbb"));
  });

  it("returns a 64-char hex string", () => {
    const hash = hashApiKey("flk_somekey");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});

describe("verifyApiKey", () => {
  it("returns true when the raw key matches the stored hash", () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(verifyApiKey(rawKey, keyHash)).toBe(true);
  });

  describe("when the key does not match", () => {
    it("returns false for a different key", () => {
      const { keyHash } = generateApiKey();
      const { rawKey: otherKey } = generateApiKey();
      expect(verifyApiKey(otherKey, keyHash)).toBe(false);
    });

    it("returns false for an empty string", () => {
      const { keyHash } = generateApiKey();
      expect(verifyApiKey("", keyHash)).toBe(false);
    });

    it("returns false for a malformed stored hash", () => {
      const { rawKey } = generateApiKey();
      expect(verifyApiKey(rawKey, "not-hex")).toBe(false);
    });
  });
});
