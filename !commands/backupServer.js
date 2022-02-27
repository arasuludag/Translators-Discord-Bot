const backup = require("discord-backup");

async function backupServer(message) {
  backup.setStorageFolder(__dirname + "/backups/");
  message.react("⏳");
  backup
    .create(message.guild, {
      jsonBeautify: true,
    })
    .then((backupData) => {
      // And send informations to the backup owner
      message.author.send("Backup created: " + backupData.id).catch(() => {
        console.error("Failed to send DM");
      });
      message.react("💾");
    });
}
exports.backupServer = backupServer;
