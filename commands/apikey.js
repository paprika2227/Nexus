const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("apikey")
    .setDescription("Manage your Nexus API keys")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Generate a new API key")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name for this API key (e.g., 'My Website')")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List your API keys")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("revoke")
        .setDescription("Revoke an API key")
        .addStringOption((option) =>
          option
            .setName("key")
            .setDescription("The API key to revoke (first 16 characters)")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const name = interaction.options.getString("name");

      try {
        // Generate new API key
        const apiKey = await db.createAPIKey(interaction.user.id, name);

        const embed = new EmbedBuilder()
          .setColor("#667eea")
          .setTitle("🔑 API Key Generated")
          .setDescription(
            "Your new API key has been created. **Keep it secret!**"
          )
          .addFields(
            {
              name: "Name",
              value: name,
              inline: true,
            },
            {
              name: "API Key",
              value: `\`\`\`${apiKey}\`\`\``,
              inline: false,
            },
            {
              name: "⚠️ Important",
              value:
                "• This key will only be shown **once**\n• Store it securely\n• Don't share it publicly\n• Rate limit: 100 requests/day",
              inline: false,
            },
            {
              name: "📖 Documentation",
              value: "[View API Docs](https://azzraya.github.io/Nexus/api.html)",
              inline: false,
            }
          )
          .setFooter({ text: "Use /apikey list to see your keys" })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error("Error creating API key:", error);
        await interaction.reply({
          content: "❌ Failed to create API key. Please try again later.",
          ephemeral: true,
        });
      }
    } else if (subcommand === "list") {
      try {
        const keys = await new Promise((resolve, reject) => {
          db.db.all(
            `SELECT key, name, created_at, last_used, rate_limit, requests_today, total_requests, is_active 
             FROM api_keys 
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [interaction.user.id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });

        if (keys.length === 0) {
          return interaction.reply({
            content: "You don't have any API keys yet. Use `/apikey create` to generate one!",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor("#667eea")
          .setTitle("🔑 Your API Keys")
          .setDescription(
            `You have **${keys.length}** API key(s). [View API Docs](https://azzraya.github.io/Nexus/api.html)`
          )
          .setFooter({
            text: "Use /apikey revoke to delete a key",
          })
          .setTimestamp();

        keys.forEach((key) => {
          const status = key.is_active ? "🟢 Active" : "🔴 Revoked";
          const lastUsed = key.last_used
            ? `<t:${Math.floor(key.last_used / 1000)}:R>`
            : "Never";

          embed.addFields({
            name: `${key.name} ${status}`,
            value:
              `Key: \`${key.key.substring(0, 16)}...\`\n` +
              `Created: <t:${Math.floor(key.last_used / 1000)}:R>\n` +
              `Last Used: ${lastUsed}\n` +
              `Requests Today: ${key.requests_today}/${key.rate_limit}\n` +
              `Total Requests: ${key.total_requests}`,
            inline: false,
          });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error("Error listing API keys:", error);
        await interaction.reply({
          content: "❌ Failed to fetch API keys. Please try again later.",
          ephemeral: true,
        });
      }
    } else if (subcommand === "revoke") {
      const keyPrefix = interaction.options.getString("key");

      try {
        // Find the key
        const key = await new Promise((resolve, reject) => {
          db.db.get(
            `SELECT * FROM api_keys WHERE user_id = ? AND key LIKE ? AND is_active = 1`,
            [interaction.user.id, `${keyPrefix}%`],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!key) {
          return interaction.reply({
            content: "❌ API key not found or already revoked.",
            ephemeral: true,
          });
        }

        // Revoke it
        await new Promise((resolve, reject) => {
          db.db.run(
            `UPDATE api_keys SET is_active = 0 WHERE id = ?`,
            [key.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        const embed = new EmbedBuilder()
          .setColor("#ff4444")
          .setTitle("🔑 API Key Revoked")
          .setDescription(`API key **${key.name}** has been revoked.`)
          .addFields({
            name: "Revoked Key",
            value: `\`${key.key.substring(0, 16)}...\``,
            inline: false,
          })
          .setFooter({ text: "This key can no longer be used" })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error("Error revoking API key:", error);
        await interaction.reply({
          content: "❌ Failed to revoke API key. Please try again later.",
          ephemeral: true,
        });
      }
    }
  },
};

