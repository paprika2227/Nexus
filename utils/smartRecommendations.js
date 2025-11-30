const db = require("./database");

class SmartRecommendations {
  static async analyzeServer(guildId, guild) {
    const recommendations = [];
    const config = await db.getServerConfig(guildId);

    // Check anti-raid status
    if (!config?.anti_raid_enabled) {
      recommendations.push({
        type: "security",
        title: "Enable Anti-Raid Protection",
        description:
          "Your server doesn't have anti-raid protection enabled. This leaves you vulnerable to coordinated attacks.",
        priority: "high",
        action: { type: "enable", feature: "anti_raid" },
      });
    }

    // Check join gate
    if (!config?.join_gate_enabled) {
      const recentJoins = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT COUNT(*) as count FROM analytics WHERE guild_id = ? AND event_type = 'member_join' AND timestamp > ?",
          [guildId, Date.now() - 86400000],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows?.[0]?.count || 0);
          }
        );
      });

      if (recentJoins > 10) {
        recommendations.push({
          type: "security",
          title: "Enable Join Gate",
          description: `You've had ${recentJoins} new members in the last 24 hours. Consider enabling Join Gate to filter suspicious accounts.`,
          priority: "medium",
          action: { type: "enable", feature: "join_gate" },
        });
      }
    }

    // Check verification
    if (!config?.verification_enabled && guild.memberCount > 100) {
      recommendations.push({
        type: "security",
        title: "Enable Verification System",
        description:
          "With over 100 members, enabling verification helps prevent bot accounts and spam.",
        priority: "medium",
        action: { type: "enable", feature: "verification" },
      });
    }

    // Check mod log channel
    if (!config?.mod_log_channel) {
      recommendations.push({
        type: "moderation",
        title: "Set Up Moderation Logs",
        description:
          "Configure a moderation log channel to track all moderation actions.",
        priority: "high",
        action: { type: "configure", feature: "mod_log_channel" },
      });
    }

    // Check heat system
    if (!config?.heat_system_enabled) {
      recommendations.push({
        type: "moderation",
        title: "Enable Heat-Based Moderation",
        description:
          "Heat system automatically detects and punishes spam without affecting regular members.",
        priority: "medium",
        action: { type: "enable", feature: "heat_system" },
      });
    }

    // Analyze recent threats
    const recentThreats = await new Promise((resolve, reject) => {
      db.db.all(
        "SELECT COUNT(*) as count FROM security_logs WHERE guild_id = ? AND timestamp > ? AND threat_score >= 70",
        [guildId, Date.now() - 86400000],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows?.[0]?.count || 0);
        }
      );
    });

    if (recentThreats > 5) {
      recommendations.push({
        type: "security",
        title: "High Threat Activity Detected",
        description: `${recentThreats} high-threat events detected in the last 24 hours. Consider reviewing security settings.`,
        priority: "high",
        action: { type: "review", feature: "security_settings" },
      });
    }

    // Check for inactive moderation
    const recentActions = await new Promise((resolve, reject) => {
      db.db.all(
        "SELECT COUNT(*) as count FROM moderation_logs WHERE guild_id = ? AND timestamp > ?",
        [guildId, Date.now() - 604800000],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows?.[0]?.count || 0);
        }
      );
    });

    if (recentActions === 0 && guild.memberCount > 50) {
      recommendations.push({
        type: "moderation",
        title: "Consider Setting Up Auto-Moderation",
        description:
          "No moderation actions in the last week. Auto-moderation can help maintain server quality.",
        priority: "low",
        action: { type: "setup", feature: "automod" },
      });
    }

    // Save recommendations
    for (const rec of recommendations) {
      await db.createRecommendation(
        guildId,
        rec.type,
        rec.title,
        rec.description,
        rec.priority,
        rec.action
      );
    }

    return recommendations;
  }

  static async getRecommendations(guildId, unacknowledgedOnly = true) {
    return await db.getRecommendations(guildId, unacknowledgedOnly);
  }

  static async acknowledgeRecommendation(recommendationId, userId) {
    return await db.acknowledgeRecommendation(recommendationId, userId);
  }
}

module.exports = SmartRecommendations;
