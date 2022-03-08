const { logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function deleteBulk(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);
  const howMany = parseInt(
    message.content.substring(message.content.indexOf(" ") + 1)
  );

  if (Number.isInteger(howMany) && howMany < 101) {
    // Bulk delete messages
    message.channel
      .bulkDelete(howMany)
      .then(
        async (messages) =>
          await logsChannel.send(
            functions.randomSend({
              path: "deletedMessages",
              values: {
                user: message.author.id,
                channel: message.channel.id,
                howMany: messages.size,
              },
            })
          )
      )
      .catch((error) => {
        message.reply(
          "There is an error. Try to lower the number maybe. \n \n",
          error
        );
      });
  }
}
exports.deleteBulk = deleteBulk;
