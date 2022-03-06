const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");
const {
  logsChannelID,
  archiveCategory,
  awaitingApprovalsChannelName,
} = require("../config.json");
const { findCategoryByName } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestarchive")
    .setDescription("Ask the mods to archive this channel.")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Why?").setRequired(true)
    ),
  async execute(interaction) {
    const reasonText = interaction.options.getString("reason");

    interaction.reply({
      content: functions.randomNonEmbedText("requestAcquired", {}),
      ephemeral: true,
    });

    const approvalChannel = await functions.findChannel(
      interaction,
      awaitingApprovalsChannelName
    );
    const logsChannel = await functions.findChannelByID(
      interaction,
      logsChannelID
    );

    await logsChannel.send(
      functions.randomText("requestedArchive", {
        user: interaction.user.id,
        channel: interaction.channel.id,
        reason: reasonText,
      })
    );

    const acceptButtonCustomID = "Accept" + interaction.id;
    const rejectButtonCustomID = "Reject" + interaction.id;

    const acceptButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(acceptButtonCustomID)
        .setLabel("Approve")
        .setStyle("SUCCESS")
    );
    const rejectButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(rejectButtonCustomID)
        .setLabel("Reject")
        .setStyle("DANGER")
    );

    await approvalChannel
      .send(
        functions.randomText(
          "requestedArchive",
          {
            user: interaction.user.id,
            channel: interaction.channel.id,
            reason: reasonText,
          },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          [acceptButton, rejectButton]
        )
      )
      .then((replyMessage) => {
        const filter = (i) =>
          i.customId === acceptButtonCustomID || rejectButtonCustomID;

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
                .send(functions.randomText("setParentError", {}))
                .catch(() => {
                  console.error("Failed to send DM");
                });
              return;
            }

            for await (let i of Array.from(Array(100).keys())) {
              const category = findCategoryByName(
                interaction,
                `${archiveCategory} ${i}🗑`
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
              functions.randomText("movedToWO_User", {
                channel: interaction.channel.id,
              })
            );

            await logsChannel.send(
              functions.randomText("movedToArchive", {
                user: i.user.id,
                channel: interaction.channel.id,
              })
            );
          } else {
            await logsChannel.send(
              functions.randomText("notMovedToArchive", {
                user: i.user.id,
                channel: interaction.channel.id,
                requestedUser: interaction.user.id,
              })
            );
          }
        });
      });
  },
};
