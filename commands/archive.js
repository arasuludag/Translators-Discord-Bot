require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("archive")
    .setDescription("Archive this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const logsChannel = await functions.findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    if (interaction.channel.isThread()) {
      await interaction.author
        .send(functions.randomSend({ path: "setParentError" }))
        .catch(() => {
          console.error("Failed to send DM");
        });
      return;
    }

    for await (let i of Array.from(Array(100).keys())) {
      const category = functions.findCategoryByName(
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
