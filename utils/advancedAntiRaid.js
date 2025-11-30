const db = require("./database");
const logger = require("./logger");

class AdvancedAntiRaid {
  // Multiple detection algorithms working together
  static detectionAlgorithms = {
    // Algorithm 1: Rate-based detection (Wick's method)
    rateBased: (joins, timeWindow, threshold) => {
      const recentJoins = joins.filter(
        (j) => Date.now() - j.timestamp < timeWindow
      );
      return recentJoins.length >= threshold;
    },

    // Algorithm 2: Pattern-based detection (detects coordinated joins)
    patternBased: (joins) => {
      if (joins.length < 3) return false;

      // Check for similar account ages (common in raids)
      const accountAges = joins.map((j) => j.accountAge);
      const avgAge =
        accountAges.reduce((a, b) => a + b, 0) / accountAges.length;
      const variance =
        accountAges.reduce((sum, age) => sum + Math.pow(age - avgAge, 2), 0) /
        accountAges.length;

      // Low variance = similar account ages = likely raid
      if (variance < 86400000) return true; // Less than 1 day variance

      // Check for similar usernames (bot accounts often have patterns)
      const usernames = joins.map((j) => j.username.toLowerCase());
      const commonPatterns = usernames.filter(
        (name, i, arr) =>
          arr.filter((n) => n.includes(name.slice(0, 3))).length > 2
      );
      if (commonPatterns.length > 0) return true;

      return false;
    },

    // Algorithm 3: Behavioral analysis
    behavioral: (joins) => {
      // Require at least 3 joins to avoid false positives
      if (joins.length < 3) return false;

      // Check for accounts with no avatar (common in bot accounts)
      const noAvatarCount = joins.filter((j) => !j.hasAvatar).length;
      if (noAvatarCount / joins.length > 0.8) return true; // Increased threshold to 80%

      // Check for accounts with default discriminator patterns
      const defaultDiscriminators = joins.filter(
        (j) => parseInt(j.discriminator) < 1000
      ).length;
      if (defaultDiscriminators / joins.length > 0.6) return true; // Increased threshold to 60%

      return false;
    },

    // Algorithm 4: Network analysis (check for IP patterns - simplified)
    networkBased: (joins) => {
      // In a real implementation, you'd track IPs
      // For now, we use account creation patterns
      const creationTimes = joins.map((j) => j.createdTimestamp);
      const timeClusters = this.findClusters(creationTimes, 3600000); // 1 hour clusters
      if (timeClusters.length > 0 && timeClusters[0].length >= 3) return true;
      return false;
    },
  };

