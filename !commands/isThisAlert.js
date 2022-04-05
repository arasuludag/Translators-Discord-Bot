const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");

async function isThisAlert(message) {
  const generalChannel = await functions.findChannelByID(
    message,
    process.env.GENERALCHANNELID
  );

  const yesButtonCustomID = "Yes" + message.id;
  const noButtonCustomID = "No" + message.id;
  const cancelButtonCustomID = "Cancel" + message.id;

  const yesButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(yesButtonCustomID)
      .setLabel("Yes - Keep my message here.")
      .setStyle("SUCCESS")
  );
  const noButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(noButtonCustomID)
      .setLabel(`No - Move my message to ${generalChannel.name}.`)
      .setStyle("DANGER")
  );

  const cancelButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(cancelButtonCustomID)
      .setLabel("Cancel - On second thought, just delete my message.")
      .setStyle("DANGER")
  );

  message
    .reply(
      functions.randomSend({
        path: "isThisAlert",
        values: { general: generalChannel },
        components: [yesButton, noButton, cancelButton],
      })
    )
    .then((replyMessage) => {
      let reacted = false;

      const filter = (i) =>
        (i.customId === yesButtonCustomID ||
          i.customId === noButtonCustomID ||
          i.customId === cancelButtonCustomID) &&
        i.user.id === message.author.id;

      const collector = replyMessage.channel.createMessageComponentCollector({
        filter,
        max: 1,
        time: 120000,
      });

      collector.on("collect", async (i) => {
        switch (i.customId) {
          case yesButtonCustomID:
            reacted = true;
            await replyMessage.delete();
            return;

          case noButtonCustomID: {
            reacted = true;
            let repliedEmbed;

            if (message.reference) {
              const repliedMessage = await message.channel.messages.fetch(
                message.reference.messageId
              );
              const mentionedUser = message.mentions.repliedUser;
              const attachment = Array.from(
                repliedMessage.attachments.values()
              );
              const mentionedUserNickname = message.guild.members.cache.find(
                (a) => a.user === mentionedUser
              ).nickname;

              repliedEmbed = [
                {
                  color: process.env.EMBEDCOLOR,
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
                  title: repliedMessage.embeds[0]
                    ? repliedMessage.embeds[0].title
                    : undefined,
                  image: {
                    url:
                      attachment[0] &&
                      (attachment[0].name.includes(".jpg") ||
                        attachment[0].name.includes(".png") ||
                        attachment[0].name.includes(".gif"))
                        ? attachment[0].url
                        : undefined,
                  },
                  footer: {
                    text: "In reply to this.",
                  },
                },
              ];
            }

            const attachment = Array.from(message.attachments.values());
            const userNickname = await message.guild.members.cache.find(
              (a) => a.user === i.user
            ).nickname;

            const embedMessage = [
              {
                color: process.env.EMBEDCOLOR,
                author: {
                  name: userNickname ? userNickname : i.user.username,
                  icon_url: `https://cdn.discordapp.com/avatars/${i.user.id}/${i.user.avatar}.png?size=256`,
                },
                description: message.content,
                image: {
                  url:
                    attachment[0] &&
                    (attachment[0].name.includes(".jpg") ||
                      attachment[0].name.includes(".png") ||
                      attachment[0].name.includes(".gif"))
                      ? attachment[0].url
                      : undefined,
                },
                footer: {
                  text: "Automatically relayed from an alert channel.",
                },
              },
            ];

            if (message.reference) {
              await generalChannel
                .send({
                  embeds: repliedEmbed,
                })
                .then(async (repliedMessage) => {
                  await repliedMessage.reply({
                    embeds: embedMessage,
                  });
                });
            } else {
              await generalChannel.send({
                embeds: embedMessage,
              });
            }

            await replyMessage.delete();
            await message.delete();

            return;
          }
        }
      });

      collector.on("end", async () => {
        if (!reacted) {
          await replyMessage.delete();
          await message.delete().catch(() => {
            console.log("Delete error.");
          });
        }
      });
    });
}
exports.isThisAlert = isThisAlert;
