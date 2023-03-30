const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed } = require("../customSend.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("[ADMIN] Send a DM to a user.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("No takebacks.")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("To whom?").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("You can set a title.")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const user = interaction.options.getUser("user");

    const message = interaction.options.getString("message");
    const title = interaction.options.getString("title");

    user
      .send({
        embeds: [
          {
            color: process.env.EMBEDCOLOR,
            title: title ? title : undefined,
            description: message,
          },
        ],
      })
      .catch(console.error);

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });
  },
};
