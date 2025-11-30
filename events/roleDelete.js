const Notifications = require("../utils/notifications");
const AutoRecovery = require("../utils/autoRecovery");

module.exports = {
  name: "roleDelete",
  async execute(role, client) {
    // Check if this was a mass deletion (potential nuke)
    const recentDeletions = await new Promise((resolve, reject) => {
      client.db.db.all(
        "SELECT COUNT(*) as count FROM enhanced_logs WHERE guild_id = ? AND action = 'role_deleted' AND timestamp > ?",
        [role.guild.id, Date.now() - 60000], // Last minute
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows?.[0]?.count || 0);
        }
      );
    });

    // Log the deletion
    await client.db.addEnhancedLog(
      role.guild.id,
      "moderation",
      "system",
      null,
      null,
      "role_deleted",
      `Role ${role.name} was deleted`,
      { roleId: role.id, roleName: role.name },
      "warning"
    );

    // If multiple deletions in short time, potential nuke
    if (recentDeletions >= 3) {
      await Notifications.send(
        role.guild.id,
        "nuke_attempt",
        {
          details: `${recentDeletions + 1} roles deleted in the last minute`,
        },
        client
      );

      // Auto-create recovery snapshot
      try {
        await AutoRecovery.autoSnapshot(role.guild, "Potential nuke detected");
      } catch (error) {
        console.error("Failed to create recovery snapshot:", error);
      }
    } else {
      await Notifications.send(
        role.guild.id,
        "role_deleted",
        {
          roleName: role.name,
          details: "A role was deleted",
        },
        client
      );
    }
  },
};
