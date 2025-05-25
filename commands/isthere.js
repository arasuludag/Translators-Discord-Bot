const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { sendEmbed } = require("../customSend.js");
const {
  findChannelByID,
  findCategoryByName,
} = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("isthere")
    .setDescription("[ADMIN] Search for channels by keyword and join them")
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("Search for channels containing this keyword")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const searchQuery = interaction.options.getString("keyword").toLowerCase();
    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    // Get the project category
    const projectsCategory = await findCategoryByName(
      interaction,
      process.env.PROJECTSCATEGORY
    );

    // Find all archive categories by partial match
    const archiveCategories = interaction.guild.channels.cache.filter(
      channel => channel.type === 4 && channel.name.toLowerCase().includes(process.env.ARCHIVECATEGORY.toLowerCase())
    );

    // Get channels from project category
    const projectChannels = projectsCategory?.children.cache.filter(
      channel => channel.type === 0
    ) || [];

    // Get channels from all archive categories
    const archiveChannels = archiveCategories.reduce((channels, category) => {
      const categoryChannels = category.children.cache.filter(
        channel => channel.type === 0
      );
      return [...channels, ...categoryChannels.values()];
    }, []);

    // Combine and filter channels
    const allChannels = [...projectChannels.values(), ...archiveChannels];
    const matchingChannels = allChannels.filter(channel => 
      channel.name.toLowerCase().includes(searchQuery)
    );

    // If no exact matches, look for similar channels
    if (matchingChannels.length === 0) {
      const similarChannels = [];
      
      allChannels.forEach(channel => {
        const channelName = channel.name.toLowerCase();
        const searchTerms = searchQuery.split(/\s+/);
        const channelTerms = channelName.split(/\s+/);
        
        for (const term of searchTerms) {
          if (term.length > 2 && channelName.includes(term)) {
            similarChannels.push(channel);
            break;
          }
        }
        
        if (!similarChannels.includes(channel)) {
          for (const term of channelTerms) {
            if (term.length > 2 && searchQuery.includes(term)) {
              similarChannels.push(channel);
              break;
            }
          }
        }
      });

      if (similarChannels.length > 0) {
        // Show similar channels suggestions
        const embed = new EmbedBuilder()
          .setTitle(`🔍 No exact matches for "${searchQuery}"`)
          .setColor(parseInt(process.env.EMBEDCOLOR))
          .setDescription("Did you mean one of these channels?");

        const suggestions = similarChannels.slice(0, 25);
        suggestions.forEach(channel => {
          const category = channel.parent.name;
          embed.addFields({
            name: `📂 "${channel.name}"`,
            value: `📍 Category: ${category}\n➡️ View: <#${channel.id}>`
          });
        });

        if (similarChannels.length > 25) {
          embed.setFooter({ text: `Showing 25 of ${similarChannels.length} similar channels` });
        }

        // Create select menu for channel selection
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_${interaction.id}`)
          .setPlaceholder("Select a channel to join")
          .addOptions(
            suggestions.map(channel => ({
              label: channel.name,
              description: `Category: ${channel.parent.name}`,
              value: channel.id
            }))
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
        });

        const filter = (i) =>
          i.customId === `select_${interaction.id}` && i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 120000,
          max: 1,
        });

        collector.on("collect", async (i) => {
          const selectedChannel = suggestions.find(
            (channel) => channel.id === i.values[0]
          );

          if (selectedChannel) {
            await selectedChannel.permissionOverwrites.edit(interaction.user.id, {
              ViewChannel: true,
            });

            const successEmbed = new EmbedBuilder()
              .setTitle("✅ Access Granted")
              .setColor(parseInt(process.env.EMBEDCOLOR))
              .setDescription(`You now have access to <#${selectedChannel.id}>`);

            await i.update({
              embeds: [successEmbed],
              components: [],
            });

            sendEmbed(logsChannel, {
              path: "channelExisted",
              values: {
                user: interaction.user.id,
                project: selectedChannel.id,
              },
            });
          }
        });

        return;
      }

      // No similar channels found
      const embed = new EmbedBuilder()
        .setTitle(`🔍 No channels found for "${searchQuery}"`)
        .setColor(parseInt(process.env.EMBEDCOLOR))
        .setDescription("Try searching with different keywords or check the spelling.");

      return await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // Handle multiple matches
    if (matchingChannels.length > 1) {
      // Calculate how many pages we'll need
      const totalPages = Math.ceil(matchingChannels.length / 25);
      
      // Send first page as reply
      const firstPageEmbed = new EmbedBuilder()
        .setTitle(`🔍 Found ${matchingChannels.length} matching channels`)
        .setColor(parseInt(process.env.EMBEDCOLOR))
        .setDescription("Page 1");

      // Add first 25 channels
      for (let i = 0; i < Math.min(25, matchingChannels.length); i++) {
        const channel = matchingChannels[i];
        firstPageEmbed.addFields({
          name: `📂 "${channel.name}"`,
          value: `📍 Category: ${channel.parent.name}\n➡️ View: <#${channel.id}>`
        });
      }

      // Create select menu for first page
      const firstPageSelect = new StringSelectMenuBuilder()
        .setCustomId(`select_${interaction.id}_0`)
        .setPlaceholder("Click to join a channel from page 1")
        .addOptions(
          matchingChannels.slice(0, 25).map(channel => ({
            label: channel.name,
            description: `Join channel in ${channel.parent.name}`,
            value: channel.id
          }))
        );

      const firstPageRow = new ActionRowBuilder().addComponents(firstPageSelect);

      // Send first page
      await interaction.reply({
        embeds: [firstPageEmbed],
        components: [firstPageRow],
        ephemeral: true,
      });

      // Send remaining pages as follow-ups
      for (let page = 1; page < totalPages; page++) {
        const startIdx = page * 25;
        const endIdx = Math.min(startIdx + 25, matchingChannels.length);
        
        const pageEmbed = new EmbedBuilder()
          .setTitle(`🔍 Found ${matchingChannels.length} matching channels`)
          .setColor(parseInt(process.env.EMBEDCOLOR))
          .setDescription(`Page ${page + 1}`);

        // Add channels for this page
        for (let i = startIdx; i < endIdx; i++) {
          const channel = matchingChannels[i];
          pageEmbed.addFields({
            name: `📂 "${channel.name}"`,
            value: `📍 Category: ${channel.parent.name}\n➡️ View: <#${channel.id}>`
          });
        }

        // Create select menu for this page
        const pageSelect = new StringSelectMenuBuilder()
          .setCustomId(`select_${interaction.id}_${page}`)
          .setPlaceholder(`Click to join a channel from page ${page + 1}`)
          .addOptions(
            matchingChannels.slice(startIdx, endIdx).map(channel => ({
              label: channel.name,
              description: `Join channel in ${channel.parent.name}`,
              value: channel.id
            }))
          );

        const pageRow = new ActionRowBuilder().addComponents(pageSelect);

        // Send this page
        await interaction.followUp({
          embeds: [pageEmbed],
          components: [pageRow],
          ephemeral: true
        });
      }

      const filter = (i) =>
        i.customId.startsWith(`select_${interaction.id}_`) && i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 120000,
        max: 1,
      });

      collector.on("collect", async (i) => {
        const selectedChannel = matchingChannels.find(
          (channel) => channel.id === i.values[0]
        );

        if (selectedChannel) {
          await selectedChannel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
          });

          const successEmbed = new EmbedBuilder()
            .setTitle("✅ Channel Access Granted")
            .setColor(parseInt(process.env.EMBEDCOLOR))
            .setDescription(`You have been granted access to <#${selectedChannel.id}>\nYou can now view and interact with this channel.`);

          await i.update({
            embeds: [successEmbed],
            components: [],
          });

          sendEmbed(logsChannel, {
            path: "channelExisted",
            values: {
              user: interaction.user.id,
              project: selectedChannel.id,
            },
          });
        }
      });
    } else {
      // Single match
      const foundChannel = matchingChannels[0];
      const buttonId = `Select_${foundChannel.id}_${interaction.id}`;

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Found channel "${foundChannel.name}"`)
        .setColor(parseInt(process.env.EMBEDCOLOR))
        .setDescription("Would you like to join this channel?")
        .addFields({
          name: `📂 "${foundChannel.name}"`,
          value: `📍 Category: ${foundChannel.parent.name}\n➡️ View: <#${foundChannel.id}>`
        });

      const joinButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(buttonId)
          .setLabel(`Join ${foundChannel.name}`)
          .setStyle("Success")
      );

      await interaction.reply({
        embeds: [embed],
        components: [joinButton],
        ephemeral: true,
      });

      const filter = (i) =>
        i.customId.endsWith(interaction.id) && i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 120000,
        max: 1,
      });

      collector.on("collect", async (i) => {
        await foundChannel.permissionOverwrites.edit(interaction.user.id, {
          ViewChannel: true,
        });

        const successEmbed = new EmbedBuilder()
          .setTitle("✅ Access Granted")
          .setColor(parseInt(process.env.EMBEDCOLOR))
          .setDescription(`You now have access to <#${foundChannel.id}>`);

        await i.update({
          embeds: [successEmbed],
          components: [],
        });

        sendEmbed(logsChannel, {
          path: "channelExisted",
          values: {
            user: interaction.user.id,
            project: foundChannel.id,
          },
        });
      });
    }
  },
};
