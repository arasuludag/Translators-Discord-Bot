const functions = require("../functions.js");

async function copyto(message) {
  if (message.reference && message.mentions.channels) {
    const repliedMessage = await message.channel.messages.fetch(
      message.reference.messageId
    );
    const mentionedUser = message.mentions.repliedUser;
    const attachment = Array.from(repliedMessage.attachments.values());
    const mentionedUserNickname = message.guild.members.cache.find(
      (a) => a.user === mentionedUser
    ).nickname;

    const commands = message.content.split(" ");
    let noDM = false;

    for (let i in commands) {
      if (commands[i] === "noDM") noDM = true;
    }

    const channelMovedTo = message.mentions.channels;
    channelMovedTo.map((value) => {
      value.send({
        embeds: [
          {
            color: process.env.EMBEDCOLOR,
            title: repliedMessage.reference
              ? "Jump to replied message"
              : undefined,
            url: repliedMessage.reference
              ? `https://discord.com/channels/${repliedMessage.guild.id}/${repliedMessage.channel.id}/${repliedMessage.reference.messageId}`
              : undefined,
            author: {
              name: mentionedUserNickname
                ? mentionedUserNickname
                : mentionedUser.username,
              icon_url: `https://cdn.discordapp.com/avatars/${mentionedUser.id}/${mentionedUser.avatar}.png?size=256`,
            },
            description: repliedMessage.content
              ? repliedMessage.content
              : repliedMessage.embeds[0]
              ? repliedMessage.embeds[0].description
              : ".",
            image: {
              url:
                attachment[0]?.name.includes(".jpg") ||
                attachment[0]?.name.includes(".png") ||
                attachment[0]?.name.includes(".gif")
                  ? attachment[0].url
                  : undefined,
            },
          },
        ],
        files:
          attachment[0] &&
          !(
            attachment[0].name.includes(".jpg") ||
            attachment[0].name.includes(".png") ||
            attachment[0].name.includes(".gif")
          )
            ? [
                {
                  attachment: attachment[0].url,
                },
              ]
            : undefined,
      });

      if (!noDM)
        mentionedUser
          .send(
            functions.randomSend({
              path: "messageCopiedTo",
              values: {
                message: repliedMessage.content,
                channel: value.id,
                attachment: attachment[0] ? attachment[0].url : " ",
              },
            })
          )
          .catch(() => {
            console.error("Failed to send DM");
          });
    });

    await message.delete();
  }
}
exports.copyto = copyto;
