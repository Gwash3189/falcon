import { describe, expect, it } from "vitest";
import { DATABASE_URL } from "../../__tests__/config.js";
import { createDb } from "../connection.js";
import { checkDatabase } from "../health.js";

describe("checkDatabase", () => {
  describe("when the database is reachable", () => {
    it("returns true", async () => {
      const db = createDb(DATABASE_URL);
      const result = await checkDatabase(db);
      expect(result).toBe(true);
    });
  });
});
