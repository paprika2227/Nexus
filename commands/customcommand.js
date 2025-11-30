const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("customcommand")
    .setDescription("Manage custom commands")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a custom command")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Command name")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("response")
            .setDescription("Command response")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a custom command")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Command name to delete")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all custom commands")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const name = interaction.options.getString("name").toLowerCase();
      const response = interaction.options.getString("response");

      // Check if command already exists
      const existing = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT * FROM custom_commands WHERE guild_id = ? AND command_name = ?",
          [interaction.guild.id, name],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existing) {
        return interaction.reply({
          content: "❌ A command with that name already exists!",
          ephemeral: true,
        });
      }

      await new Promise((resolve, reject) => {
        db.db.run(
          "INSERT INTO custom_commands (guild_id, command_name, response, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
          [
            interaction.guild.id,
            name,
            response,
            interaction.user.id,
            Date.now(),
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await interaction.reply({
        embeds: [
          {
            title: "✅ Custom Command Created",
            description: `Command: \`${name}\`\nResponse: ${response}`,
            color: 0x00ff00,
          },
        ],
      });
    } else if (subcommand === "delete") {
      const name = interaction.options.getString("name").toLowerCase();

      await new Promise((resolve, reject) => {
        db.db.run(
          "DELETE FROM custom_commands WHERE guild_id = ? AND command_name = ?",
          [interaction.guild.id, name],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await interaction.reply({
        content: `✅ Command \`${name}\` deleted!`,
        ephemeral: true,
      });
    } else if (subcommand === "list") {
      const commands = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT command_name, response FROM custom_commands WHERE guild_id = ?",
          [interaction.guild.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (commands.length === 0) {
        return interaction.reply({
          content: "❌ No custom commands found!",
          ephemeral: true,
        });
      }

      const list = commands
        .map(
          (cmd) => `\`${cmd.command_name}\` - ${cmd.response.slice(0, 50)}...`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📋 Custom Commands")
        .setDescription(list)
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};
