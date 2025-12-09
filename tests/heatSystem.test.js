/**
 * Heat System Tests
 */

describe("Heat System", () => {
  let heatSystem;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      guilds: {
        cache: new Map(),
      },
    };

    const HeatSystem = require("../utils/heatSystem");
    heatSystem = new HeatSystem(mockClient);
  });

  describe("Heat Calculation", () => {
    test("should add heat for suspicious action", async () => {
      const guildId = "test_guild";
      const userId = "test_user";

      await heatSystem.addHeat(guildId, userId, "spam", 10);
      const heat = await heatSystem.getUserHeat(guildId, userId);

      expect(heat).toBeGreaterThan(0);
    });

    test("should decay heat over time", async () => {
      const guildId = "test_guild";
      const userId = "test_user_decay";

      // Add heat
      await heatSystem.addHeat(guildId, userId, "spam", 50);
      const initialHeat = await heatSystem.getUserHeat(guildId, userId);

      // Wait for decay (simulate)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const decayedHeat = await heatSystem.getUserHeat(guildId, userId);
      expect(decayedHeat).toBeLessThanOrEqual(initialHeat);
    });

    test("should handle multiple heat sources", async () => {
      const guildId = "test_guild";
      const userId = "test_user_multi";

      await heatSystem.addHeat(guildId, userId, "spam", 10);
      await heatSystem.addHeat(guildId, userId, "mentions", 5);
      await heatSystem.addHeat(guildId, userId, "caps", 3);

      const totalHeat = await heatSystem.getUserHeat(guildId, userId);
      expect(totalHeat).toBeGreaterThan(15);
    });
  });

  describe("Threat Levels", () => {
    test("should calculate correct threat level", () => {
      const lowHeat = 10;
      const mediumHeat = 50;
      const highHeat = 90;

      expect(heatSystem.getThreatLevel(lowHeat)).toBe("low");
      expect(heatSystem.getThreatLevel(mediumHeat)).toBe("medium");
      expect(heatSystem.getThreatLevel(highHeat)).toBe("high");
    });
  });
});
