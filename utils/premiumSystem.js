const db = require('./database');
const logger = require('./logger');

/**
 * Premium/Supporter Tier System
 * IMPORTANT: NO FUNCTIONAL FEATURES LOCKED - Only cosmetic perks!
 * 
 * Free users get 100% functionality
 * Supporters get cosmetic perks + recognition
 */
class PremiumSystem {
  constructor(client) {
    this.client = client;
    
    // Premium tiers (cosmetic perks only!)
    this.tiers = {
      supporter: {
        name: 'Supporter',
        perks: [
          '💙 Custom supporter badge',
          '🎨 Custom embed colors',
          '✨ Priority in leaderboards (cosmetic)',
          '📛 Custom name badge in bot responses',
          '🎭 Early access to new themes/cosmetics'
        ],
        cost: 'Any donation amount'
      },
      premium: {
        name: 'Premium Supporter',
        perks: [
          '💎 All Supporter perks',
          '🌟 Animated custom badge',
          '🎨 Custom bot response colors per server',
          '📊 Extended dashboard themes',
          '👑 Premium role badge',
          '🎁 Exclusive cosmetic bot avatars (per-server)'
        ],
        cost: '$5/month or $50/year'
      },
      elite: {
        name: 'Elite Supporter',
        perks: [
          '👑 All Premium perks',
          '🔥 Ultra-rare animated badges',
          '🎭 Custom bot username display (cosmetic)',
          '🌈 Rainbow role colors',
          '⚡ Early access to new cosmetic features (1 week early)',
          '🏆 Hall of Fame listing',
          '💬 Direct support line (priority response)',
          '🎨 Custom dashboard branding'
        ],
        cost: '$15/month or $150/year'
      }
    };
  }

  /**
   * Check if user has premium (any tier)
   */
  async isPremium(userId) {
    try {
      const result = await db.db.get(
        `SELECT tier FROM premium_users WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)`,
        [userId, Date.now()]
      );
      return result ? result.tier : null;
    } catch (error) {
      logger.error('[PremiumSystem] Error checking premium status', error);
      return null;
    }
  }

  /**
   * Check if guild has premium
   */
  async isGuildPremium(guildId) {
    try {
      const result = await db.db.get(
        `SELECT tier FROM premium_guilds WHERE guild_id = ? AND (expires_at IS NULL OR expires_at > ?)`,
        [guildId, Date.now()]
      );
      return result ? result.tier : null;
    } catch (error) {
      logger.error('[PremiumSystem] Error checking guild premium status', error);
      return null;
    }
  }

