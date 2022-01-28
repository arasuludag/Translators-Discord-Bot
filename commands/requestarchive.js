const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const {
  logsChannelName,
  archiveCategory,
  awaitingApprovalsChannelName,
} = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestarchive")
    .setDescription("Ask the mods to archive this channel.")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Why?").setRequired(true)
    ),
  async execute(interaction) {
    reasonText = interaction.options.getString("reason");

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
          time: 30000000,
          max: 1,
        });

        collector.on("collect", async (reaction, user) => {
          if (reaction.emoji.name === "✅") {
            let category = interaction.guild.channels.cache.find(
              (c) => c.name == archiveCategory && c.type == "GUILD_CATEGORY"
            );

            if (!category) throw new Error("Category channel does not exist");
            interaction.channel.setParent(category.id, {
              lockPermissions: false,
            });

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
