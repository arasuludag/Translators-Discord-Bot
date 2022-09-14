require("dotenv").config();
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("isthere")
    .setDescription("Is there a channel named X?")
    .addStringOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel name.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const channel = interaction.options.getString("channel");

    const logsChannel = await functions.findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    const projectName = functions.discordStyleProjectName(channel);

    const foundChannel = await functions.findChannel(interaction, projectName);

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
      interaction
        .reply(
          functions.randomSend({
            path: "isThere.yes",
            values: {
              foundChannel: foundChannel.id,
            },
            components: [acceptButton, rejectButton],
            ephemeral: true,
          })
        )
        .then(() => {
          const filter = (i) =>
            interaction.id === i.customId.split(" ")[1] &&
            i.user.id === interaction.user.id;

          const collector = interaction.channel.createMessageComponentCollector(
            {
              filter,
              time: 120000,
              max: 1,
            }
          );

          collector.on("collect", async (i) => {
            i.update(
              functions.randomSend({
                path: "requestAcquired",
                ephemeral: true,
                components: [],
              })
            );

            if (i.customId === acceptButtonCustomID) {
              await foundChannel.permissionOverwrites.edit(
                interaction.user.id,
                {
                  ViewChannel: true,
                }
              );

              logsChannel.send(
                functions.randomSend({
                  path: "channelExisted",
                  values: {
                    user: interaction.user.id,
                    project: foundChannel.id,
                  },
                })
              );
            }
          });
        });
    } else {
      interaction
        .reply(
          functions.randomSend({
            path: "isThere.no",
            components: [acceptButton, rejectButton],
          })
        )
        .then(() => {
          const filter = (i) =>
            (i.customId === acceptButtonCustomID ||
              i.customId === rejectButtonCustomID) &&
            i.user.id === interaction.user.id;

          const collector = interaction.channel.createMessageComponentCollector(
            {
              filter,
              time: 120000,
              max: 1,
            }
          );

          collector.on("collect", async (i) => {
            i.update(
              functions.randomSend({
                path: "requestAcquired",
                ephemeral: true,
                components: [],
              })
            );

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
                  const category = await functions.findCategoryByName(
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

                  logsChannel.send(
                    functions.randomSend({
                      path: "channelCreated",
                      values: {
                        createdChannel: createdChannel.id,
                        user: interaction.user.id,
                      },
                    })
                  );
                })
                .catch(console.error);
          });
        });
    }
  },
};
