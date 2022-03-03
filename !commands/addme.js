const { MessageButton, MessageActionRow, Permissions } = require("discord.js");
const { projectsCategory, logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function addme(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);

  const projectName = message.content.substring(
    message.content.indexOf(" ") + 1
  );
  if (projectName === "!addme") {
    await message.reply(functions.randomText("addMePromptEmpty", {}));
    return;
  }

  const button = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(message.user + message.id)
      .setLabel("Confirm")
      .setStyle("SUCCESS")
  );

  await message
    .reply(
      functions.randomText(
        "addMePrompt",
        {
          projectName: projectName,
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [button]
      )
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
        const foundChannel = await functions.findChannel(
          message,
          functions.discordStyleProjectName(projectName)
        );
        if (foundChannel) {
          foundChannel.permissionOverwrites.edit(message.author.id, {
            VIEW_CHANNEL: true,
          });

          logsChannel.send(
            functions.randomText("channelExisted", {
              user: message.author.id,
              project: foundChannel.id,
            })
          );
        } else {
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
                projectsCategory
              );
              await createdChannel.setParent(category.id);

              await createdChannel.permissionOverwrites.edit(
                message.author.id,
                {
                  VIEW_CHANNEL: true,
                }
              );

              logsChannel.send(
                functions.randomText("channelCreated", {
                  createdChannel: createdChannel.id,
                  user: message.author.id,
                })
              );
            })
            .catch((error) => {
              message.reply("Error.", error);
            });
        }
      });
      collector.on("end", () => {
        replyMessage.delete();
        message.delete();
      });
    });
}
exports.addme = addme;
