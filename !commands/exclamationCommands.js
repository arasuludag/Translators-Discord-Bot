const { announcement } = require("./announcement");
const { remindme } = require("./remindme");
const { stats } = require("./stats");
const { list } = require("./list");
const { add } = require("./add");
const { addfunfact } = require("./addfunfact");
const { removefunfact } = require("./removefunfact");
const { listfunfacts } = require("./listfunfacts");
const { remove } = require("./remove");
const { isthere } = require("./isthere");
const { addme } = require("./addme");
const { archive } = require("./archive");
const { unarchive } = require("./unarchive");
const { deleteBulk } = require("./deleteBulk");
const { sendmessage } = require("./sendmessage");
const { moveto } = require("./moveto");
const { copyto } = require("./copyto");
const { memory } = require("./memory");
const { backupServer } = require("./backupServer");
const { basicMessageChecking } = require("./basicMessageChecking");

module.exports = {
  commands: async (message, client) => {
    let isMod = false;
    let messageFirstWord;
    let command = false;

    // Let's save some bandwith and CPU.
    if (message.content.startsWith("!")) {
      command = true;
      isMod = await message.member.roles.cache.some(
        (role) => role.id === process.env.MODROLEID
      );

      // Extracts the first word of message to check for commands later.
      messageFirstWord = message.content.split(" ")[0];
    }

    if (isMod)
      switch (true) {
        // When !announcement is used, bot relays the message to announcement channel.
        case messageFirstWord === "!announcement":
          await announcement(message);
          break;

        // A basic reminder.
        case messageFirstWord === "!remindme":
          await remindme(message);
          break;

        // Stats for member count. Has issues.
        case messageFirstWord === "!stats":
          await stats(message);
          break;

        // Counts the members in spesified role. Has issues.
        case messageFirstWord === "!list":
          await list(message);
          break;

        // Adds several users to several channels. !add username username channelname channelname
        case messageFirstWord === "!add":
          await add(message);
          break;

        // Removes people from several channels. !remove username username channelname channelname
        case messageFirstWord === "!remove":
          await remove(message);
          break;

        // Is there a channel with this name?
        case messageFirstWord === "!isthere":
          await isthere(message);
          break;

        // Add me to this channel. "!addme channel-name"
        case messageFirstWord === "!addme":
          await addme(message);
          break;

        // Add a funfact to the JSON file.
        case messageFirstWord === "!addfunfact":
          await addfunfact(message);
          break;

        // Add a funfact to the JSON file.
        case messageFirstWord === "!removefunfact":
          await removefunfact(message);
          break;

        // List all funfacts as a message.
        case messageFirstWord === "!listfunfacts":
          await listfunfacts(message);
          break;

        // Archive the channel.
        case messageFirstWord === "!archive":
          await archive(message);
          break;

        // Archive the channel.
        case messageFirstWord === "!unarchive":
          await unarchive(message);
          break;

        // Delete last messages. To delete last 10, !delete 10
        case messageFirstWord === "!delete":
          await deleteBulk(message);
          break;

        // Send message to a channel as bot.
        case messageFirstWord === "!sendmessage":
          await sendmessage(message);
          break;

        // Move message to another channel.
        case messageFirstWord === "!moveto":
          await moveto(message);
          break;

        // Copy message to another channel.
        case messageFirstWord === "!copyto":
          await copyto(message);
          break;

        // Backup the server. Disabled for now.
        case messageFirstWord === "!backup" &&
          message.member.permissionsIn(message.channel).has("ADMINISTRATOR"):
          await backupServer(message);
          break;

        // NodeJS Memory Stats
        case messageFirstWord === "!memory":
          await memory(message);
          break;
      }

    if (!command) await basicMessageChecking(message, client);
  },
};
