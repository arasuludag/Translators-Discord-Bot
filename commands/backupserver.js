require("dotenv").config();
const backup = require("discord-backup");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("backupserver")
    .setDescription("Backup the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    backup.setStorageFolder(__dirname + "/backups/");

    interaction.reply({
      content: "You'll be notified.",
      ephemeral: true,
    });

    backup
      .create(interaction.guild, {
        jsonBeautify: true,
      })
      .then((backupData) => {
        // And send informations to the backup owner
        interaction.user.send("Backup created: " + backupData.id).catch(() => {
          console.error("Failed to send DM");
        });
      });
  },
};
