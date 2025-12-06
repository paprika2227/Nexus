const logger = require("../utils/logger");

// Dev user ID
const DEV_USER_ID = "1392165977793368124";

module.exports = {
  name: "presenceUpdate",
  async execute(oldPresence, newPresence, client) {
    try {
      // Only track the dev user
      if (newPresence?.user?.id !== DEV_USER_ID) return;

      // Initialize dev tracking if not exists
      if (!client.devTracking) {
        client.devTracking = {
          lastSeen: null,
          currentStatus: null,
        };
      }

      // Update last seen timestamp when presence changes
      const now = Date.now();
      client.devTracking.lastSeen = now;
      client.devTracking.currentStatus = newPresence?.status || "offline";

      // Log for debugging (optional, can remove if too verbose)
      logger.debug(
        `[PresenceUpdate] Dev status updated: ${newPresence?.status || "offline"}`
      );
    } catch (error) {
      logger.error("[PresenceUpdate] Error tracking dev presence:", error);
    }
  },
};
