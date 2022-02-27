const { logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function add(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);

  const mentionedChannel = message.mentions.channels;
  const mentionedMembersMap = message.mentions.members;

  if (mentionedChannel.keys()) {
    mentionedMembersMap
      .filter((value) => !value.user.bot)
      .map((value, key) => {
        mentionedChannel.map(async (valueChannel, keyChannel) => {
          try {
            await valueChannel.permissionOverwrites.edit(key, {
              VIEW_CHANNEL: true,
            });
          } catch (error) {
            await message.author
              .send(functions.randomText("setParentError", {}))
              .catch(() => {
                console.error("Failed to send DM");
              });
            return;
          }

          await logsChannel.send(
            functions.randomText("channelExisted_RA", {
              user: value.user.id,
              project: keyChannel,
              approved: message.author.id,
            })
          );
          await value.user
            .send(
              functions.randomText("userAddNotify", {
                project: keyChannel,
              })
            )
            .catch(() => {
              console.error("Failed to send DM");
            });
        });
      });
    message.delete();
  }
}
exports.add = add;
