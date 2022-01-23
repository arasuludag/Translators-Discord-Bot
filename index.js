require("dotenv").config();
const translation = require("./data.json");
const i18next = require("i18next");
const { Client, Intents, Permissions, Collection } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");

i18next.init({
  lng: "en",
  preload: true,
  resources: {
    en: {
      translation,
    },
  },
});

function randomText(path, values) {
  values["returnObjects"] = true;

  return i18next.t(path, values)[
    Math.floor(Math.random() * i18next.t(path, values).length)
  ];
}

// Getting and turning project name into Discords channel format. Ex. 'Hede Hodo' into 'hede-hodo'
var projectName;
const discordStyleProjectName = (project) => {
  return project.replace(/\s+/g, "-").toLowerCase();
};

const commands = [
  new SlashCommandBuilder()
    .setName("addme")
    .setDescription("Adds user to a project.")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project. Beware of typos.")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("isthere")
    .setDescription("Is there a project with this name")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("requestadd")
    .setDescription("Request admins to add you to a certain project.")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project")
        .setRequired(true)
    ),
  new SlashCommandBuilder().setName("funfact").setDescription("A funfact."),
  new SlashCommandBuilder()
    .setName("available")
    .setDescription("Any available languages")
    .addRoleOption((option) =>
      option.setName("language").setDescription("A language").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Make a suggestion to mods.")
    .addStringOption((option) =>
      option
        .setName("suggestion")
        .setDescription("Type here.")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "9" }).setToken(process.env.CLIENT_TOKEN);

// Role name of a moderator.
const moderatorRole = process.env.MODROLE;
const projectsCategory = process.env.PROJECTSCATEGORY;

rest
  .put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  )
  .then(() => console.log("Successfully registered application commands."))
  .catch(console.error);

const myIntents = new Intents();
myIntents.add(
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS
);
const client = new Client({ intents: myIntents });

client.on("ready", () => {
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
  member.send(i18next.t("welcomeMessage"));
});

