const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const db = require("../utils/database");
const ErrorMessages = require("../utils/errorMessages");

function sanitizeInput(input, maxLength = 2000) {
  if (!input || typeof input !== "string") return input;
  return input
    .replace(/\0/g, "")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .trim()
    .substring(0, maxLength);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoresponder")
    .setDescription("Manage auto-responders (auto-reply to keywords)")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create an auto-responder")
        .addStringOption((option) =>
          option
            .setName("trigger")
            .setDescription("Keyword or phrase to trigger response")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("response")
            .setDescription("Response message")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("case_sensitive")
            .setDescription("Case sensitive matching (default: false)")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete an auto-responder")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Auto-responder ID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all auto-responders")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Enable/disable an auto-responder")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Auto-responder ID")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const triggerRaw = interaction.options.getString("trigger");
      const responseRaw = interaction.options.getString("response");
      const caseSensitive =
        interaction.options.getBoolean("case_sensitive") || false;

      const trigger = sanitizeInput(triggerRaw, 100);
      const response = sanitizeInput(responseRaw, 2000);

      if (!trigger || trigger.length === 0) {
        return interaction.reply({
          content: "❌ Trigger cannot be empty!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!response || response.length === 0) {
        return interaction.reply({
          content: "❌ Response cannot be empty!",
          flags: MessageFlags.Ephemeral,
        });
      }

      await new Promise((resolve, reject) => {
        db.db.run(
          "INSERT INTO auto_responders (guild_id, trigger, response, case_sensitive, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            interaction.guild.id,
            trigger,
            response,
            caseSensitive ? 1 : 0,
            interaction.user.id,
            Date.now(),
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Auto-Responder Created")
        .setDescription(
          `**Trigger:** \`${trigger}\`\n**Response:** ${response.slice(
            0,
            200
          )}${response.length > 200 ? "..." : ""}\n**Case Sensitive:** ${
            caseSensitive ? "Yes" : "No"
          }`
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "delete") {
      const id = interaction.options.getInteger("id");

      const result = await new Promise((resolve, reject) => {
        db.db.run(
          "DELETE FROM auto_responders WHERE guild_id = ? AND id = ?",
          [interaction.guild.id, id],
          function (err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });

      if (result === 0) {
        return interaction.reply({
          content: "❌ Auto-responder not found!",
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.reply({
        content: `✅ Auto-responder #${id} deleted!`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === "list") {
      const responders = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT * FROM auto_responders WHERE guild_id = ? ORDER BY created_at DESC",
          [interaction.guild.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (responders.length === 0) {
        return interaction.reply({
          content: "❌ No auto-responders found!",
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("🤖 Auto-Responders")
        .setDescription(
          responders
            .map(
              (r) =>
                `**ID:** ${r.id} ${r.enabled ? "✅" : "❌"}\n` +
                `**Trigger:** \`${r.trigger}\`\n` +
                `**Response:** ${r.response.slice(0, 100)}${
                  r.response.length > 100 ? "..." : ""
                }\n` +
                `**Case Sensitive:** ${r.case_sensitive ? "Yes" : "No"}`
            )
            .join("\n\n")
        )
        .setColor(0x5865f2)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "toggle") {
      const id = interaction.options.getInteger("id");

      const responder = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT * FROM auto_responders WHERE guild_id = ? AND id = ?",
          [interaction.guild.id, id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!responder) {
        return interaction.reply({
          content: "❌ Auto-responder not found!",
          flags: MessageFlags.Ephemeral,
        });
      }

      const newStatus = responder.enabled ? 0 : 1;

      await new Promise((resolve, reject) => {
        db.db.run(
          "UPDATE auto_responders SET enabled = ? WHERE guild_id = ? AND id = ?",
          [newStatus, interaction.guild.id, id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await interaction.reply({
        content: `✅ Auto-responder #${id} ${
          newStatus ? "enabled" : "disabled"
        }!`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

function sanitizeResponse(response, messageObj) {
  if (!response || typeof response !== "string") {
    return response;
  }

  const MAX_LENGTH = 2000;
  const MAX_EXPR_LENGTH = 500;

  const sanitizeString = (str) => {
    return str
      .replace(/\0/g, "")
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
      .trim();
  };

  const validateExpression = (expr) => {
    if (!expr || typeof expr !== "string") return false;
    if (expr.length === 0 || expr.length > MAX_EXPR_LENGTH) return false;

    const normalized = expr.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) return false;

    const blockedPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
    ];

    if (blockedPatterns.some((p) => p.test(normalized))) {
      return false;
    }

    return true;
  };

  const processExpression = (expr) => {
    if (!validateExpression(expr)) {
      return null;
    }

    const normalized = expr.replace(/\s+/g, " ").trim();

    try {
      if (!messageObj || typeof messageObj !== "object") {
        return null;
      }

      const result = new Function("message", `return(${normalized});`)(
        messageObj
      );
      const stringified = String(result);
      const sanitized = sanitizeString(stringified);

      if (sanitized.length === 0 || sanitized.length > MAX_LENGTH) {
        return null;
      }

      return sanitized;
    } catch {
      return null;
    }
  };

  const templatePattern = /\$\{([^}]+)\}/g;
  let processed = response;
  const seen = new Set();
  let match;

  while ((match = templatePattern.exec(response)) !== null) {
    if (seen.has(match[0])) continue;
    seen.add(match[0]);

    const expr = match[1].trim();
    const evaluated = processExpression(expr);

    if (evaluated !== null) {
      processed = processed.replace(match[0], evaluated);
    }
  }

  processed = sanitizeString(processed);

  if (processed.length > MAX_LENGTH) {
    processed = processed.substring(0, MAX_LENGTH);
  }

  return processed;
}

module.exports.checkAutoResponder = async (message) => {
  const responders = await new Promise((resolve, reject) => {
    db.db.all(
      "SELECT * FROM auto_responders WHERE guild_id = ? AND enabled = 1",
      [message.guild.id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  for (const responder of responders) {
    const trigger = responder.trigger;
    const messageContent = responder.case_sensitive
      ? message.content
      : message.content.toLowerCase();
    const triggerLower = responder.case_sensitive
      ? trigger
      : trigger.toLowerCase();

    if (messageContent.includes(triggerLower)) {
      const sanitized = sanitizeResponse(responder.response, message);
      await message.reply(sanitized);
      return true;
    }
  }

  return false;
};
