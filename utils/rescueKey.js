const crypto = require("crypto");
const db = require("./database");

class RescueKey {
  /**
   * Generate a rescue key for a guild
   */
  static generateKey() {
    return crypto.randomBytes(20).toString("hex").toUpperCase();
  }

  /**
   * Get rescue key for a guild
   */
  static async getKey(guildId) {
    return new Promise((resolve, reject) => {
      db.db.get(
        "SELECT * FROM rescue_keys WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Set rescue key for a guild
   */
  static async setKey(guildId, ownerId, key = null) {
    const rescueKey = key || this.generateKey();
    const createdAt = Date.now();

    return new Promise((resolve, reject) => {
      db.db.run(
        `INSERT OR REPLACE INTO rescue_keys (guild_id, owner_id, rescue_key, created_at) 
         VALUES (?, ?, ?, ?)`,
        [guildId, ownerId, rescueKey, createdAt],
        (err) => {
          if (err) reject(err);
          else resolve(rescueKey);
        }
      );
    });
  }

  /**
   * Regenerate rescue key
   */
  static async regenerateKey(guildId, ownerId) {
    return this.setKey(guildId, ownerId);
  }

  /**
   * Verify and use rescue key to transfer ownership
   */
  static async useKey(guildId, key, newOwnerId) {
    return new Promise((resolve, reject) => {
      db.db.get(
        "SELECT * FROM rescue_keys WHERE guild_id = ? AND rescue_key = ?",
        [guildId, key.toUpperCase()],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve({ valid: false, message: "Invalid rescue key" });
            return;
          }

          // Update ownership
          await new Promise((resolve2, reject2) => {
            db.db.run(
              "UPDATE rescue_keys SET owner_id = ?, used_at = ? WHERE guild_id = ?",
              [newOwnerId, Date.now(), guildId],
              (err2) => {
                if (err2) reject2(err2);
                else resolve2();
              }
            );
          });

          // Log the rescue key usage
          await new Promise((resolve2, reject2) => {
            db.db.run(
              "INSERT INTO rescue_key_logs (guild_id, old_owner_id, new_owner_id, used_at) VALUES (?, ?, ?, ?)",
              [guildId, row.owner_id, newOwnerId, Date.now()],
              (err2) => {
                if (err2) reject2(err2);
                else resolve2();
              }
            );
          });

          resolve({ valid: true, message: "Rescue key used successfully" });
        }
      );
    });
  }

  /**
   * Get QR code data for rescue key (returns data URL for QR code)
   */
  static getQRCodeData(key) {
    // In a real implementation, you'd use a QR code library
    // For now, return the key as a string that can be encoded
    return `NEXUS_RESCUE:${key}`;
  }
}

module.exports = RescueKey;
