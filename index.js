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

client.on("messageCreate", (message) => {
  const commandsChannel = message.guild.channels.cache.find(
    (channel) => channel.name === "commands"
  );

  const alertChannel = message.guild.channels.cache.find(
    (channel) => channel.name === "sass-alert-channel"
  );

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

    case message.content.split(" ")[0] === "!announcement" &&
      message.member.permissionsIn(message.channel).has("ADMINISTRATOR"):
      try {
        message.guild.channels.cache
          .find((channel) => channel.name === "announcements")
          .send(message.content.substring(message.content.indexOf(" ") + 1));
      } catch {
        console.log("Announcements channel probably doesn't exist.");
      }
      break;

    case message.content.split(" ")[0] === "!remindme" &&
      message.member.permissionsIn(message.channel).has("ADMINISTRATOR"):
      try {
        message.channel.send("Remind you what?");

        const filter = (m) => {
          return m.author.id === message.author.id;
        };

        const collector = message.channel.createMessageCollector({
          filter,
          time: 30000,
          max: 1,
        });

        collector.on("collect", (text) => {
          const remindText = text;

          message.channel.send(
            "When will this take place? (Ex. 01 Jan 2022 20:20 GMT)"
          );

          const collector = message.channel.createMessageCollector({
            filter,
            time: 30000,
            max: 1,
          });

          collector.on("collect", (when) => {
            unixTimeZero = Date.parse(when);

            message.channel.send(
              "How long before I should remind? (In hours) (Ex. 1)"
            );

            const collector = message.channel.createMessageCollector({
              filter,
              time: 30000,
              max: 1,
            });

            collector.on("collect", (hoursBefore) => {
              differenceBetween = unixTimeZero - Date.now();

              setTimeout(
                () =>
                  message.channel.send(
                    `${hoursBefore} hours left for ${remindText}`
                  ),
                differenceBetween - hoursBefore * 60 * 60 * 1000
              );
              setTimeout(
                () => message.channel.send(`It's time for ${remindText}`),
                differenceBetween
              );
            });
          });
        });
      } catch {
        console.log("Something went wrong with !remindme.");
      }
      break;

    default:
      break;
  }
});

// Commands.
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

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
          time: 30000,
        });

        collector.on("collect", (reaction, user) => {
          discordStyleProjectName = projectName
            .replace(/\s+/g, "-")
            .toLowerCase();
          if (
            interaction.guild.channels.cache.find(
              (channel) => channel.name === discordStyleProjectName
            )
          ) {
            interaction.guild.channels.cache
              .find((channel) => channel.name === discordStyleProjectName)
              .permissionOverwrites.edit(interaction.user.id, {
                VIEW_CHANNEL: true,
              });

            interaction.channel.send(
              `Channel already existed, added ${interaction.user.username} to ${projectName}!`
            );
          } else {
            interaction.guild.channels.create(projectName, {
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
            });
            interaction.channel.send(`Channel created for ${projectName}!`);
          }

          interaction.guild.channels.cache
            .find((channel) => channel.name === "private")
            .send(`${interaction.user.username} joined ${projectName}`);
        });

        collector.on("end", (collected) => {
          replyMessage.delete();
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
        interaction.guild.channels.cache.find(
          (channel) => channel.name === discordStyleProjectName
        )
      )
        interaction.reply(`Yes. There is ${projectName}.`);
      else interaction.reply(`I don't even know who ${projectName} is.`);
      break;

    // User can request to be added to a channel.
    case commandName === "requestadd":
      projectName = interaction.options.getString("project_name");
      await interaction.user.send(
        `Wait for approval to access ${projectName}.`
      );
      await interaction.reply({ content: "Request aquired.", ephemeral: true });

      await interaction.guild.channels.cache.find(
        (channel) => channel.name === "private"
      ).send(`${interaction.user.username} wants to be added to ${projectName}.
React 👍 to approve.`);
      replyMessage = await interaction.guild.channels.cache.find(
        (channel) => channel.name === "private"
      ).lastMessage;

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
            interaction.guild.channels.cache.find(
              (channel) => channel.name === discordStyleProjectName
            )
          ) {
            interaction.guild.channels.cache
              .find((channel) => channel.name === discordStyleProjectName)
              .permissionOverwrites.edit(interaction.user.id, {
                VIEW_CHANNEL: true,
              });

            replyMessage.channel.send(
              `Channel already existed, added ${interaction.user.username} to ${projectName}!`
            );
            interaction.user.send(`You have been added to ${projectName}`);
          } else {
            interaction.guild.channels.create(projectName, {
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
            });
            replyMessage.channel.send(`Channel created for ${projectName}!`);
            interaction.user.send(`You have been added to ${projectName}`);
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
