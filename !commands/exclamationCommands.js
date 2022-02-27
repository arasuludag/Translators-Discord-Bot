const translation = require("../data.json");
const i18next = require("i18next");
const {
  modRole,
  sassAlertChannelID,
  suppAlertChannelID,
} = require("../config.json");
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
const { isThisAlert } = require("./isThisAlert");
const { backupServer } = require("./backupServer");
const { memory } = require("./memory");
const { pronounMessage } = require("./pronounMessage");

// For localization.
i18next.init({
  lng: "en",
  preload: true,
  resources: {
    en: {
      translation,
    },
  },
});

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

    switch (true) {
      // When !announcement is used, bot relays the message to announcement channel.
      case messageFirstWord === "!announcement" && isMod:
        await announcement(message);
        break;

      // A basic reminder.
      case messageFirstWord === "!remindme" && isMod:
        await remindme(message);
        break;

      // Stats for member count. Has issues.
      case messageFirstWord === "!stats" && isMod:
        await stats(message);
        break;

      // Counts the members in spesified role. Has issues.
      case messageFirstWord === "!list" && isMod:
        await list(message);
        break;

      // Adds several users to several channels. !add username username channelname channelname
      case messageFirstWord === "!add" && isMod:
        await add(message);
        break;

      // Removes people from several channels. !remove username username channelname channelname
      case messageFirstWord === "!remove" && isMod:
        await remove(message);
        break;

      // Is there a channel with this name?
      case messageFirstWord === "!isthere" && isMod:
        await isthere(message);
        break;

      // Add me to this channel. "!addme channel-name"
      case messageFirstWord === "!addme" && isMod:
        await addme(message);
        break;

      // Add a funfact to the JSON file.
      case messageFirstWord === "!addfunfact" && isMod:
        await addfunfact(message);
        break;

      // Add a funfact to the JSON file.
      case messageFirstWord === "!removefunfact" && isMod:
        await removefunfact(message);
        break;

      // Archive the channel.
      case messageFirstWord === "!archive" && isMod:
        await archive(message);
        break;

      // Archive the channel.
      case messageFirstWord === "!unarchive" && isMod:
        await unarchive(message);
        break;

      // Delete last messages. To delete last 10, !delete 10
      case messageFirstWord === "!delete" && isMod:
        await deleteBulk(message);
        break;

      // Send message to a channel as bot.
      case messageFirstWord === "!sendmessage" && isMod:
        await sendmessage(message);
        break;

      // Move message to another channel.
      case messageFirstWord === "!moveto" && isMod:
        await moveto(message);
        break;

      // Copy message to another channel.
      case messageFirstWord === "!copyto" && isMod:
        await copyto(message);
        break;

      // Manages the alert channel by asking author if this is what they wanted.
      case (message.channel.id === sassAlertChannelID ||
        message.channel.id === suppAlertChannelID) &&
        !message.author.bot &&
        message.attachments.size === 0:
        await isThisAlert(message);
        break;

      // Backup the server.
      case messageFirstWord === "!backup" && isMod:
        await backupServer(message);
        break;

      case messageFirstWord === "!memory" && isMod:
        await memory(message);
        break;

      // Send message to a channel as bot.
      case messageFirstWord === "!pronounMessage" && isMod:
        await pronounMessage(message);
        break;

      // ****************************************************** //
      // After this point, it's only for fun.
      case message.mentions.has(client.user) && !message.author.bot:
        message
          .reply(functions.randomText("taggedBot", {}))
          .then((replyMessage) => {
            if (
              replyMessage.embeds[0].description === "Speak, friend, and enter."
            ) {
              const filter = (m) => {
                return m.content.toLowerCase().includes("mellon") === true;
              };

              const collector = message.channel.createMessageCollector({
                filter,
                time: 60000,
                max: 1,
              });

              collector.on("collect", async (reaction) => {
                await reaction.reply(
                  "https://tenor.com/view/lord-of-the-rings-gandalf-indeed-gif-18505269"
                );
              });
            }
          });
        break;

      case message.content === "Hello there!":
        message.reply(
          "https://c.tenor.com/smu7cmwm4rYAAAAd/general-kenobi-kenobi.gif"
        );
        break;

      case message.content.toLowerCase().includes("oh, hi"):
        message.reply(
          "https://c.tenor.com/uATlxJ4eqLsAAAAC/tommy-wiseau-oh-hi-mark.gif"
        );
        break;

      case message.content === "Hmm.":
        message.reply(
          "https://c.tenor.com/SY861GLwsiUAAAAM/the-witcher-geralt.gif"
        );
        break;

      case message.content === "Helle.":
        message.reply(
          "https://tenor.com/view/jason-momoa-jason-momoa-angelwoodgett-gif-18117252"
        );
        break;

      case message.content.toLowerCase().includes("vaco"):
        message.react("💩");
        break;

      case message.content.toLowerCase().includes("toss") &&
        message.content.toLowerCase().includes("coin") &&
        !message.content.includes("http"):
        message.reply(
          "https://tenor.com/view/toss-a-coin-to-your-witcher-o-valley-of-plenty-jaskier-bard-song-gif-15952117"
        );
        break;
    }
  },
};
