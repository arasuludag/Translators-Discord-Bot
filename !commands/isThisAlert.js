const { generalChannelID } = require("../config.json");
const functions = require("../functions.js");

async function isThisAlert(message) {
  const generalChannel = await functions.findChannelByID(
    message,
    generalChannelID
  );
  message
    .reply(functions.randomText("isThisAlert", { general: generalChannel }))
    .then((replyMessage) => {
      let reacted = false;
      replyMessage.react("👍");
      replyMessage.react("👎");
      replyMessage.react("❌");

      const filter = (reaction, user) => {
        return (
          (reaction.emoji.name === "👍" ||
            reaction.emoji.name === "👎" ||
            reaction.emoji.name === "❌") &&
          user.id === message.author.id &&
          !user.bot
        );
      };

      const collector = replyMessage.createReactionCollector({
        filter,
        time: 60000,
        max: 1,
      });

      collector.on("collect", (reaction) => {
        switch (reaction.emoji.name) {
          case "👍":
            reacted = true;
            replyMessage.delete();
            break;

          case "👎": {
            reacted = true;

            const mentionedUserNickname = message.guild.members.cache.find(
              (a) => a.user === message.author
            ).nickname;

            generalChannel.send(
              functions.randomText(
                "saidInAlertChannel",
                {
                  user: message.author.id,
                  message: message.content,
                },
                undefined,
                mentionedUserNickname
                  ? mentionedUserNickname
                  : message.author.username,
                `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`
              )
            );
            setTimeout(() => {
              message.delete();
              replyMessage.delete();
            }, 3000);

            return;
          }
        }
      });

      collector.on("end", () => {
        if (!reacted) {
          message.delete();
          replyMessage.delete();
        }
      });
    });
}
exports.isThisAlert = isThisAlert;
