require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { sendEmbed, replyEmbed } = require("../customSend.js");
const { findCategoryByName, findChannelByID } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unarchive")
    .setDescription("Unarchive this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    if (interaction.channel.isThread()) {
      await sendEmbed(interaction.user, "setParentError");
      return;
    }

    const category = findCategoryByName(
      interaction,
      process.env.PROJECTSCATEGORY
    );

    interaction.channel
      .setParent(category.id, { lockPermissions: false })
      .catch((error) => {
        logsChannel.send("Error: Setting the category of channel. \n " + error);
      });

    await sendEmbed(interaction.channel, {
      path: "movedFromWO_User",
      values: {
        channel: interaction.channel.id,
      },
    });

    await sendEmbed(logsChannel, {
      path: "movedFromArchive",
      values: {
        user: interaction.user.id,
        channel: interaction.channel.id,
      },
    });

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });
  },
};
