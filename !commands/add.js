const { sendEmbed } = require("../customSend.js");
const { findChannelByID } = require("../functions.js");

async function add(message) {
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
              ViewChannel: true,
            });
          } catch (error) {
            await sendEmbed(message.author, "setParentError");
            return;
          }

          await sendEmbed(logsChannel, {
            path: "channelExisted_RA",
            values: {
              user: value.user.id,
              project: keyChannel,
              approved: message.author.id,
            },
          });
          await sendEmbed(value.user, {
            path: "userAddNotify",
            values: {
              project: keyChannel,
            },
          });
        });
      });
    message.delete();
  }
}
exports.add = add;
