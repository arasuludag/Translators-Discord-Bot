const { sendEmbed } = require("../customSend");
const { findChannelByID } = require("../functions");

async function remove(message) {
  const logsChannel = await findChannelByID(message, process.env.LOGSCHANNELID);

  const mentionedChannel = message.mentions.channels;
  const mentionedMembersMap = message.mentions.members;

  if (mentionedChannel.keys()) {
    mentionedMembersMap
      .filter((value) => !value.user.bot)
      .map((value, key) => {
        mentionedChannel.map(async (valueChannel, keyChannel) => {
          try {
            await valueChannel.permissionOverwrites.edit(key, {
              ViewChannel: false,
            });
          } catch (error) {
            await sendEmbed(message.author, "setParentError");
            return;
          }

          await sendEmbed(logsChannel, {
            path: "removedFromChannel",
            values: {
              user: value.user.id,
              project: keyChannel,
              approved: message.author.id,
            },
          });
        });
      });
    message.delete();
  }
}
exports.remove = remove;
