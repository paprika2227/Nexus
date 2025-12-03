/**
 * Self-Hosted Newsletter System
 * Privacy-first email list management
 */

const db = require("./database");
const logger = require("./logger");
const crypto = require("crypto");

class NewsletterManager {
  constructor() {
    this.initDatabase();
  }

  /**
   * Initialize newsletter database table
   */
  initDatabase() {
    db.db.run(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        subscribed_at INTEGER NOT NULL,
        verified INTEGER DEFAULT 0,
        unsubscribe_token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'active',
        last_email_sent INTEGER
      )
    `);

    db.db.run(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email)
    `);

    db.db.run(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(unsubscribe_token)
    `);

    logger.info("Newsletter", "Newsletter database initialized");
  }

  /**
   * Generate unique unsubscribe token
   */
  generateUnsubscribeToken(email) {
    return crypto
      .createHash("sha256")
      .update(`${email}-${Date.now()}-${Math.random()}`)
      .digest("hex");
  }

  /**
   * Subscribe email to newsletter
   */
  async subscribe(email, ipAddress = null, userAgent = null) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      // Generate unsubscribe token
      const token = this.generateUnsubscribeToken(email);

      // Insert into database
      await new Promise((resolve, reject) => {
        db.db.run(
          `INSERT INTO newsletter_subscribers (email, subscribed_at, unsubscribe_token, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?)`,
          [email, Date.now(), token, ipAddress, userAgent],
          function (err) {
            if (err) {
              if (err.message.includes("UNIQUE constraint")) {
                reject(new Error("Email already subscribed"));
              } else {
                reject(err);
              }
            } else {
              resolve({ id: this.lastID });
            }
          }
        );
      });

      logger.success("Newsletter", `New subscription: ${email}`);

      return {
        success: true,
        message: "Successfully subscribed!",
        unsubscribeToken: token,
      };
    } catch (error) {
      logger.error("Newsletter", "Subscription failed", {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Unsubscribe using token
   */
  async unsubscribe(token) {
    try {
      const result = await new Promise((resolve, reject) => {
        db.db.run(
          `UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE unsubscribe_token = ?`,
          [token],
          function (err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });

      if (result === 0) {
        throw new Error("Invalid unsubscribe token");
      }

      logger.info(
        "Newsletter",
        `Unsubscribed via token: ${token.slice(0, 10)}...`
      );

      return {
        success: true,
        message: "Successfully unsubscribed. Sorry to see you go!",
      };
    } catch (error) {
      logger.error("Newsletter", "Unsubscribe failed", error);
      throw error;
    }
  }

  /**
   * Get all active subscribers
   */
  async getSubscribers(status = "active") {
    try {
      const subscribers = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT id, email, subscribed_at, verified FROM newsletter_subscribers WHERE status = ? ORDER BY subscribed_at DESC`,
          [status],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      return subscribers;
    } catch (error) {
      logger.error("Newsletter", "Failed to get subscribers", error);
      throw error;
    }
  }

  /**
   * Get subscriber count
   */
  async getCount() {
    try {
      const result = await new Promise((resolve, reject) => {
        db.db.get(
          `SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active'`,
          (err, row) => {
            if (err) reject(err);
            else resolve(row?.count || 0);
          }
        );
      });

      return result;
    } catch (error) {
      logger.error("Newsletter", "Failed to get count", error);
      return 0;
    }
  }

  /**
   * Mark email as sent
   */
  async markEmailSent(email) {
    try {
      await new Promise((resolve, reject) => {
        db.db.run(
          `UPDATE newsletter_subscribers SET last_email_sent = ? WHERE email = ?`,
          [Date.now(), email],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      logger.info("Newsletter", `Email sent recorded: ${email}`);
    } catch (error) {
      logger.error("Newsletter", "Failed to mark email sent", error);
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const stats = await new Promise((resolve, reject) => {
        db.db.get(
          `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed,
            SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified
           FROM newsletter_subscribers`,
          (err, row) => {
            if (err) reject(err);
            else resolve(row || {});
          }
        );
      });

      return stats;
    } catch (error) {
      logger.error("Newsletter", "Failed to get stats", error);
      return { total: 0, active: 0, unsubscribed: 0, verified: 0 };
    }
  }

  /**
   * Export subscriber list (for manual emailing)
   */
  async exportSubscribers() {
    try {
      const subscribers = await this.getSubscribers("active");

      // Format as CSV
      const csv = [
        "Email,Subscribed At,Verified",
        ...subscribers.map(
          (sub) =>
            `${sub.email},${new Date(sub.subscribed_at).toISOString()},${
              sub.verified ? "Yes" : "No"
            }`
        ),
      ].join("\n");

      logger.info("Newsletter", `Exported ${subscribers.length} subscribers`);

      return csv;
    } catch (error) {
      logger.error("Newsletter", "Export failed", error);
      throw error;
    }
  }
}

// Export singleton
module.exports = new NewsletterManager();
