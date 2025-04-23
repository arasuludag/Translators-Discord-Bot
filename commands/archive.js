const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { sendEmbed, replyEmbed } = require("../customSend.js");
const { findCategoryByName, findChannelByID } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("archive")
    .setDescription("[ADMIN] Archive this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    if (interaction.channel.isThread()) {
      await sendEmbed(interaction.user, { path: "setParentError" });
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

    await sendEmbed(interaction.channel, {
      path: "archive.movedToWO_User",
      values: {
        channel: interaction.channel.id,
      },
    });

    await sendEmbed(logsChannel, {
      path: "archive.movedToArchive",
      values: {
        user: interaction.user.id,
        channel: interaction.channel.id,
      },
    });

    await replyEmbed(interaction, {
      path: "requestAcquired",
      ephemeral: true,
    });
  },
};
