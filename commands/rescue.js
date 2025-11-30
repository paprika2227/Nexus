const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const RescueKey = require("../utils/rescueKey");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rescue")
    .setDescription("Manage rescue key for bot ownership recovery")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View your rescue key (OWNER ONLY)")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("regenerate")
        .setDescription("Regenerate rescue key (OWNER ONLY)")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("use")
        .setDescription("Use rescue key to claim ownership")
        .addStringOption((option) =>
          option
            .setName("key")
            .setDescription("Your rescue key")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "view") {
      // Only server owner can view rescue key
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
          content: "❌ Only the server owner can view the rescue key!",
          ephemeral: true,
        });
      }

      let rescueKey = await RescueKey.getKey(interaction.guild.id);

      if (!rescueKey) {
        // Generate new key if doesn't exist
        const key = await RescueKey.setKey(
          interaction.guild.id,
          interaction.user.id
        );
        rescueKey = { rescue_key: key };
      }

      const embed = new EmbedBuilder()
        .setTitle("🔑 Recovery Key")
        .setDescription(
          "If you lose control over Nexus in your server (you can't access your owner account and no one is above Nexus ownership), this rescue key will help you get Nexus ownership."
        )
        .addFields({
          name: "Rescue Key:",
          value: `\`${rescueKey.rescue_key}\``,
          inline: false,
        })
        .addFields(
          {
            name: "⚠️ IMPORTANT",
            value: [
              "• View this rescue key alone!",
              "• Anyone with this rescue key can get dangerous Nexus permissions",
              "• This rescue key is used ONLY when you lose physical owner account access",
              "• This rescue key grants you NEXUS owner permissions, not Discord ownership.",
            ].join("\n"),
            inline: false,
          }
        )
        .setColor(0xff8800)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === "regenerate") {
      // Only server owner can regenerate
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
          content: "❌ Only the server owner can regenerate the rescue key!",
          ephemeral: true,
        });
      }

      const newKey = await RescueKey.regenerateKey(
        interaction.guild.id,
        interaction.user.id
      );

      const embed = new EmbedBuilder()
        .setTitle("✅ Rescue Key Regenerated")
        .setDescription(
          "Your rescue key has been regenerated. The old key is no longer valid."
        )
        .addFields({
          name: "New Rescue Key:",
          value: `\`${newKey}\``,
          inline: false,
        })
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === "use") {
      const key = interaction.options.getString("key");

      const result = await RescueKey.useKey(
        interaction.guild.id,
        key,
        interaction.user.id
      );

      if (!result.valid) {
        return interaction.reply({
          content: `❌ ${result.message}`,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("✅ Rescue Key Used Successfully")
        .setDescription(
          "You have successfully claimed Nexus ownership using the rescue key."
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

