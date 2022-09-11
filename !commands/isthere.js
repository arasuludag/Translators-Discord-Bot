const {
  ButtonBuilder,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const functions = require("../functions.js");

async function isthere(message) {
  const logsChannel = await functions.findChannelByID(
    message,
    process.env.LOGSCHANNELID
  );

  if (
    message.content.substring(message.content.indexOf(" ") + 1).startsWith("!")
  ) {
    await message.reply(functions.randomSend("enterProperName"));
    return;
  }

  const projectName = functions.discordStyleProjectName(
    message.content.substring(message.content.indexOf(" ") + 1)
  );

  const foundChannel = await functions.findChannel(message, projectName);

  const acceptButtonCustomID = "Accept " + message.id;
  const rejectButtonCustomID = "Reject " + message.id;

  const acceptButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(acceptButtonCustomID)
      .setLabel("Yes")
      .setStyle("Success")
  );
  const rejectButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(rejectButtonCustomID)
      .setLabel("No")
      .setStyle("Danger")
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
          message.id === i.customId.split(" ")[1] &&
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
              ViewChannel: true,
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
              .create({
                name: projectName,
                type: 0,
                permissionOverwrites: [
                  {
                    id: message.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                  },
                  {
                    id: message.author.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                  },
                ],
              })
              .then(async (createdChannel) => {
                const category = await functions.findCategoryByName(
                  message,
                  process.env.PROJECTSCATEGORY
                );
                await createdChannel
                  .setParent(category.id, { lockPermissions: false })
                  .catch((error) => {
                    logsChannel.send(
                      "Error: Setting the category of channel. \n " + error
                    );
                  });

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