  /**
   * Grant premium to a user
   */
  async grantPremium(userId, tier, duration = null, customPerks = null) {
    try {
      const expiresAt = duration ? Date.now() + duration : null;
      const perks = customPerks || JSON.stringify(this.tiers[tier]?.perks || []);

      await db.db.run(
        `INSERT OR REPLACE INTO premium_users 
         (user_id, tier, custom_badge, custom_color, supporter_since, expires_at, perks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, tier, null, null, Date.now(), expiresAt, perks]
      );

      logger.info(`[PremiumSystem] Granted ${tier} to user ${userId}`);
      return true;
    } catch (error) {
      logger.error('[PremiumSystem] Error granting premium', error);
      return false;
    }
  }

  /**
   * Grant premium to a guild (for white-label/branding)
   */
  async grantGuildPremium(guildId, tier, duration = null, whiteLabelConfig = null) {
    try {
      const expiresAt = duration ? Date.now() + duration : null;
      const config = whiteLabelConfig || '{}';

      await db.db.run(
        `INSERT OR REPLACE INTO premium_guilds 
         (guild_id, tier, custom_branding, white_label_config, supporter_since, expires_at, perks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [guildId, tier, null, config, Date.now(), expiresAt, JSON.stringify(this.tiers[tier]?.perks || [])]
      );

      logger.info(`[PremiumSystem] Granted ${tier} to guild ${guildId}`);
      return true;
    } catch (error) {
      logger.error('[PremiumSystem] Error granting guild premium', error);
      return false;
    }
  }

  /**
   * Get user's custom cosmetic settings
   */
  async getUserCosmetics(userId) {
    try {
      const result = await db.db.get(
        `SELECT custom_badge, custom_color, tier FROM premium_users 
         WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)`,
        [userId, Date.now()]
      );
      return result || { custom_badge: null, custom_color: null, tier: null };
    } catch (error) {
      logger.error('[PremiumSystem] Error getting user cosmetics', error);
      return { custom_badge: null, custom_color: null, tier: null };
    }
  }

  /**
   * Get guild's white-label configuration
   */
  async getGuildWhiteLabel(guildId) {
    try {
      const result = await db.db.get(
        `SELECT custom_branding, white_label_config FROM premium_guilds 
         WHERE guild_id = ? AND (expires_at IS NULL OR expires_at > ?)`,
        [guildId, Date.now()]
      );
      
      if (!result) return null;
      
      return {
        customBranding: result.custom_branding ? JSON.parse(result.custom_branding) : null,
        whiteLabelConfig: result.white_label_config ? JSON.parse(result.white_label_config) : null
      };
    } catch (error) {
      logger.error('[PremiumSystem] Error getting guild white-label', error);
      return null;
    }
  }

  /**
   * Set user's custom cosmetics (badge/color)
   */
  async setUserCosmetics(userId, badge = null, color = null) {
    try {
      // Verify user is premium
      const tier = await this.isPremium(userId);
      if (!tier) {
        return { success: false, error: 'User does not have premium' };
      }

      const updates = [];
      const values = [];

      if (badge !== null) {
        updates.push('custom_badge = ?');
        values.push(badge);
      }

      if (color !== null) {
        updates.push('custom_color = ?');
        values.push(color);
      }

      if (updates.length === 0) {
        return { success: false, error: 'No cosmetics provided' };
      }

      values.push(userId);

      await db.db.run(
        `UPDATE premium_users SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );

      logger.info(`[PremiumSystem] Updated cosmetics for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('[PremiumSystem] Error setting user cosmetics', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set guild's white-label branding
   */
  async setGuildWhiteLabel(guildId, branding) {
    try {
      // Verify guild is premium
      const tier = await this.isGuildPremium(guildId);
      if (!tier) {
        return { success: false, error: 'Guild does not have premium' };
      }

      await db.db.run(
        `UPDATE premium_guilds SET custom_branding = ?, white_label_config = ? WHERE guild_id = ?`,
        [JSON.stringify(branding), JSON.stringify(branding), guildId]
      );

      logger.info(`[PremiumSystem] Updated white-label for guild ${guildId}`);
      return { success: true };
    } catch (error) {
      logger.error('[PremiumSystem] Error setting guild white-label', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get premium badge for display
   */
  getPremiumBadge(tier) {
    const badges = {
      supporter: '💙',
      premium: '💎',
      elite: '👑'
    };
    return badges[tier] || '';
  }

  /**
   * Get custom embed color for premium user
   */
  async getCustomEmbedColor(userId, guildId = null) {
    // Check user custom color first
    const userCosmetics = await this.getUserCosmetics(userId);
    if (userCosmetics.custom_color) {
      return parseInt(userCosmetics.custom_color, 16);
    }

    // Check guild custom color
    if (guildId) {
      const guildBranding = await this.getGuildWhiteLabel(guildId);
      if (guildBranding?.customBranding?.embedColor) {
        return parseInt(guildBranding.customBranding.embedColor, 16);
      }
    }

    // Default bot color
    return 0x5865f2;
  }

  /**
   * Apply white-label branding to bot name/avatar (cosmetic only)
   */
  async applyWhiteLabelCosmetics(guildId) {
    try {
      const branding = await this.getGuildWhiteLabel(guildId);
      if (!branding || !branding.whiteLabelConfig) return false;

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return false;

      // Get guild member for the bot
      const botMember = guild.members.cache.get(this.client.user.id);
      if (!botMember) return false;

      // Apply custom nickname (if set)
      if (branding.whiteLabelConfig.customName) {
        try {
          await botMember.setNickname(branding.whiteLabelConfig.customName);
          logger.info(`[PremiumSystem] Applied custom name in guild ${guildId}`);
        } catch (error) {
          logger.warn(`[PremiumSystem] Could not set nickname in ${guildId}`, error.message);
        }
      }

      return true;
    } catch (error) {
      logger.error('[PremiumSystem] Error applying white-label', error);
      return false;
    }
  }

  /**
   * Get all premium supporters for hall of fame
   */
  async getAllSupporters() {
    try {
      const users = await db.db.all(
        `SELECT user_id, tier, supporter_since FROM premium_users 
         WHERE expires_at IS NULL OR expires_at > ?
         ORDER BY supporter_since ASC`,
        [Date.now()]
      );

      return users || [];
    } catch (error) {
      logger.error('[PremiumSystem] Error getting supporters', error);
      return [];
    }
  }

  /**
   * Check if user/guild premium is expiring soon
   */
  async checkExpiringSoon() {
    try {
      const weekFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
      
      const expiring = await db.db.all(
        `SELECT user_id, tier, expires_at FROM premium_users 
         WHERE expires_at IS NOT NULL AND expires_at > ? AND expires_at < ?`,
        [Date.now(), weekFromNow]
      );

      // Notify users
      for (const user of expiring) {
        try {
          const discordUser = await this.client.users.fetch(user.user_id);
          const daysLeft = Math.ceil((user.expires_at - Date.now()) / (24 * 60 * 60 * 1000));
          
          await discordUser.send({
            content: `⏰ **Premium Expiring Soon**\n\nYour ${user.tier} tier expires in ${daysLeft} day(s)!\n\nRenew to keep your cosmetic perks: \`/premium renew\``
          });
        } catch (error) {
          logger.warn(`[PremiumSystem] Could not notify user ${user.user_id}`, error.message);
        }
      }

      return expiring.length;
    } catch (error) {
      logger.error('[PremiumSystem] Error checking expiring premium', error);
      return 0;
    }
  }
}

module.exports = PremiumSystem;
