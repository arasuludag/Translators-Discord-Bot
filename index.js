/* eslint-disable no-redeclare */
const { readdirSync } = require("fs");
const translation = require("./data.json");
const i18next = require("i18next");
const { Client, Intents, Permissions, Collection } = require("discord.js");
const {
  token,
  modRole,
  projectsCategory,
  sassAlertChannelID,
  suppAlertChannelID,
  archiveCategory,
  logsChannelName,
  receptionChannelID,
  announcementsChannelName,
  generalChannelID,
  embedColor,
} = require("./config.json");
const functions = require("./functions.js");

const myIntents = new Intents();
myIntents.add(
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILD_MEMBERS
);
const client = new Client({ intents: myIntents });

client.commands = new Collection();
const commandFiles = readdirSync("./commands").filter((file) =>
  file.endsWith(".js")
);

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// For localization.
i18next.init({
  lng: "en",
  preload: true,
  resources: {
    en: {
      translation,
    },
  },
});

// Role name of a moderator.
const moderatorRole = modRole;

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [
      {
        name: "Translation",
        type: 3,
      },
    ],
    status: "idle",
  });
});

// Sends a welcome message to newly joined users.
client.on("guildMemberAdd", (member) => {
  member.send({
    embeds: [
      {
        color: embedColor,
        title: i18next.t("welcome.title"),
        description: i18next.t("welcome.message", {
          reception: receptionChannelID,
        }),
      },
    ],
  });
});

