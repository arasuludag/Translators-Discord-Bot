require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unarchive")
    .setDescription("Unarchive this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const logsChannel = await functions.findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    if (interaction.channel.isThread()) {
      await interaction.author
        .send(functions.randomSend("setParentError"))
        .catch(() => {
          console.error("Failed to send DM");
        });
      return;
    }

    const category = functions.findCategoryByName(
      interaction,
      process.env.PROJECTSCATEGORY
    );

    interaction.channel
      .setParent(category.id, { lockPermissions: false })
      .catch((error) => {
        logsChannel.send("Error: Setting the category of channel. \n " + error);
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
          user: interaction.user.id,
          channel: interaction.channel.id,
        },
      })
    );

    await interaction.reply(
      functions.randomSend({ path: "requestAcquired", ephemeral: true })
    );
  },
};
