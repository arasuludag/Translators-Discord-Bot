const functions = require("../functions.js");

async function remove(message) {
  const logsChannel = await functions.findChannelByID(
    message,
    process.env.LOGSCHANNELID
  );

  const mentionedChannel = message.mentions.channels;
  const mentionedMembersMap = message.mentions.members;

  if (mentionedChannel.keys()) {
    mentionedMembersMap
      .filter((value) => !value.user.bot)
      .map((value, key) => {
        mentionedChannel.map(async (valueChannel, keyChannel) => {
          try {
            await valueChannel.permissionOverwrites.edit(key, {
              VIEW_CHANNEL: false,
            });
          } catch (error) {
            await message.author
              .send(functions.randomSend("setParentError"))
              .catch(() => {
                console.error("Failed to send DM");
              });
            return;
          }

          await logsChannel.send(
            functions.randomSend({
              path: "removedFromChannel",
              values: {
                user: value.user.id,
                project: keyChannel,
                approved: message.author.id,
              },
            })
          );
        });
      });
    message.delete();
  }
}
exports.remove = remove;
