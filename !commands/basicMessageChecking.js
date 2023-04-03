// const { isThisAlert } = require("./isThisAlert");

const { replyEmbed } = require("../customSend");
const { findUserByID } = require("../functions");

async function basicMessageChecking(message, client) {
  const lowerCaseMessage = message.content.toLowerCase();

  const repliedMessage = message.reference
    ? await message.channel.messages.fetch(message.reference.messageId)
    : null;

  if (!message.author.bot && !message.content.includes("http"))
    switch (true) {
      // Manages the alert channel by asking author if this is what they wanted.
      case (message.channel.id === process.env.SASSALERTCHANNELID ||
        message.channel.id === process.env.SUPPALERTCHANNELID) &&
        message.attachments.size === 0:
        // await isThisAlert(message);
        break;

      case message.mentions.has(client.user) &&
        !message.mentions.everyone &&
        !message.content.includes("/") &&
        message.reference &&
        repliedMessage.content.includes("Help Requested by User ID"):
        findUserByID(client, repliedMessage.content.split(" ").at(-1)).then(
          (user) => {
            user
              .send({
                embeds: [
                  {
                    color: process.env.EMBEDCOLOR,
                    description:
                      message.content +
                      "\n \n _Sassy cannot read the messages you send here and it cannot forward them to anyone else. Your direct messages to Sassy are private, but this also means that neither Sassy nor an admin can reply to the questions you ask here. If your problem is not solved or if you have more questions, please use `/help` again, and one of our admins will assist you!_",
                    title: "Reply from Help Desk:",
                  },
                ],
              })
              .then(() => {
                message.react("📩");
                repliedMessage.react("✅");
              })
              .catch((error) => {
                console.error("Failed to send help. \n" + error);
              });
          }
        );

        break;

      // After this point, it's only for fun.
      case message.mentions.has(client.user) &&
        !message.mentions.everyone &&
        !message.content.includes("/"):
        replyEmbed(message, { path: "taggedBot" }).then((replyMessage) => {
          if (
            replyMessage.embeds[0]?.description === "Speak, friend, and enter."
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

      case lowerCaseMessage.includes("man ass"):
        message.react("🍑");
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
