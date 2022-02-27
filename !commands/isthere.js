const { Permissions } = require("discord.js");
const { projectsCategory, logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function isthere(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);
  const projectName = message.content.substring(
    message.content.indexOf(" ") + 1
  );
  const foundChannel = await functions.findChannel(
    message,
    functions.discordStyleProjectName(projectName)
  );
  if (foundChannel) {
    message
      .reply(
        functions.randomText("isThere.yes", {
          foundChannel: foundChannel.id,
        })
      )
      .then((replyMessage) => {
        replyMessage.react("👍");

        const filter = (reaction, user) => {
          return reaction.emoji.name === "👍" && user.id === message.author.id;
        };
        const collector = replyMessage.createReactionCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", async () => {
          await foundChannel.permissionOverwrites.edit(message.author.id, {
            VIEW_CHANNEL: true,
          });

          logsChannel.send(
            functions.randomText("channelExisted", {
              user: message.author.id,
              project: foundChannel.id,
            })
          );
        });
      });
  } else {
    message
      .reply(functions.randomText("isThere.no", {}))
      .then((replyMessage) => {
        replyMessage.react("👍");
        replyMessage.react("👎");

        const filter = (reaction, user) => {
          return reaction.emoji.name === "👍" && user.id === message.author.id;
        };
        const collector = replyMessage.createReactionCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", async () => {
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
        });
        collector.on("end", () => {
          setTimeout(() => {
            message.delete();
            replyMessage.delete();
          }, 3000);
        });
      });
  }
}
exports.isthere = isthere;
