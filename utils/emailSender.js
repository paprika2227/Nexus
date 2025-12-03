/**
 * Automated Email Sender
 * Sends newsletters via Proton Mail SMTP
 */

const nodemailer = require("nodemailer");
const logger = require("./logger");

class EmailSender {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter
   */
  initializeTransporter() {
    if (!process.env.SMTP_PASSWORD) {
      logger.warn("Email", "SMTP_PASSWORD not set - email sending disabled");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: "mail.protonmail.com",
      port: 587,
      secure: false, // TLS
      auth: {
        user: "nexusbot0@proton.me",
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });

    logger.success("Email", "SMTP transporter initialized");
  }

  /**
   * Send newsletter to all subscribers
   */
  async sendNewsletter(subject, htmlContent, textContent = null) {
    if (!this.transporter) {
      throw new Error("Email sender not configured. Set SMTP_PASSWORD in .env");
    }

    try {
      const newsletter = require("./newsletter");
      const subscribers = await newsletter.getSubscribers("active");

      if (subscribers.length === 0) {
        return {
          success: false,
          message: "No active subscribers",
          sent: 0,
        };
      }

      logger.info(
        "Email",
        `Sending newsletter to ${subscribers.length} subscribers...`
      );

      let successCount = 0;
      let failCount = 0;
      const errors = [];

      // Send to each subscriber
      for (const subscriber of subscribers) {
        try {
          // Generate unsubscribe link
          const unsubscribeUrl = `https://regular-puma-clearly.ngrok-free.app/api/v1/newsletter/unsubscribe?token=${
            subscriber.unsubscribe_token || "INVALID"
          }`;

          // Add unsubscribe link to HTML if not already present
          let finalHtml = htmlContent;
          if (!finalHtml.includes("UNSUBSCRIBE_TOKEN")) {
            finalHtml = htmlContent.replace(
              "</body>",
              `<div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <a href="${unsubscribeUrl}" style="color: #667eea;">Unsubscribe</a>
              </div></body>`
            );
          } else {
            finalHtml = htmlContent.replace(
              /UNSUBSCRIBE_TOKEN/g,
              subscriber.unsubscribe_token
            );
          }

          // Send email
          await this.transporter.sendMail({
            from: '"Nexus Bot" <nexusbot0@proton.me>',
            to: subscriber.email,
            subject: subject,
            text: textContent || this.stripHtml(htmlContent),
            html: finalHtml,
          });

          successCount++;

          // Mark as sent
          await newsletter.markEmailSent(subscriber.email);

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          failCount++;
          errors.push({
            email: subscriber.email,
            error: error.message,
          });
          logger.error("Email", `Failed to send to ${subscriber.email}`, error);
        }
      }

      const result = {
        success: true,
        sent: successCount,
        failed: failCount,
        total: subscribers.length,
        errors: errors.length > 0 ? errors : undefined,
      };

      logger.success(
        "Email",
        `Newsletter sent: ${successCount}/${subscribers.length} successful`
      );

      return result;
    } catch (error) {
      logger.error("Email", "Newsletter send failed", error);
      throw error;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(toEmail, subject, content) {
    if (!this.transporter) {
      throw new Error("Email sender not configured");
    }

    try {
      await this.transporter.sendMail({
        from: '"Nexus Bot" <nexusbot0@proton.me>',
        to: toEmail,
        subject: `[TEST] ${subject}`,
        html: content,
        text: this.stripHtml(content),
      });

      logger.success("Email", `Test email sent to ${toEmail}`);
      return { success: true, message: "Test email sent!" };
    } catch (error) {
      logger.error("Email", "Test email failed", error);
      throw error;
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.transporter) {
      return { connected: false, error: "Transporter not initialized" };
    }

    try {
      await this.transporter.verify();
      logger.success("Email", "SMTP connection verified");
      return { connected: true };
    } catch (error) {
      logger.error("Email", "SMTP verification failed", error);
      return { connected: false, error: error.message };
    }
  }
}

// Export singleton
module.exports = new EmailSender();
