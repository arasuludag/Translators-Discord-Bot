const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed } = require("../customSend.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("channelinfo")
    .setDescription("What is this channel used for?")
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    await replyEmbed(interaction, {
      path: "channelInfo",
      values: {
        channel: interaction.channel.name,
        purpose: interaction.channel.topic ? interaction.channel.topic : "No description available",
        access: interaction.channel.permissionsFor(interaction.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) ? "Public" : "Restricted"
      },
      ephemeral: true
    });
  },
};
