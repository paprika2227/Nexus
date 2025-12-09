/**
 * Database Tests
 */

describe("Database System", () => {
  let db;

  beforeAll(async () => {
    // Initialize test database
    db = require("../utils/database");
  });

  describe("Configuration Management", () => {
    test("should set and get server config", async () => {
      const testGuildId = "test_guild_123";
      const testKey = "antiraid_enabled";
      const testValue = true;

      await db.setServerConfig(testGuildId, testKey, testValue);
      const config = await db.getServerConfig(testGuildId);

      expect(config).toBeTruthy();
      expect(config[testKey]).toBe(testValue);
    });

    test("should handle invalid config keys", async () => {
      const testGuildId = "test_guild_456";
      const invalidKey = "invalid_key_xyz";

      await expect(
        db.setServerConfig(testGuildId, invalidKey, "value")
      ).rejects.toThrow();
    });
  });

  describe("User Trust Scores", () => {
    test("should initialize trust score for new user", async () => {
      const guildId = "test_guild";
      const userId = "test_user_123";

      const score = await db.getUserTrustScore(guildId, userId);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test("should update trust score", async () => {
      const guildId = "test_guild";
      const userId = "test_user_456";

      await db.updateUserTrustScore(guildId, userId, -10, "spam");
      const score = await db.getUserTrustScore(guildId, userId);

      expect(score).toBeLessThan(100);
    });
  });

  describe("Cache System", () => {
    test("should cache query results", async () => {
      const query = "SELECT * FROM server_config WHERE guild_id = ?";
      const params = ["test_guild"];

      // First call - no cache
      const result1 = await db.cachedQuery(query, params, 1000);

      // Second call - should hit cache
      const result2 = await db.cachedQuery(query, params, 1000);

      expect(result1).toEqual(result2);
    });

    test("should clear cache", () => {
      db.clearCache();
      const stats = db.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });
});
