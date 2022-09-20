const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const functions = require("../functions.js");
const { findCategoryByName } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestarchive")
    .setDescription("Ask the admins to archive this channel.")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Why?").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const reasonText = interaction.options.getString("reason");

    await interaction.reply(
      functions.randomSend({ path: "requestAcquired", ephemeral: true })
    );

    const approvalChannel = await functions.findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );
    const logsChannel = await functions.findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    await logsChannel.send(
      functions.randomSend({
        path: "requestedArchive",
        values: {
          user: interaction.user.id,
          channel: interaction.channel.id,
          reason: reasonText,
        },
      })
    );

    const acceptButtonCustomID = "Accept " + interaction.id;
    const rejectButtonCustomID = "Reject " + interaction.id;

    const acceptButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(acceptButtonCustomID)
        .setLabel("Approve")
        .setStyle("Success")
    );
    const rejectButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(rejectButtonCustomID)
        .setLabel("Reject")
        .setStyle("Danger")
    );

    await approvalChannel
      .send(
        functions.randomSend({
          path: "requestedArchive",
          values: {
            user: interaction.user.id,
            channel: interaction.channel.id,
            reason: reasonText,
          },
          components: [acceptButton, rejectButton],
        })
      )
      .then((replyMessage) => {
        const filter = (i) => interaction.id === i.customId.split(" ")[1];

        const collector = replyMessage.channel.createMessageComponentCollector({
          filter,
          max: 1,
        });

        collector.on("collect", async (i) => {
          await i.update({
            components: [],
          });
          replyMessage.react("🍻");
          if (i.customId === acceptButtonCustomID) {
            if (interaction.channel.isThread()) {
              await i.user
                .send(functions.randomSend("setParentError"))
                .catch(() => {
                  console.error("Failed to send DM");
                });
              return;
            }

            for await (let i of Array.from(Array(100).keys())) {
              const category = findCategoryByName(
                interaction,
                `${process.env.ARCHIVECATEGORY} ${i}🗑`
              );
              if (!category) continue;

              const isOkay = await interaction.channel
                .setParent(category.id, { lockPermissions: false })
                .then(() => {
                  return true;
                })
                .catch(() => {
                  return false;
                });

              if (isOkay) break;
            }

            await interaction.channel.send(
              functions.randomSend({
                path: "movedToWO_User",
                values: {
                  channel: interaction.channel.id,
                },
              })
            );

            await logsChannel.send(
              functions.randomSend({
                path: "movedToArchive",
                values: {
                  user: i.user.id,
                  channel: interaction.channel.id,
                },
              })
            );
          } else {
            await logsChannel.send(
              functions.randomSend({
                path: "notMovedToArchive",
                values: {
                  user: i.user.id,
                  channel: interaction.channel.id,
                  requestedUser: interaction.user.id,
                },
              })
            );
          }
        });
      });
  },
};
