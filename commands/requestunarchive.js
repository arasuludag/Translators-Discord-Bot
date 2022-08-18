const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");
const { findCategoryByName } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestunarchive")
    .setDescription("Ask the admins to unarchive this channel.")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Why?").setRequired(true)
    ),
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
        path: "requestedUnArchive",
        values: {
          user: interaction.user.id,
          channel: interaction.channel.id,
          reason: reasonText,
        },
      })
    );

    const acceptButtonCustomID = "Accept " + interaction.id;
    const rejectButtonCustomID = "Reject " + interaction.id;

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
        functions.randomSend({
          path: "requestedUnArchive",
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

            const category = findCategoryByName(
              interaction,
              process.env.PROJECTSCATEGORY
            );

            interaction.channel
              .setParent(category.id, { lockPermissions: false })
              .catch((error) => {
                logsChannel.send(
                  "Error: Setting the category of channel. \n " + error
                );
              });

            await interaction.channel.send(
              functions.randomSend({
                path: "movedFromWO_User",
                values: {
                  channel: interaction.channel.id,
                },
              })
            );

            await logsChannel.send(
              functions.randomSend({
                path: "movedFromArchive",
                values: {
                  user: i.user.id,
                  channel: interaction.channel.id,
                },
              })
            );
          } else {
            await logsChannel.send(
              functions.randomSend({
                path: "notMovedFromArchive",
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
