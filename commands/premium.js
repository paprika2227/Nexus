const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Support Nexus and get cosmetic perks!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('View premium tier information')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check your premium status')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('customize')
        .setDescription('Customize your premium badge and colors')
        .addStringOption(option =>
          option
            .setName('badge')
            .setDescription('Custom badge emoji')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Custom embed color (hex code, e.g., FF5733)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('branding')
        .setDescription('Configure white-label branding for this server')
        .addStringOption(option =>
          option
            .setName('bot_name')
            .setDescription('Custom bot name for this server')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('embed_color')
            .setDescription('Custom embed color (hex code)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('supporters')
        .setDescription('View Hall of Fame - Our amazing supporters!')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const premiumSystem = interaction.client.premiumSystem;

    if (!premiumSystem) {
      return interaction.reply({
        content: '❌ Premium system is not initialized.',
        ephemeral: true
      });
    }

    try {
      switch (subcommand) {
        case 'info':
          return await this.showInfo(interaction, premiumSystem);
        case 'status':
          return await this.showStatus(interaction, premiumSystem);
        case 'customize':
          return await this.customize(interaction, premiumSystem);
        case 'branding':
          return await this.branding(interaction, premiumSystem);
        case 'supporters':
          return await this.showSupporters(interaction, premiumSystem);
      }
    } catch (error) {
      console.error('[Premium Command Error]', error);
      return interaction.reply({
        content: '❌ An error occurred. Please try again.',
        ephemeral: true
      });
    }
  },

  async showInfo(interaction, premiumSystem) {
    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Supporter Tiers')
      .setDescription('**IMPORTANT:** All bot features are 100% FREE! Premium is purely for cosmetic perks and supporting development.\n\n✨ Every feature, command, and protection is available to everyone ✨')
      .setColor(0x5865f2)
      .setTimestamp();

    // Add each tier
    for (const [tierId, tier] of Object.entries(premiumSystem.tiers)) {
      embed.addFields({
        name: `${premiumSystem.getPremiumBadge(tierId)} ${tier.name}`,
        value: `**Cost:** ${tier.cost}\n**Perks:**\n${tier.perks.map(p => `• ${p}`).join('\n')}`,
        inline: false
      });
    }

    embed.addFields({
      name: '❓ How to Get Premium',
      value: 'Premium is coming soon! Stay tuned for the official launch.\n\nFor now, focus on using all our FREE features! 🎉',
      inline: false
    });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showStatus(interaction, premiumSystem) {
    const userId = interaction.user.id;
    const tier = await premiumSystem.isPremium(userId);
    const cosmetics = await premiumSystem.getUserCosmetics(userId);

    if (!tier) {
      return interaction.reply({
        content: '💙 You are not currently a premium supporter.\n\nUse `/premium info` to learn more about cosmetic perks!',
        ephemeral: true
      });
    }

    const badge = premiumSystem.getPremiumBadge(tier);
    const tierInfo = premiumSystem.tiers[tier];

    const embed = new EmbedBuilder()
      .setTitle(`${badge} Your Premium Status`)
      .setDescription(`**Tier:** ${tierInfo.name}\n**Badge:** ${cosmetics.custom_badge || badge}\n**Custom Color:** ${cosmetics.custom_color || 'Default'}`)
      .setColor(cosmetics.custom_color ? parseInt(cosmetics.custom_color, 16) : 0x5865f2)
      .addFields({
        name: 'Your Perks',
        value: tierInfo.perks.map(p => `✅ ${p}`).join('\n'),
        inline: false
      })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async customize(interaction, premiumSystem) {
    const badge = interaction.options.getString('badge');
    const color = interaction.options.getString('color');

    if (!badge && !color) {
      return interaction.reply({
        content: '❌ Please provide at least one customization option!',
        ephemeral: true
      });
    }

    // Validate color if provided
    if (color && !/^[0-9A-Fa-f]{6}$/.test(color)) {
      return interaction.reply({
        content: '❌ Invalid color format! Use hex format like `FF5733`',
        ephemeral: true
      });
    }

    const result = await premiumSystem.setUserCosmetics(
      interaction.user.id,
      badge,
      color
    );

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.error}`,
        ephemeral: true
      });
    }

    return interaction.reply({
      content: '✅ Your cosmetic settings have been updated!',
      ephemeral: true
    });
  },

  async branding(interaction, premiumSystem) {
    // Check if user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ You need Administrator permission to configure server branding.',
        ephemeral: true
      });
    }

    const botName = interaction.options.getString('bot_name');
    const embedColor = interaction.options.getString('embed_color');

    if (!botName && !embedColor) {
      return interaction.reply({
        content: '❌ Please provide at least one branding option!',
        ephemeral: true
      });
    }

    // Validate color if provided
    if (embedColor && !/^[0-9A-Fa-f]{6}$/.test(embedColor)) {
      return interaction.reply({
        content: '❌ Invalid color format! Use hex format like `5865F2`',
        ephemeral: true
      });
    }

    const branding = {
      customName: botName || null,
      embedColor: embedColor || null
    };

    const result = await premiumSystem.setGuildWhiteLabel(
      interaction.guild.id,
      branding
    );

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.error}\n\nNote: Server branding requires Premium tier or higher!`,
        ephemeral: true
      });
    }

    // Apply branding
    await premiumSystem.applyWhiteLabelCosmetics(interaction.guild.id);

    return interaction.reply({
      content: '✅ Server branding has been updated!',
      ephemeral: true
    });
  },

  async showSupporters(interaction, premiumSystem) {
    const supporters = await premiumSystem.getAllSupporters();

    if (supporters.length === 0) {
      return interaction.reply({
        content: '🏆 Hall of Fame is empty! Be the first supporter!',
        ephemeral: true
      });
    }

    const tiers = { elite: [], premium: [], supporter: [] };
    
    for (const supporter of supporters) {
      try {
        const user = await interaction.client.users.fetch(supporter.user_id);
        const badge = premiumSystem.getPremiumBadge(supporter.tier);
        const since = new Date(supporter.supporter_since).toLocaleDateString();
        tiers[supporter.tier].push(`${badge} ${user.username} (since ${since})`);
      } catch (err) {
        // Skip users we can't fetch
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Hall of Fame - Our Amazing Supporters!')
      .setDescription('Thank you to everyone who supports Nexus Bot! 💙')
      .setColor(0xffd700);

    if (tiers.elite.length > 0) {
      embed.addFields({
        name: '👑 Elite Supporters',
        value: tiers.elite.slice(0, 10).join('\n'),
        inline: false
      });
    }

    if (tiers.premium.length > 0) {
      embed.addFields({
        name: '💎 Premium Supporters',
        value: tiers.premium.slice(0, 10).join('\n'),
        inline: false
      });
    }

    if (tiers.supporter.length > 0) {
      embed.addFields({
        name: '💙 Supporters',
        value: tiers.supporter.slice(0, 10).join('\n'),
        inline: false
      });
    }

    embed.setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
