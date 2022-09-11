const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const functions = require("../functions.js");

async function isThisAlert(message) {
  const followupChannel = await functions.findChannelByID(
    message,
    process.env.ALERTFOLLOWUPCHANNELID
  );

  const yesButtonCustomID = "Yes" + message.id;
  const noButtonCustomID = "No" + message.id;
  const cancelButtonCustomID = "Cancel" + message.id;

  const yesButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(yesButtonCustomID)
      .setLabel("Yes - Keep my message here.")
      .setStyle("Success")
  );
  const noButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(noButtonCustomID)
      .setLabel(`No - Move my message to ${followupChannel.name}.`)
      .setStyle("Danger")
  );

  const cancelButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(cancelButtonCustomID)
      .setLabel("Cancel - On second thought, just delete my message.")
      .setStyle("Danger")
  );

  message
    .reply(
      functions.randomSend({
        path: "isThisAlert",
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

            const repliedMessage = await message.channel.messages.fetch(
              message.reference?.messageId
            );

            const attachment = Array.from(message.attachments.values());
            const userNickname = await message.guild.members.cache.find(
              (a) => a.user === i.user
            ).nickname;

            const embedMessage = [
              {
                color: process.env.EMBEDCOLOR,
                title: message.reference
                  ? "Jump to original alert message"
                  : undefined,
                url: message.reference
                  ? `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${repliedMessage.id}`
                  : undefined,
                author: {
                  name: userNickname ? userNickname : i.user.username,
                  icon_url: `https://cdn.discordapp.com/avatars/${i.user.id}/${i.user.avatar}.png?size=256`,
                },
                description: message.content,
                image: {
                  url:
                    attachment[0]?.name.includes(".jpg") ||
                    attachment[0]?.name.includes(".png") ||
                    attachment[0]?.name.includes(".gif")
                      ? attachment[0].url
                      : undefined,
                },
                footer: {
                  text: message.reference
                    ? "Automatically relayed from an alert channel as a reply to a message."
                    : "Automatically relayed from an alert channel.",
                },
              },
            ];

            await followupChannel.send({
              embeds: embedMessage,
            });

            await replyMessage.delete();
            await message.delete().catch(() => {
              console.log("Delete error.");
            });

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
