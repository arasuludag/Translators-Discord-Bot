const { modRole } = require("../config.json");
const functions = require("../functions.js");
const { announcement } = require("./announcement");
const { remindme } = require("./remindme");
const { stats } = require("./stats");
const { list } = require("./list");
const { add } = require("./add");
const { remove } = require("./remove");
const { isthere } = require("./isthere");
const { addme } = require("./addme");
const { addfunfact } = require("./addfunfact");
const { removefunfact } = require("./removefunfact");
const { archive } = require("./archive");
const { unarchive } = require("./unarchive");
const { deleteBulk } = require("./deleteBulk");
const { sendmessage } = require("./sendmessage");
const { moveto } = require("./moveto");
const { copyto } = require("./copyto");
const { backupServer } = require("./backupServer");
const { memory } = require("./memory");
const { pronounMessage } = require("./pronounMessage");
const { basicMessageChecking } = require("./basicMessageChecking");

module.exports = {
  commands: async (message, client) => {
    // Discord caused a crash by sending a non-existent message that doesn't have a role attribute and that caused a crash.
    // So that's why.
    let isMod = false;
    try {
      isMod = message.member.roles.cache.some((role) => role.name === modRole);
    } catch (error) {
      await message.channel
        .send(functions.randomText("discordError", {}))
        .catch((error) => {
          console.log(error);
        });
      return;
    }

    // Extracts the first word of message to check for commands later.
    const messageFirstWord = message.content.split(" ")[0];

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

        // Backup the server.
        case messageFirstWord === "!backup":
          await backupServer(message);
          break;

        // NodeJS Memory Stats
        case messageFirstWord === "!memory":
          await memory(message);
          break;

        // Send message to a channel as bot.
        case messageFirstWord === "!pronounMessage":
          await pronounMessage(message);
          break;
      }

    await basicMessageChecking(message, client);
  },
};