  static findClusters(times, window) {
    const clusters = [];
    const sorted = [...times].sort((a, b) => a - b);

    let currentCluster = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] < window) {
        currentCluster.push(sorted[i]);
      } else {
        if (currentCluster.length >= 2) clusters.push(currentCluster);
        currentCluster = [sorted[i]];
      }
    }
    if (currentCluster.length >= 2) clusters.push(currentCluster);

    return clusters;
  }

  static async detectRaid(guild, member) {
    const config = await db.getServerConfig(guild.id);
    if (!config || !config.anti_raid_enabled) return false;

    // Check whitelist first (before any detection)
    const isWhitelisted = await new Promise((resolve, reject) => {
      db.db.get(
        "SELECT * FROM security_whitelist WHERE guild_id = ? AND user_id = ?",
        [guild.id, member.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (isWhitelisted) return false; // Skip detection for whitelisted users

    // Get join history
    const joinData = await this.getJoinHistory(guild.id);
    const memberData = {
      id: member.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      accountAge: Date.now() - member.user.createdTimestamp,
      createdTimestamp: member.user.createdTimestamp,
      hasAvatar: member.user.avatar !== null,
      timestamp: Date.now(),
    };

    joinData.joins.push(memberData);

    // Run all detection algorithms
    const results = {
      rateBased: this.detectionAlgorithms.rateBased(
        joinData.joins,
        config.anti_raid_time_window || 10000,
        config.anti_raid_max_joins || 5
      ),
      patternBased: this.detectionAlgorithms.patternBased(joinData.joins),
      behavioral: this.detectionAlgorithms.behavioral(joinData.joins),
      networkBased: this.detectionAlgorithms.networkBased(joinData.joins),
    };

    // Calculate threat score (0-100)
    // Only add to threat score if we have enough joins (3+) to avoid false positives
    let threatScore = 0;
    if (joinData.joins.length >= 3) {
      if (results.rateBased) threatScore += 40;
      if (results.patternBased) threatScore += 30;
      if (results.behavioral) threatScore += 20;
      if (results.networkBased) threatScore += 10;
    } else {
      // For single or double joins, only count if it's a very obvious threat
      // (e.g., brand new account joining during a known raid pattern)
      if (memberData.accountAge < 86400000) {
        // Less than 1 day old
        threatScore += 10; // Minimal threat score for new accounts
      }
    }

    // If any algorithm triggers or threat score is high, it's a raid
    // Behavioral detection requires at least 3 joins to avoid false positives
    // Only trigger on actual raids, not single suspicious joins
    const isRaid =
      (results.rateBased && joinData.joins.length >= 3) || // Rate-based needs multiple joins
      (results.patternBased && joinData.joins.length >= 3) || // Pattern needs multiple joins
      (results.behavioral && joinData.joins.length >= 3) || // Behavioral needs at least 3 joins
      (results.networkBased && joinData.joins.length >= 3) || // Network needs multiple joins
      threatScore >= 70; // Higher threshold for single-join threats

    if (isRaid) {
      await this.handleRaid(guild, joinData.joins, threatScore, results);
      return true;
    }

    // Clean old joins (older than 1 minute)
    joinData.joins = joinData.joins.filter(
      (j) => Date.now() - j.timestamp < 60000
    );
    await this.saveJoinHistory(guild.id, joinData);

    return false;
  }

  static async getJoinHistory(guildId) {
    return new Promise((resolve, reject) => {
      db.db.get(
        "SELECT data FROM anti_raid_state WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? JSON.parse(row.data) : { joins: [] });
        }
      );
    });
  }

  static async saveJoinHistory(guildId, data) {
    return new Promise((resolve, reject) => {
      db.db.run(
        "INSERT OR REPLACE INTO anti_raid_state (guild_id, data) VALUES (?, ?)",
        [guildId, JSON.stringify(data)],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  static async handleRaid(
    guild,
    suspiciousJoins,
    threatScore,
    detectionResults
  ) {
    const config = await db.getServerConfig(guild.id);
    const action = config.anti_raid_action || "ban";

    logger.warn(
      `Raid detected in ${guild.name} (${guild.id}): Threat score ${threatScore}, ${suspiciousJoins.length} suspicious joins`
    );

    // Take action on all suspicious members
    let successCount = 0;
    for (const join of suspiciousJoins) {
      try {
        const member = await guild.members.fetch(join.id).catch(() => null);
        if (!member) continue;

        if (action === "ban") {
          await member.ban({
            reason: `Anti-raid protection (Threat: ${threatScore}%)`,
            deleteMessageDays: 1,
          });
        } else if (action === "kick") {
          await member.kick("Anti-raid protection");
        } else if (action === "quarantine") {
          // Add quarantine role if configured
          const quarantineRole = guild.roles.cache.find((r) =>
            r.name.toLowerCase().includes("quarantine")
          );
          if (quarantineRole) {
            await member.roles.add(quarantineRole);
          }
        }

        successCount++;

        // Log to database
        await db.db.run(
          "INSERT INTO anti_raid_logs (guild_id, user_id, action_taken, timestamp) VALUES (?, ?, ?, ?)",
          [guild.id, join.id, action, Date.now()]
        );
      } catch (error) {
        logger.error(`Failed to ${action} ${join.id}: ${error.message}`);
      }
    }

    // Enable lockdown
    const lockdownMap =
      require("../index.js").client?.antiRaid?.lockdown || new Map();
    lockdownMap.set(guild.id, true);

    // Send detailed alert
    const logChannel = guild.channels.cache.find(
      (ch) => ch.name.includes("log") || ch.name.includes("mod")
    );
    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            title: "🚨 Advanced Anti-Raid Protection Triggered",
            description: `**Threat Score:** ${threatScore}%\n**Suspicious Joins:** ${
              suspiciousJoins.length
            }\n**Action Taken:** ${action}\n**Successfully ${
              action === "ban"
                ? "banned"
                : action === "kick"
                ? "kicked"
                : action + "ed"
            }:** ${successCount}`,
            fields: [
              {
                name: "Detection Results",
                value: `Rate-Based: ${
                  detectionResults.rateBased ? "✅" : "❌"
                }\nPattern-Based: ${
                  detectionResults.patternBased ? "✅" : "❌"
                }\nBehavioral: ${
                  detectionResults.behavioral ? "✅" : "❌"
                }\nNetwork-Based: ${
                  detectionResults.networkBased ? "✅" : "❌"
                }`,
                inline: true,
              },
            ],
            color: 0xff0000,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }

    // Clear join history
    await this.saveJoinHistory(guild.id, { joins: [] });
  }
}

module.exports = AdvancedAntiRaid;
