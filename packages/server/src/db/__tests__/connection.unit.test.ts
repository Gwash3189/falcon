import { describe, expect, it } from "vitest";
import { createDb } from "../connection.js";
import { checkDatabase } from "../health.js";

describe("checkDatabase", () => {
  describe("when the connection string points to an unreachable host", () => {
    it("returns false", async () => {
      const db = createDb(
        "postgresql://invalid:invalid@localhost:1/nonexistent",
      );
      const result = await checkDatabase(db);
      expect(result).toBe(false);
    });
  });
});
