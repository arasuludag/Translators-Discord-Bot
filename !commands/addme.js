const {
  ButtonBuilder,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const functions = require("../functions.js");

async function addme(message) {
  const logsChannel = await functions.findChannelByID(
    message,
    process.env.LOGSCHANNELID
  );

  const projectName = message.content.substring(
    message.content.indexOf(" ") + 1
  );
  if (projectName.startsWith("!")) {
    await message.reply(functions.randomSend({ path: "addMePromptEmpty" }));
    return;
  }

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(message.user + message.id)
      .setLabel("Confirm")
      .setStyle("Success")
  );

  await message
    .reply(
      functions.randomSend({
        path: "addMePrompt",
        values: {
          projectName: projectName,
        },
        components: [button],
      })
    )
    .then((replyMessage) => {
      const filter = (i) =>
        i.customId === message.user + message.id &&
        i.user.id === message.author.id;

      const collector = message.channel.createMessageComponentCollector({
        filter,
        max: 1,
        time: 300000,
      });

      collector.on("collect", async () => {
        let dProjectName;
        try {
          dProjectName = await functions.discordStyleProjectName(projectName);
        } catch (error) {
          await message.reply(functions.randomSend("enterProperName"));
          return;
        }

        const foundChannel = await functions.findChannel(message, dProjectName);
        if (foundChannel) {
          foundChannel.permissionOverwrites.edit(message.author.id, {
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
        } else {
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
            });
          // .catch((error) => {
          //   message.reply("Error.", error);
          // });
        }
      });
      collector.on("end", () => {
        replyMessage.delete();
        message.delete();
      });
    });
}
exports.addme = addme;
