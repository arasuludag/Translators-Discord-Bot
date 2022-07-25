const functions = require("../functions.js");
// const { isThisAlert } = require("./isThisAlert");

async function basicMessageChecking(message, client) {
  const lowerCaseMessage = message.content.toLowerCase();

  if (!message.author.bot && !message.content.includes("http"))
    switch (true) {
      // Manages the alert channel by asking author if this is what they wanted.
      case (message.channel.id === process.env.SASSALERTCHANNELID ||
        message.channel.id === process.env.SUPPALERTCHANNELID) &&
        message.attachments.size === 0:
        // await isThisAlert(message);
        break;

      // After this point, it's only for fun.
      case message.mentions.has(client.user) &&
        !message.mentions.everyone &&
        !message.content.includes("/"):
        message
          .reply(functions.randomSend({ path: "taggedBot" }))
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

      case lowerCaseMessage.includes("oh, hi"):
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

      case message.content === "I'll be back.":
        message.reply(
          "https://tenor.com/view/exterminador-do-futuro-gif-20118743"
        );
        break;

      case lowerCaseMessage.includes("vaco"):
        message.react("💩");
        break;

      case lowerCaseMessage.includes("toss") &&
        lowerCaseMessage.includes("coin"):
        message.reply(
          "https://tenor.com/view/toss-a-coin-to-your-witcher-o-valley-of-plenty-jaskier-bard-song-gif-15952117"
        );
        break;
    }
}
exports.basicMessageChecking = basicMessageChecking;
