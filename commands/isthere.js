require("dotenv").config();
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");
const { updateEmbed, sendEmbed, replyEmbed } = require("../customSend.js");
const {
  findChannelByID,
  discordStyleProjectName,
  findChannel,
  findCategoryByName,
} = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("isthere")
    .setDescription("[ADMIN] Is there a channel named X?")
    .addStringOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel name.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const channel = interaction.options.getString("channel");

    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    const projectName = discordStyleProjectName(channel);

    const foundChannel = await findChannel(interaction, projectName);

    const acceptButtonCustomID = "Accept " + interaction.id;
    const rejectButtonCustomID = "Reject " + interaction.id;

    const acceptButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(acceptButtonCustomID)
        .setLabel("Yes")
        .setStyle("Success")
    );
    const rejectButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(rejectButtonCustomID)
        .setLabel("No")
        .setStyle("Danger")
    );

    if (foundChannel) {
      replyEmbed(interaction, {
        path: "isThere.yes",
        values: {
          foundChannel: foundChannel.id,
        },
        components: [acceptButton, rejectButton],
        ephemeral: true,
      }).then(() => {
        const filter = (i) =>
          interaction.id === i.customId.split(" ")[1] &&
          i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 120000,
          max: 1,
        });

        collector.on("collect", async (i) => {
          updateEmbed(i, {
            path: "requestAcquired",
            ephemeral: true,
            components: [],
          });

          if (i.customId === acceptButtonCustomID) {
            await foundChannel.permissionOverwrites.edit(interaction.user.id, {
              ViewChannel: true,
            });

            sendEmbed(logsChannel, {
              path: "channelExisted",
              values: {
                user: interaction.user.id,
                project: foundChannel.id,
              },
            });
          }
        });
      });
    } else {
      replyEmbed(interaction, {
        path: "isThere.no",
        components: [acceptButton, rejectButton],
        ephemeral: true,
      }).then(() => {
        const filter = (i) =>
          (i.customId === acceptButtonCustomID ||
            i.customId === rejectButtonCustomID) &&
          i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 120000,
          max: 1,
        });

        collector.on("collect", async (i) => {
          updateEmbed(i, {
            path: "requestAcquired",
            ephemeral: true,
            components: [],
          });

          if (i.customId === acceptButtonCustomID)
            await interaction.guild.channels
              .create({
                name: projectName,
                type: 0,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                  },
                  {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                  },
                ],
              })
              .then(async (createdChannel) => {
                const category = await findCategoryByName(
                  interaction,
                  process.env.PROJECTSCATEGORY
                );
                await createdChannel
                  .setParent(category.id, { lockPermissions: false })
                  .catch((error) => {
                    logsChannel.send(
                      "Error: Setting the category of channel. \n " + error
                    );
                  });

                sendEmbed(logsChannel, {
                  path: "channelCreated",
                  values: {
                    createdChannel: createdChannel.id,
                    user: interaction.user.id,
                  },
                });
              })
              .catch(console.error);
        });
      });
    }
  },
};
