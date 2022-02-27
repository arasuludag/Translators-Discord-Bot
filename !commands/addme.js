const { Permissions } = require("discord.js");
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
  await message
    .reply(
      functions.randomText("addMePrompt", {
        projectName: projectName,
      })
    )
    .then((replyMessage) => {
      const filter = (reaction, user) => {
        return reaction.emoji.name === "👍" && user.id === message.author.id;
      };
      const collector = replyMessage.createReactionCollector({
        filter,
        time: 60000,
        max: 1,
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
            .catch(console.error);
        }
      });
      collector.on("end", () => {
        replyMessage.delete();
        message.delete();
      });
    });
}
exports.addme = addme;
