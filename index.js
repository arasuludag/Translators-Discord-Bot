require("dotenv").config();
const { Client, Intents, Permissions, Collection } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");

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
  member.send("Welcome to the server!");
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
        .send("Only commands allowed here!")
        .then((msg) => {
          message.delete();
          setTimeout(() => msg.delete(), 5000);
        })
        .catch(console.log("Message deletion."));
      break;

    // Manages the channel for commands by deleting the messages without 🚨 there.
    case message.channel === alertChannel && !message.author.bot:
      if (!message.content.includes("🚨"))
        message.channel
          .send("Only alerts allowed here!")
          .then((msg) => {
            message.delete();
            setTimeout(() => msg.delete(), 5000);
          })
          .catch(console.log("Message deletion."));
      break;

    // When !announcement is used, bot relays the message to announcement channel.
    case messageFirstWord === "!announcement" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
      try {
        message.guild.channels.cache
          .find((channel) => channel.name === "announcements")
          .send(message.content.substring(message.content.indexOf(" ") + 1));
      } catch {
        console.log("Announcements channel probably doesn't exist.");
      }
      break;

    // A basic reminder.
    case messageFirstWord === "!remindme" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
      try {
        message.reply("Remind you what?");

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

          text.reply(
            "When will this take place? (Ex. 01 Jan 2022 20:20 GMT or UTC+3 etc.)"
          );

          const collector = message.channel.createMessageCollector({
            filter,
            time: 60000,
            max: 1,
          });

          collector.on("collect", (when) => {
            unixTimeWhen = Date.parse(when.content);

            if (isNaN(unixTimeWhen)) {
              when.reply("That is not a date. I am cancelling your request.");
              return console.log("Someone didn't get the date right.");
            }

            when.reply(
              "How long before I should remind? (In minutes) (Ex. 20)"
            );

            const collector = message.channel.createMessageCollector({
              filter,
              time: 60000,
              max: 1,
            });

            collector.on("collect", (minutesBefore) => {
              if (!Number.isInteger(parseInt(minutesBefore.content))) {
                when.reply(
                  "That is not an integer. I am cancelling your request."
                );
                return console.log(
                  "Someone didn't get the minutes left right."
                );
              }

              differenceBetween = unixTimeWhen - Date.now();

              minutesBefore.reply("Got it.");

              setTimeout(
                () =>
                  minutesBefore.reply(
                    `${minutesBefore.content} minutes left for ${remindText}`
                  ),
                differenceBetween - minutesBefore.content * 60 * 1000
              );
              setTimeout(
                () => minutesBefore.reply(`It's time for ${remindText}`),
                differenceBetween
              );
            });
          });
        });
      } catch {
        console.log("Something went wrong with !remindme.");
      }
      break;

    // case messageFirstWord === "!stats" &&
    // message.member.roles.cache.some(role => role.name === moderatorRole):
    //   message.reply(`We have ${message.member.guild.memberCount} members, `);

    //   let guild = await message.guild.fetchMembers();
    //   let roleID = "3933783737379";
    //   let memberCount = guild.roles.get(roleID).members.size;
    //   message.channel.send(memberCount + " members have this role!");

    //   break;

    case messageFirstWord === "!add" &&
      message.member.roles.cache.some((role) => role.name === moderatorRole):
      try {
        const mentionedMembersMap = message.mentions.members;

        message.reply("To where?");

        const filter = (m) => {
          return m.author.id === message.author.id;
        };

        const collector = message.channel.createMessageCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", (channel) => {
          const discordStyleProjectName = channel.content
            .replace(/\s+/g, "-")
            .toLowerCase();
          if (
            (foundChannel = message.guild.channels.cache.find(
              (channel) => channel.name === discordStyleProjectName
            ))
          ) {
            mentionedMembersMap.map((value, key) => {
              foundChannel.permissionOverwrites.edit(key, {
                VIEW_CHANNEL: true,
              });

              message.reply(
                `Added <@${value.user.id}> to <#${foundChannel.id}> !`
              );

              privateChannel.send(
                `<@${value.user.id}> joined <#${foundChannel.id}>`
              );
            });
          } else {
            message.guild.channels
              .create(discordStyleProjectName, {
                type: "GUILD_TEXT",
                permissionOverwrites: [
                  {
                    id: message.guild.id,
                    deny: [Permissions.FLAGS.VIEW_CHANNEL],
                  },
                ],
              })
              .then((createdChannel) => {
                message.reply(`Channel created for <#${createdChannel.id}>!`);

                mentionedMembersMap.map((value, key) => {
                  createdChannel.permissionOverwrites.edit(key, {
                    VIEW_CHANNEL: true,
                  });

                  message.reply(
                    `Added <@${value.user.id}> to <#${createdChannel.id}>!`
                  );

                  privateChannel.send(
                    `<@${value.user.id}> joined <#${createdChannel.id}>`
                  );
                });
              });
          }

          channel.reply("Done.");
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

  var replyMessage;
  var projectName;

  const { commandName } = interaction;

  switch (true) {
    // Adds a user to the spesified channel. If channel doesn't exist, creates it.
    case commandName === "addme":
      projectName = interaction.options.getString("project_name");
      await interaction.reply(`Do you confirm that you work on ${projectName} and want to be added to the channel? 
    React this message with 👍 if YES.`);
      replyMessage = await interaction.fetchReply();

      const filter = (reaction, user) => {
        return reaction.emoji.name === "👍" && user.id === interaction.user.id;
      };

      try {
        const collector = replyMessage.createReactionCollector({
          filter,
          time: 100000,
        });

        collector.on("collect", (reaction, user) => {
          discordStyleProjectName = projectName
            .replace(/\s+/g, "-")
            .toLowerCase();
          if (
            (foundChannel = interaction.guild.channels.cache.find(
              (channel) => channel.name === discordStyleProjectName
            ))
          ) {
            foundChannel.permissionOverwrites.edit(interaction.user.id, {
              VIEW_CHANNEL: true,
            });

            interaction.channel.send(
              `Channel already existed, added <@${interaction.user.id}> to <#${foundChannel.id}>!`
            );

            privateChannel.send(
              `<@${interaction.user.id}> joined <#${foundChannel.id}>.`
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
                  `Channel created for <#${createdChannel.id}> and <@${interaction.user.id}> joined.`
                );

                privateChannel.send(
                  `Channel created for <#${createdChannel.id}> and <@${interaction.user.id}> joined.`
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
      discordStyleProjectName = projectName.replace(/\s+/g, "-").toLowerCase();

      if (
        (foundChannel = interaction.guild.channels.cache.find(
          (channel) => channel.name === discordStyleProjectName
        ))
      )
        interaction.reply(`Yes. There is <#${foundChannel.id}>.`);
      else interaction.reply(`I don't even know who ${projectName} is.`);
      break;

    // User can request to be added to a channel.
    case commandName === "requestadd":
      projectName = interaction.options.getString("project_name");
      await interaction.user.send(
        `Wait for approval to access ${projectName}.`
      );
      await interaction.reply({ content: "Request aquired.", ephemeral: true });

      await privateChannel.send(`<@${interaction.user.id}> wants to be added to ${projectName}.
React 👍 to approve.`);
      replyMessage = await privateChannel.lastMessage;

      const filter2 = (reaction) => reaction.emoji.name === "👍";

      try {
        const collector = replyMessage.createReactionCollector({
          filter2,
          time: 300000,
        });

        collector.on("collect", (reaction, user) => {
          discordStyleProjectName = projectName
            .replace(/\s+/g, "-")
            .toLowerCase();

          if (
            (foundProject = interaction.guild.channels.cache.find(
              (channel) => channel.name === discordStyleProjectName
            ))
          ) {
            foundProject.permissionOverwrites.edit(interaction.user.id, {
              VIEW_CHANNEL: true,
            });

            replyMessage.channel.send(
              `Channel already existed, added <@${interaction.user.id}> to <#${foundProject.id}>!`
            );
            interaction.user.send(
              `You have been added to <#${foundProject.id}>`
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
                  `Channel created for <#${createdChannel.id}>!`
                );
                interaction.user.send(
                  `You have been added to <#${createdChannel.id}>`
                );
              });
          }
        });
      } catch {
        console.log(replyMessage);
      }
      break;

    default:
      break;
  }
});

client.login(process.env.CLIENT_TOKEN); //login bot using token
