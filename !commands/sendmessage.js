async function sendmessage(message) {
  const mentionedChannel = message.mentions.channels;

  const splitMessage = message.content
    .substring(message.content.indexOf(" ") + 1)
    .split(" | ");

  if (mentionedChannel && splitMessage[1] && splitMessage[2]) {
    mentionedChannel.map((value) => {
      value
        .send({
          embeds: [
            {
              color: process.env.EMBEDCOLOR,
              title: splitMessage[1],
              description: splitMessage[2],
            },
          ],
        })
        .catch(console.error);
    });
  } else {
    await message.reply("!sendmessage #TagChannel | Title | Text");
  }
}
exports.sendmessage = sendmessage;
