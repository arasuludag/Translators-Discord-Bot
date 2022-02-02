const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const {
  logsChannelName,
  projectsCategory,
  awaitingApprovalsChannelName,
} = require("../config.json");
const { findCategoryByName } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestunarchive")
    .setDescription("Ask the mods to unarchive this channel.")
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
    const logsChannel = await functions.findChannel(
      interaction,
      logsChannelName
    );

    await logsChannel.send(
      functions.randomText("requestedUnArchive", {
        user: interaction.user.id,
        channel: interaction.channel.id,
        reason: reasonText,
      })
    );

    await approvalChannel
      .send(
        functions.randomText("requestedUnArchive", {
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
            const category = findCategoryByName(interaction, projectsCategory);
            interaction.channel.setParent(category.id, {
              lockPermissions: false,
            });

            await interaction.channel.send(
              functions.randomText("movedFromWO_User", {
                channel: interaction.channel.id,
              })
            );

            await logsChannel.send(
              functions.randomText("movedFromArchive", {
                user: user.id,
                channel: interaction.channel.id,
              })
            );
          } else {
            await logsChannel.send(
              functions.randomText("notMovedFromArchive", {
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
