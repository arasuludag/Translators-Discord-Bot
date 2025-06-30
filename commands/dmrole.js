const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { findChannelByID } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dmrole")
    .setDescription("[ADMIN/PM] Send a direct message to all members of a specific role.")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role whose members will receive the DM")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to send")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("Optional title for the message")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    const role = interaction.options.getRole("role");
    const message = interaction.options.getString("message");
    const title = interaction.options.getString("title");

    // Get all members with the specified role
    const members = role.members;
    let successCount = 0;
    let failCount = 0;
    const successfulRecipients = [];
    const failedRecipients = [];

    // Send DM to each member
    for (const [, member] of members) {
      try {
        await member.send({
          embeds: [
            {
              color: process.env.EMBEDCOLOR,
              title: title ? title : undefined,
              description: message,
            },
          ],
        });
        successCount++;
        successfulRecipients.push(`<@${member.user.id}>`);
      } catch (error) {
        console.error(`Failed to send DM to ${member.user.tag}:`, error);
        failCount++;
        failedRecipients.push(`<@${member.user.id}>`);
      }
    }

    // Create reply embed
    const replyEmbed = new EmbedBuilder()
      .setColor(parseInt(process.env.EMBEDCOLOR))
      .setTitle("DM Role Results")
      .setDescription(`Message sent to members of role: ${role.name}`)
      .addFields(
        { name: "Success Count", value: successCount.toString(), inline: true },
        { name: "Fail Count", value: failCount.toString(), inline: true }
      );

    if (successfulRecipients.length > 0) {
      replyEmbed.addFields({
        name: "Successful Recipients",
        value: successfulRecipients.join("\n").slice(0, 1024) || "None",
      });
    }

    if (failedRecipients.length > 0) {
      replyEmbed.addFields({
        name: "Failed Recipients",
        value: failedRecipients.join("\n").slice(0, 1024) || "None",
      });
    }

    // Create log embed
    const logEmbed = new EmbedBuilder()
      .setColor(parseInt(process.env.EMBEDCOLOR))
      .setTitle("Role DM Sent")
      .setDescription(`Message sent to role: ${role.name}`)
      .addFields(
        { name: "Sent By", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Success Count", value: successCount.toString(), inline: true },
        { name: "Fail Count", value: failCount.toString(), inline: true }
      );

    if (title) {
      logEmbed.addFields({ name: "Title", value: title });
    }
    
    logEmbed.addFields({ name: "Message", value: message });

    if (successfulRecipients.length > 0) {
      logEmbed.addFields({
        name: "Successful Recipients",
        value: successfulRecipients.join("\n").slice(0, 1024) || "None",
      });
    }

    if (failedRecipients.length > 0) {
      logEmbed.addFields({
        name: "Failed Recipients",
        value: failedRecipients.join("\n").slice(0, 1024) || "None",
      });
    }

    // Send logs
    await logsChannel.send({ embeds: [logEmbed] });

    // Reply to the command
    await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
  },
}; 