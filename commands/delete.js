const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");
const { findChannelByID } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("[ADMIN] Delete X messages from above.")
    .addIntegerOption((option) =>
      option
        .setName("how_many")
        .setDescription("How many messages should we delete from above?")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const howMany = interaction.options.getInteger("how_many");

    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    let isReplied = false;

    if (howMany <= 100) {
      // Bulk delete messages
      await interaction.channel
        .bulkDelete(howMany)
        .then(
          async (messages) =>
            await sendEmbed(logsChannel, {
              path: "deletedMessages",
              values: {
                user: interaction.user.id,
                channel: interaction.channel.id,
                howMany: messages.size,
              },
            })
        )
        .catch(async (error) => {
          await interaction.reply({
            content: `There is an error. Messages are too old maybe? \n \n ${error}`,
            ephemeral: true,
          });
          isReplied = true;
        });

      if (!isReplied)
        await replyEmbed(interaction, {
          path: "requestAcquired",
          ephemeral: true,
        });
    }
  },
};