client.on("messageCreate", async (message) => {
  // Finds the required channels in Guild.
  const commandsChannel = message.guild.channels.cache.find(
    (channel) => channel.name === "commands"
  );

  const alertChannel = message.guild.channels.cache.find(
    (channel) => channel.name === "sass-alert-channel"
  );

  const privateChannel = message.guild.channels.cache.find(
    (channel) => channel.name === "private"
  );

  // Extracts the first word of message to check for commands later.
  messageFirstWord = message.content.split(" ")[0];

  switch (true) {
    // Manages the channel for commands by deleting the messages there.
    case message.channel === commandsChannel && !message.author.bot:
      message.channel
        .send(randomText("onlyCommands", {}))
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
          .send(randomText("onlyAlerts", {}))
          .then((msg) => {
            message.delete();
            setTimeout(() => msg.delete(), 5000);
          })
          .catch(console.error);
      break;

    // When !announcement is used, bot relays the message to announcement channel.
    case messageFirstWord === "!announcement" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
      try {
        message.guild.channels.cache
          .find((channel) => channel.name === "announcements")
          .send(
            randomText("announcement", {
              announcement: message.content.substring(
                message.content.indexOf(" ") + 1
              ),
            })
          );
      } catch {
        console.log("Announcements channel probably doesn't exist.");
      }
      break;

    // A basic reminder.
    case messageFirstWord === "!remindme" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
      try {
        message.reply(randomText("reminder.remindWhat", {}));

        const filter = (m) => {
          return m.author.id === message.author.id;
        };

        const collector = message.channel.createMessageCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", (text) => {
          const remindText = text.content;

          text.reply(randomText("reminder.when", {}));

          const collector = message.channel.createMessageCollector({
            filter,
            time: 60000,
            max: 1,
          });

          collector.on("collect", (when) => {
            unixTimeWhen = Date.parse(when.content);

            if (isNaN(unixTimeWhen)) {
              when.reply(randomText("reminder.notADate", {}));
              return console.log("Someone didn't get the date right.");
            }

            when.reply(randomText("reminder.howLongBefore", {}));

            const collector = message.channel.createMessageCollector({
              filter,
              time: 60000,
              max: 1,
            });

            collector.on("collect", (minutesBefore) => {
              if (!Number.isInteger(parseInt(minutesBefore.content))) {
                when.reply(randomText("reminder.notAnInt", {}));
                return console.log(
                  "Someone didn't get the minutes left right."
                );
              }

              differenceBetween = unixTimeWhen - Date.now();

              minutesBefore.reply(randomText("requestAcquired", {}));

              setTimeout(
                () =>
                  minutesBefore.reply(
                    randomText("reminder.minutesLeft", {
                      minutesBefore: minutesBefore.content,
                      remindText: remindText,
                    })
                  ),
                differenceBetween - minutesBefore.content * 60 * 1000
              );
              setTimeout(
                () =>
                  minutesBefore.reply(
                    randomText("reminder.itsTime", {
                      remindText: remindText,
                    })
                  ),
                differenceBetween
              );
            });
          });
        });
      } catch {
        console.log("Something went wrong with !remindme.");
      }
      break;

    case messageFirstWord === "!stats" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
      var memberCountMessage = "";

      message.guild.roles.cache.forEach((role) => {
        memberCountMessage = memberCountMessage.concat(
          `${role.toString()} has ${
            message.guild.roles.cache
              .get(role.id)
              .members.filter((member) => !member.user.bot).size
          } people.`
        );
      });
      message.reply(`We have ${message.member.guild.memberCount} members in total. 
${memberCountMessage} 
`);

      break;

    case messageFirstWord === "!add" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
      try {
        const mentionedMembersMap = message.mentions.members;

        // To where?
        message.reply(randomText("add.where", {}));

        const filter = (m) => {
          return m.author.id === message.author.id;
        };

        const collector = message.channel.createMessageCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", (channel) => {
          if (
            (foundChannel = message.guild.channels.cache.find(
              (c) => c.name === discordStyleProjectName(channel.content)
            ))
          ) {
            mentionedMembersMap.map((value, key) => {
              foundChannel.permissionOverwrites.edit(key, {
                VIEW_CHANNEL: true,
              });

              message.reply(
                randomText("add.addedPrompt", {
                  user: value.user.id,
                  channel: foundChannel.id,
                })
              );

              privateChannel.send(
                randomText("add.addedPrompt", {
                  user: value.user.id,
                  channel: foundChannel.id,
                })
              );
            });
          } else {
            message.guild.channels
              .create(discordStyleProjectName(channel.content), {
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
                  (c) =>
                    c.name == projectsCategory && c.type == "GUILD_CATEGORY"
                );

                if (!category)
                  throw new Error("Category channel does not exist");
                createdChannel.setParent(category.id);

                message.reply(
                  randomText("channelCreatedWOAdd", {
                    createdChannel: createdChannel,
                  })
                );

                mentionedMembersMap.map((value, key) => {
                  createdChannel.permissionOverwrites.edit(key, {
                    VIEW_CHANNEL: true,
                  });

                  message.reply(
                    randomText("add.addedPrompt", {
                      user: value.user.id,
                      channel: createdChannel.id,
                    })
                  );

                  privateChannel.send(
                    randomText("add.addedPrompt", {
                      user: value.user.id,
                      channel: createdChannel.id,
                    })
                  );
                });
              });
          }

          channel.reply(randomText("requestCompleted", {}));
        });
      } catch {
        console.log("Problem with !add.");
      }

      break;

    default:
      break;
  }
});

