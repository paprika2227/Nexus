const Notifications = require("../utils/notifications");
const AutoRecovery = require("../utils/autoRecovery");

module.exports = {
  name: "channelDelete",
  async execute(channel, client) {
    // Check if this was a mass deletion (potential nuke)
    const recentDeletions = await new Promise((resolve, reject) => {
      client.db.db.all(
        "SELECT COUNT(*) as count FROM enhanced_logs WHERE guild_id = ? AND action = 'channel_deleted' AND timestamp > ?",
        [channel.guild.id, Date.now() - 60000], // Last minute
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows?.[0]?.count || 0);
        }
      );
    });

    // Log the deletion
    await client.db.addEnhancedLog(
      channel.guild.id,
      "moderation",
      "system",
      null,
      null,
      "channel_deleted",
      `Channel ${channel.name} was deleted`,
      { channelId: channel.id, channelName: channel.name },
      "warning"
    );

    // If multiple deletions in short time, potential nuke
    if (recentDeletions >= 3) {
      await Notifications.send(
        channel.guild.id,
        "nuke_attempt",
        {
          details: `${recentDeletions + 1} channels deleted in the last minute`,
        },
        client
      );

      // Auto-create recovery snapshot
      try {
        await AutoRecovery.autoSnapshot(
          channel.guild,
          "Potential nuke detected"
        );
      } catch (error) {
        console.error("Failed to create recovery snapshot:", error);
      }
    } else {
      await Notifications.send(
        channel.guild.id,
        "channel_deleted",
        {
          channelName: channel.name,
          details: "A channel was deleted",
        },
        client
      );
    }
  },
};
