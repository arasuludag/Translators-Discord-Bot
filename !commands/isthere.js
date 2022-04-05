const { MessageButton, MessageActionRow, Permissions } = require("discord.js");
const functions = require("../functions.js");

async function isthere(message) {
  const logsChannel = await functions.findChannelByID(
    message,
    process.env.LOGSCHANNELID
  );
  let projectName;
  try {
    projectName = functions.discordStyleProjectName(
      message.content.substring(message.content.indexOf(" ") + 1)
    );
  } catch (error) {
    await message.reply(functions.randomSend("enterProperName"));
    return;
  }

  const foundChannel = await functions.findChannel(message, projectName);

  const acceptButtonCustomID = "Accept" + message.id;
  const rejectButtonCustomID = "Reject" + message.id;

  const acceptButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(acceptButtonCustomID)
      .setLabel("Yes")
      .setStyle("SUCCESS")
  );
  const rejectButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(rejectButtonCustomID)
      .setLabel("No")
      .setStyle("DANGER")
  );

  if (foundChannel) {
    message
      .reply(
        functions.randomSend({
          path: "isThere.yes",
          values: {
            foundChannel: foundChannel.id,
          },
          components: [acceptButton, rejectButton],
        })
      )
      .then((replyMessage) => {
        const filter = (i) =>
          (i.customId === acceptButtonCustomID ||
            i.customId === rejectButtonCustomID) &&
          i.user.id === message.author.id;

        const collector = replyMessage.channel.createMessageComponentCollector({
          filter,
          time: 120000,
          max: 1,
        });

        collector.on("collect", async (i) => {
          replyMessage.react("🍻");

          if (i.customId === acceptButtonCustomID) {
            await foundChannel.permissionOverwrites.edit(message.author.id, {
              VIEW_CHANNEL: true,
            });

            logsChannel.send(
              functions.randomSend({
                path: "channelExisted",
                values: {
                  user: message.author.id,
                  project: foundChannel.id,
                },
              })
            );
          }
        });
        collector.on("end", async () => {
          await replyMessage.edit({
            components: [],
          });
        });
      });
  } else {
    message
      .reply(
        functions.randomSend({
          path: "isThere.no",
          components: [acceptButton, rejectButton],
        })
      )
      .then((replyMessage) => {
        const filter = (i) =>
          (i.customId === acceptButtonCustomID ||
            i.customId === rejectButtonCustomID) &&
          i.user.id === message.author.id;

        const collector = replyMessage.channel.createMessageComponentCollector({
          filter,
          time: 120000,
          max: 1,
        });

        collector.on("collect", async (i) => {
          replyMessage.react("🍻");

          if (i.customId === acceptButtonCustomID)
            await message.guild.channels
              .create(projectName, {
                type: "GUILD_TEXT",
                permissionOverwrites: [
                  {
                    id: message.guild.id,
                    deny: [Permissions.FLAGS.VIEW_CHANNEL],
                  },
                  {
                    id: message.author.id,
                    allow: [Permissions.FLAGS.VIEW_CHANNEL],
                  },
                ],
              })
              .then(async (createdChannel) => {
                const category = await functions.findCategoryByName(
                  message,
                  process.env.PROJECTSCATEGORY
                );
                await createdChannel.setParent(category.id);

                await createdChannel.permissionOverwrites.edit(
                  message.author.id,
                  {
                    VIEW_CHANNEL: true,
                  }
                );

                logsChannel.send(
                  functions.randomSend({
                    path: "channelCreated",
                    values: {
                      createdChannel: createdChannel.id,
                      user: message.author.id,
                    },
                  })
                );
              })
              .catch(console.error);
        });
        collector.on("end", async () => {
          await replyMessage.edit({
            components: [],
          });
        });
      });
  }
}
exports.isthere = isthere;
