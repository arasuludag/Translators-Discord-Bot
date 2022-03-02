const { SlashCommandBuilder } = require("@discordjs/builders");
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
      content: functions.randomEphemeralText("requestAcquired", {}),
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

    await approvalChannel
      .send(
        functions.randomText("requestedArchive", {
          user: interaction.user.id,
          channel: interaction.channel.id,
          reason: reasonText,
        })
      )
      .then((replyMessage) => {
        replyMessage.react("✅");
        replyMessage.react("❌");

        const filter = (reaction, user) =>
          (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") &&
          !user.bot;

        const collector = replyMessage.createReactionCollector({
          filter,
          time: 300000000,
          max: 1,
        });

        collector.on("collect", async (reaction, user) => {
          replyMessage.react("🍻");
          if (reaction.emoji.name === "✅") {
            if (interaction.channel.isThread()) {
              await user
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
                user: user.id,
                channel: interaction.channel.id,
              })
            );
          } else {
            await logsChannel.send(
              functions.randomText("notMovedToArchive", {
                user: user.id,
                channel: interaction.channel.id,
                requestedUser: interaction.user.id,
              })
            );
          }
        });
      });
  },
};