// Commands.
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const privateChannel = interaction.guild.channels.cache.find(
    (channel) => channel.name === "private"
  );

  const suggestionChannel = interaction.guild.channels.cache.find(
    (channel) => channel.name === "suggestion-box"
  );

  const { commandName } = interaction;

  switch (true) {
    // Adds a user to the spesified channel. If channel doesn't exist, creates it.
    case commandName === "addme":
      projectName = interaction.options.getString("project_name");
      await interaction.reply(
        randomText("addMePrompt", { projectName: projectName })
      );
      const replyMessage = await interaction.fetchReply();

      const filter = (reaction, user) => {
        return reaction.emoji.name === "👍" && user.id === interaction.user.id;
      };

      try {
        const collector = replyMessage.createReactionCollector({
          filter,
          time: 100000,
        });

        collector.on("collect", () => {
          if (
            (foundChannel = interaction.guild.channels.cache.find(
              (channel) => channel.name === discordStyleProjectName(projectName)
            ))
          ) {
            foundChannel.permissionOverwrites.edit(interaction.user.id, {
              VIEW_CHANNEL: true,
            });

            interaction.channel.send(
              randomText("channelExisted", {
                user: interaction.user.id,
                project: foundChannel.id,
              })
            );

            privateChannel.send(
              randomText("channelExisted", {
                user: interaction.user.id,
                project: foundChannel.id,
              })
            );
          } else {
            interaction.guild.channels
              .create(projectName, {
                type: "GUILD_TEXT",
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [Permissions.FLAGS.VIEW_CHANNEL],
                  },
                  {
                    id: interaction.user.id,
                    allow: [Permissions.FLAGS.VIEW_CHANNEL],
                  },
                ],
              })
              .then((createdChannel) => {
                let category = interaction.guild.channels.cache.find(
                  (c) =>
                    c.name == projectsCategory && c.type == "GUILD_CATEGORY"
                );

                if (!category)
                  throw new Error("Category channel does not exist");
                createdChannel.setParent(category.id);

                interaction.channel.send(
                  randomText("channelCreated", {
                    createdChannel: createdChannel.id,
                    user: interaction.user.id,
                  })
                );

                privateChannel.send(
                  randomText("channelCreated", {
                    createdChannel: createdChannel.id,
                    user: interaction.user.id,
                  })
                );
              })
              .catch(console.error);
          }
        });
      } catch {
        console.log("Something wrong with addme!");
      }
      break;

    // Is there a channel with this name?
    case commandName === "isthere":
      projectName = interaction.options.getString("project_name");
      if (
        (foundChannel = interaction.guild.channels.cache.find(
          (channel) => channel.name === discordStyleProjectName(projectName)
        ))
      )
        interaction.reply(
          randomText("isThere.yes", { foundChannel: foundChannel.id })
        );
      else interaction.reply(randomText("isThere.no", {}));
      break;

    // User can request to be added to a channel.
    case commandName === "requestadd":
      projectName = interaction.options.getString("project_name");
      await interaction.user.send(
        `Wait for approval to access ${projectName}.`
      );
      await interaction.reply({
        content: randomText("requestAcquired", {}),
        ephemeral: true,
      });

      await privateChannel
        .send(
          randomText("addRequest", {
            user: interaction.user.id,
            projectName: projectName,
          })
        )
        .then((replyMessage) => {
          const filter2 = (reaction) => reaction.emoji.name === "👍";

          try {
            const collector = replyMessage.createReactionCollector({
              filter2,
              time: 300000,
            });

            collector.on("collect", () => {
              if (
                (foundChannel = interaction.guild.channels.cache.find(
                  (channel) =>
                    channel.name === discordStyleProjectName(projectName)
                ))
              ) {
                foundChannel.permissionOverwrites.edit(interaction.user.id, {
                  VIEW_CHANNEL: true,
                });

                replyMessage.channel.send(
                  randomText("channelExisted", {
                    user: interaction.user.id,
                    project: foundChannel.id,
                  })
                );
                interaction.user.send(
                  randomText("userAddNotify", {
                    user: interaction.user.id,
                    project: foundChannel.id,
                  })
                );
              } else {
                interaction.guild.channels
                  .create(projectName, {
                    type: "GUILD_TEXT",
                    permissionOverwrites: [
                      {
                        id: interaction.guild.id,
                        deny: [Permissions.FLAGS.VIEW_CHANNEL],
                      },
                      {
                        id: interaction.user.id,
                        allow: [Permissions.FLAGS.VIEW_CHANNEL],
                      },
                    ],
                  })
                  .then((createdChannel) => {
                    let category = interaction.guild.channels.cache.find(
                      (c) =>
                        c.name == projectsCategory && c.type == "GUILD_CATEGORY"
                    );

                    if (!category)
                      throw new Error("Category channel does not exist");
                    createdChannel.setParent(category.id);

                    replyMessage.channel.send(
                      randomText("channelCreated", {
                        createdChannel: createdChannel.id,
                        user: interaction.user.id,
                      })
                    );
                    interaction.user.send(
                      randomText("userAddNotify", {
                        user: interaction.user.id,
                        project: createdChannel,
                      })
                    );
                  });
              }
            });
          } catch {
            console.error;
          }
        });

      break;

    case commandName === "funfact":
      interaction.reply(`Fun fact! ${randomText("funfacts", {})}`);

      break;

    case commandName === "available":
      role = interaction.options.getRole("language");

      interaction.reply(
        randomText("available.asking", {
          user: interaction.user.id,
          role: role.id,
        })
      );

      break;

    case commandName === "suggest":
      suggestion = interaction.options.getString("suggestion");

      suggestionChannel.send(
        randomText("suggestion.personSuggests", {
          user: interaction.user.id,
          suggestion: suggestion,
        })
      );

      interaction.reply({
        content: randomText("suggestion.acquired", {}),
        ephemeral: true,
      });

      break;

    default:
      break;
  }
});

client.login(process.env.CLIENT_TOKEN); //login bot using token