client.on("messageCreate", async (message) => {
  // Finds the required channels in Guild.
  const sassAlertChannel = await functions.findChannelByID(
    message,
    sassAlertChannelID
  );
  const suppAlertChannel = await functions.findChannelByID(
    message,
    suppAlertChannelID
  );
  const isMod = message.member.roles.cache.some(
    (role) => role.name === moderatorRole
  );

  // Extracts the first word of message to check for commands later.
  const messageFirstWord = message.content.split(" ")[0];

  switch (true) {
    // When !announcement is used, bot relays the message to announcement channel.
    case messageFirstWord === "!announcement" && isMod:
      await functions.findChannel(message, announcementsChannelName).send({
        embeds: [
          {
            color: embedColor,
            title: "Announcement",
            description: message.content.substring(
              message.content.indexOf(" ") + 1
            ),
          },
        ],
      });
      break;

    // A basic reminder.
    case messageFirstWord === "!remindme" && isMod:
      message.reply(functions.randomText("reminder.remindWhat", {}));

      var filter = (m) => {
        return m.author.id === message.author.id;
      };

      var collector = message.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1,
      });

      collector.on("collect", (text) => {
        const remindText = text.content;

        text.reply(functions.randomText("reminder.when", {}));

        const collector = message.channel.createMessageCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", (when) => {
          const unixTimeWhen = Date.parse(when.content);

          if (isNaN(unixTimeWhen)) {
            when.reply(functions.randomText("reminder.notADate", {}));
            return console.log("Someone didn't get the date right.");
          }

          when.reply(functions.randomText("reminder.howLongBefore", {}));

          const collector = message.channel.createMessageCollector({
            filter,
            time: 60000,
            max: 1,
          });

          collector.on("collect", (minutesBefore) => {
            if (!Number.isInteger(parseInt(minutesBefore.content))) {
              when.reply(functions.randomText("reminder.notAnInt", {}));
              return console.log("Someone didn't get the minutes left right.");
            }

            const differenceBetween = unixTimeWhen - Date.now();

            minutesBefore.reply(functions.randomText("requestAcquired", {}));

            setTimeout(
              () =>
                minutesBefore.reply(
                  functions.randomText("reminder.minutesLeft", {
                    minutesBefore: minutesBefore.content,
                    remindText: remindText,
                  })
                ),
              differenceBetween - minutesBefore.content * 60 * 1000
            );
            setTimeout(
              () =>
                minutesBefore.reply(
                  functions.randomText("reminder.itsTime", {
                    remindText: remindText,
                  })
                ),
              differenceBetween
            );
          });
        });
      });

      break;

    // Stats for member count. Has issues.
    case messageFirstWord === "!stats" && isMod:
      var memberCountMessage = "";

      message.guild.roles.cache.forEach((role) => {
        memberCountMessage = memberCountMessage.concat(
          `${role.toString()} has ${
            message.guild.roles.cache.get(role.id).members.size
          } people.
`
        );
      });
      message.reply(`We have ${message.member.guild.memberCount} members in total. 
${memberCountMessage} 
`);

      break;

    // Counts the members in spesified role. Has issues.
    case messageFirstWord === "!list" && isMod: {
      const mentionedRolesMap = message.mentions.roles;
      mentionedRolesMap.map((values) => {
        let memberList = "";
        values.members.map((role) => {
          memberList = memberList.concat(
            `${role.user.toString()}
`
          );
        });
        message.reply(`${values.toString()} has 
${memberList}`);
      });

      break;
    }

    // Adds several users to a channel.
    case messageFirstWord === "!add" && isMod:
      {
        var logsChannel = await functions.findChannel(message, logsChannelName);

        const mentionedChannel = message.mentions.channels;
        const mentionedMembersMap = message.mentions.members;

        if (mentionedChannel.keys()) {
          mentionedMembersMap.map((value, key) => {
            mentionedChannel.map((valueChannel, keyChannel) => {
              valueChannel.permissionOverwrites.edit(key, {
                VIEW_CHANNEL: true,
              });

              logsChannel.send(
                functions.randomText("channelExisted_RA", {
                  user: value.user.id,
                  project: keyChannel,
                  approved: message.author.id,
                })
              );
            });
          });
          message.delete();
        }
      }
      break;

    // Is there a channel with this name?
    case messageFirstWord === "!isthere" && isMod:
      var projectName = message.content.substring(
        message.content.indexOf(" ") + 1
      );
      var foundChannel = await functions.findChannel(
        message,
        functions.discordStyleProjectName(projectName)
      );
      if (foundChannel) {
        message.reply(
          functions.randomText("isThere.yes", { foundChannel: foundChannel.id })
        );
      } else {
        message.reply(functions.randomText("isThere.no", {}));
      }
      break;

    // Add me to this channel. "!addme channel-name"
    case messageFirstWord === "!addme" && isMod:
      var logsChannel = await functions.findChannel(message, logsChannelName);

      var projectName = message.content.substring(
        message.content.indexOf(" ") + 1
      );
      if (projectName === "!addme") {
        await message.reply(functions.randomText("addMePromptEmpty", {}));
        break;
      }
      await message
        .reply(
          functions.randomText("addMePrompt", { projectName: projectName })
        )
        .then((replyMessage) => {
          const filter = (reaction, user) => {
            return (
              reaction.emoji.name === "👍" && user.id === message.author.id
            );
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
                  const category = message.guild.channels.cache.find(
                    (c) =>
                      c.name == projectsCategory && c.type == "GUILD_CATEGORY"
                  );

                  if (!category) {
                    throw new Error("Category channel does not exist");
                  }
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

      break;

    // Add a funfact to the JSON file.
    case messageFirstWord === "!addfunfact" && isMod:
      if (!message.content.split(" ")[1]) {
        await message.reply(functions.randomText("addFunfact.empty", {}));
        break;
      }

      var fs = require("fs");
      fs.readFile(
        "./funfacts.json",
        "utf8",
        function readFileCallback(err, data) {
          if (err) {
            console.log(err);
          } else {
            var obj = JSON.parse(data); // now it an object
            obj.funfacts.push(
              message.content.substring(message.content.indexOf(" ") + 1)
            ); // add some data
            var json = JSON.stringify(obj); // convert it back to json
            fs.writeFile("./funfacts.json", json, "utf8", async () => {
              await message.reply(
                functions.randomText("addFunfact.added", {
                  funfact: message.content.substring(
                    message.content.indexOf(" ") + 1
                  ),
                })
              );
            }); // write it back
          }
        }
      );

      break;

    // Archive the channel.
    case messageFirstWord === "!archive" && isMod: {
      var logsChannel = await functions.findChannel(message, logsChannelName);

      const category = message.guild.channels.cache.find(
        (c) => c.name == archiveCategory && c.type == "GUILD_CATEGORY"
      );

      if (!category) throw new Error("Category channel does not exist");
      message.channel.setParent(category.id, { lockPermissions: false });

      await message.channel.send(
        functions.randomText("movedToWO_User", {
          channel: message.channel.id,
        })
      );

      await logsChannel.send(
        functions.randomText("movedToArchive", {
          user: message.author.id,
          channel: message.channel.id,
        })
      );
      await message.delete();

      break;
    }

    // Delete last messages. To delete last 10, !deletelastmessages 10
    case messageFirstWord === "!deletelastmessages" && isMod:
      var logsChannel = await functions.findChannel(message, logsChannelName);
      var howMany = message.content.substring(message.content.indexOf(" ") + 1);

      if (Number.isInteger(parseInt(howMany))) {
        // Bulk delete messages
        message.channel
          .bulkDelete(parseInt(howMany))
          .then(
            async (messages) =>
              await logsChannel.send(
                functions.randomText("deletedMessages", {
                  user: message.author.id,
                  channel: message.channel.id,
                  howMany: messages.size,
                })
              )
          )
          .catch(console.error);
      }
      break;

    // Send message to a channel as bot.
    case messageFirstWord === "!sendmessage" && isMod: {
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
                  color: embedColor,
                  title: splitMessage[1],
                  description: splitMessage[2],
                },
              ],
            })
            .catch(console.error);
        });
      }
      break;
    }

    // Move message to another channel.
    case messageFirstWord === "!moveto" && isMod: {
      if (message.reference && message.mentions.channels) {
        const repliedMessage = await message.channel.messages.fetch(
          message.reference.messageId
        );
        const mentionedUser = message.mentions.repliedUser;

        const channelMovedTo = message.mentions.channels;
        channelMovedTo.map((value) => {
          value.send({
            embeds: [
              {
                color: embedColor,
                author: {
                  name: mentionedUser.displayName
                    ? mentionedUser.displayName
                    : mentionedUser.username,
                  icon_url: `https://cdn.discordapp.com/avatars/${mentionedUser.id}/${mentionedUser.avatar}.png?size=256`,
                },
                description: repliedMessage.content,
              },
            ],
          });

          mentionedUser
            .send(
              functions.randomText("messageMovedTo", {
                message: repliedMessage.content,
                channel: value.id,
              })
            )
            .catch((error) => {
              console.error("Failed to send DM:", error);
            });
        });

        repliedMessage.delete();
        message.delete();
      }
      break;
    }

    // Manages the alert channel by asking author if this is what they wanted.
    case (message.channel === sassAlertChannel ||
      message.channel === suppAlertChannel) &&
      !message.author.bot: {
      const generalChannel = functions.findChannelByID(
        message,
        generalChannelID
      );
      message
        .reply(functions.randomText("isThisAlert", { general: generalChannel }))
        .then((replyMessage) => {
          let reacted = false;
          replyMessage.react("👍");
          replyMessage.react("👎");
          replyMessage.react("❌");

          const filter = (reaction, user) => {
            return (
              (reaction.emoji.name === "👍" ||
                reaction.emoji.name === "👎" ||
                reaction.emoji.name === "❌") &&
              user.id === message.author.id &&
              !user.bot
            );
          };

          const collector = replyMessage.createReactionCollector({
            filter,
            time: 60000,
            max: 1,
          });

          collector.on("collect", (reaction) => {
            switch (reaction.emoji.name) {
              case "👍":
                reacted = true;
                replyMessage.delete();
                break;

              case "👎": {
                reacted = true;

                generalChannel.send(
                  functions.randomText(
                    "saidInAlertChannel",
                    {
                      user: message.author.id,
                      message: message.content,
                    },
                    undefined,
                    message.author.displayName
                      ? message.author.displayName
                      : message.author.username,
                    `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`
                  )
                );
                message.delete();
                replyMessage.delete();
                break;
              }
            }
          });

          collector.on("end", () => {
            if (!reacted) {
              message.delete();
              replyMessage.delete();
            }
          });
        });

      break;
    }
  }
});

// For commands.
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    return interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

client.login(token); // Login bot using token.
