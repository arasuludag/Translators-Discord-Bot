const { readdirSync } = require("fs");
const translation = require("./data.json");
const i18next = require("i18next");
const { Client, Intents, Permissions, Collection } = require("discord.js");
const {
  token,
  modRole,
  projectsCategory,
  alertsChannelName,
  commandsChannelName,
  notificationChannelName,
  announcementsChannelName,
  generalChannelName,
  embedColor,
} = require("./config.json");
const functions = require("./functions.js");

const myIntents = new Intents();
myIntents.add(
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS
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
        description: i18next.t("welcome.message"),
      },
    ],
  });
});

client.on("messageCreate", async (message) => {
  // Finds the required channels in Guild.
  const commandsChannel = await functions.findChannel(
    message,
    commandsChannelName
  );
  const alertChannel = await functions.findChannel(message, alertsChannelName);
  const isMod = message.member.roles.cache.some(
    (role) => role.name === moderatorRole
  );

  // Extracts the first word of message to check for commands later.
  messageFirstWord = message.content.split(" ")[0];

  switch (true) {
    // Manages the channel for commands by deleting the messages there.
    case message.channel === commandsChannel && !message.author.bot:
      message.channel
        .send(functions.randomText("onlyCommands", {}))
        .then((msg) => {
          message.delete();
          setTimeout(() => msg.delete(), 5000);
        })
        .catch(console.error);
      break;

    // Manages the channel for commands by deleting the messages without 🚨 there.
    case message.channel === alertChannel && !message.author.bot:
      if (!message.content.includes("🚨"))
        message.channel
          .send(functions.randomText("onlyAlerts", {}))
          .then(async (msg) => {
            const generalChannel = await functions.findChannel(
              message,
              generalChannelName
            );
            generalChannel.send(
              functions.randomText("saidInAlertChannel", {
                user: message.author.id,
                message: message.content,
              })
            );
            message.delete();

            setTimeout(() => msg.delete(), 5000);
          })
          .catch(console.error);
      break;

    // When !announcement is used, bot relays the message to announcement channel.
    case messageFirstWord === "!announcement" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
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

        var collector = message.channel.createMessageCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", (when) => {
          unixTimeWhen = Date.parse(when.content);

          if (isNaN(unixTimeWhen)) {
            when.reply(functions.randomText("reminder.notADate", {}));
            return console.log("Someone didn't get the date right.");
          }

          when.reply(functions.randomText("reminder.howLongBefore", {}));

          var collector = message.channel.createMessageCollector({
            filter,
            time: 60000,
            max: 1,
          });

          collector.on("collect", (minutesBefore) => {
            if (!Number.isInteger(parseInt(minutesBefore.content))) {
              when.reply(functions.randomText("reminder.notAnInt", {}));
              return console.log("Someone didn't get the minutes left right.");
            }

            differenceBetween = unixTimeWhen - Date.now();

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
            message.guild.roles.cache
              .get(role.id)
              .members.filter((member) => !member.user.bot).size
          } people.
`
        );
      });
      message.reply(`We have ${message.member.guild.memberCount} members in total. 
${memberCountMessage} 
`);

      break;

    // Counts the members in spesified role. Has issues.
    case messageFirstWord === "!list" && isMod:
      const mentionedRolesMap = message.mentions.roles;
      mentionedRolesMap.map((values, keys) => {
        var memberList = "";
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

    // Adds several users to a channel.
    case messageFirstWord === "!add" && isMod:
      var privateChannel = await functions.findChannel(
        message,
        notificationChannelName
      );

      const mentionedMembersMap = message.mentions.members;

      // To where?
      message.reply(functions.randomText("add.where", {}));

      var filter = (m) => {
        return m.author.id === message.author.id;
      };

      var collector = message.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1,
      });

      collector.on("collect", async (channel) => {
        var foundChannel = await functions.findChannel(
          message,
          functions.discordStyleProjectName(channel.content)
        );
        if (foundChannel) {
          mentionedMembersMap.map((value, key) => {
            foundChannel.permissionOverwrites.edit(key, {
              VIEW_CHANNEL: true,
            });

            message.reply(
              functions.randomText("add.addedPrompt", {
                user: value.user.id,
                channel: foundChannel.id,
              })
            );

            privateChannel.send(
              functions.randomText("add.addedPrompt", {
                user: value.user.id,
                channel: foundChannel.id,
              })
            );
          });
        } else {
          message.guild.channels
            .create(functions.discordStyleProjectName(channel.content), {
              type: "GUILD_TEXT",
              permissionOverwrites: [
                {
                  id: message.guild.id,
                  deny: [Permissions.FLAGS.VIEW_CHANNEL],
                },
              ],
            })
            .then((createdChannel) => {
              let category = message.guild.channels.cache.find(
                (c) => c.name == projectsCategory && c.type == "GUILD_CATEGORY"
              );

              if (!category) throw new Error("Category channel does not exist");
              createdChannel.setParent(category.id);

              message.reply(
                functions.randomText("channelCreatedWOAdd", {
                  createdChannel: createdChannel,
                })
              );

              privateChannel.send(
                functions.randomText("channelCreatedWOAdd", {
                  createdChannel: createdChannel,
                })
              );

              mentionedMembersMap.map((value, key) => {
                createdChannel.permissionOverwrites.edit(key, {
                  VIEW_CHANNEL: true,
                });

                message.reply(
                  functions.randomText("add.addedPrompt", {
                    user: value.user.id,
                    channel: createdChannel.id,
                  })
                );

                privateChannel.send(
                  functions.randomText("add.addedPrompt", {
                    user: value.user.id,
                    channel: createdChannel.id,
                  })
                );
              });
            });
        }

        channel.reply(functions.randomText("requestCompleted", {}));
      });

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
      if (foundChannel)
        message.reply(
          functions.randomText("isThere.yes", { foundChannel: foundChannel.id })
        );
      else message.reply(functions.randomText("isThere.no", {}));
      break;

    // Add me to this channel. "!addme channel-name"
    case messageFirstWord === "!addme" && isMod:
      var privateChannel = await functions.findChannel(
        message,
        notificationChannelName
      );

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
          var filter = (reaction, user) => {
            return (
              reaction.emoji.name === "👍" && user.id === message.author.id
            );
          };
          var collector = replyMessage.createReactionCollector({
            filter,
            time: 100000,
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

              message.channel.send(
                functions.randomText("channelExisted", {
                  user: message.author.id,
                  project: foundChannel.id,
                })
              );

              privateChannel.send(
                functions.randomText("channelExisted", {
                  user: message.author.id,
                  project: foundChannel.id,
                })
              );
            } else {
              message.guild.channels
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
                .then((createdChannel) => {
                  let category = message.guild.channels.cache.find(
                    (c) =>
                      c.name == projectsCategory && c.type == "GUILD_CATEGORY"
                  );

                  if (!category)
                    throw new Error("Category channel does not exist");
                  createdChannel.setParent(category.id);

                  message.channel.send(
                    functions.randomText("channelCreated", {
                      createdChannel: createdChannel.id,
                      user: message.author.id,
                    })
                  );

                  privateChannel.send(
                    functions.randomText("channelCreated", {
                      createdChannel: createdChannel.id,
                      user: message.author.id,
                    })
                  );
                })
                .catch(console.error);
            }
          });
        });

      break;
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
