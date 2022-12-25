require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed } = require("../customSend.js");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announcement")
    .setDescription("Make announcement to the announcement channel.")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Enter an announcement.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const text = interaction.options.getString("text");

    await functions
      .findChannel(interaction, process.env.ANNOUNCEMENTSCHANNELNAME)
      .send({
        embeds: [
          {
            color: process.env.EMBEDCOLOR,
            title: "Announcement",
            description: text,
          },
        ],
      });

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });
  },
};
