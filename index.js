const { readdirSync } = require("fs");
const translation = require("./data.json");
const i18next = require("i18next");
const { Client, Intents, Collection } = require("discord.js");
const {
  token,
  receptionChannelID,
  generalChannelID,
  logsChannelName,
  embedColor,
} = require("./config.json");
const { commands } = require("./exclamationCommands");
const functions = require("./functions");
const { pronounRoleManager } = require("./pronounRoleManager");
const { twitterStream } = require("./twitterStream");

const myIntents = new Intents();
myIntents.add(
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILD_MEMBERS,
  Intents.FLAGS.GUILD_PRESENCES
);
const client = new Client({
  intents: myIntents,
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

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

  twitterStream(client);
});

client.on("messageReactionAdd", async (reaction, user) => {
  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      pronounRoleManager(reaction, user, true);
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      pronounRoleManager(reaction, user, false);
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
});

// Sends a welcome message to newly joined users.
client.on("guildMemberAdd", (member) => {
  member
    .send({
      embeds: [
        {
          color: embedColor,
          title: i18next.t("welcome.title"),
          description: i18next.t("welcome.message", {
            reception: receptionChannelID,
          }),
        },
      ],
    })
    .then(() => {
      functions.findChannel(member, logsChannelName).send(
        functions.randomText("joinedServer", {
          user: member.id,
        })
      );
    });
});

// Who left the server. Log it on the logs channel.
client.on("guildMemberRemove", (member) => {
  functions.findChannel(member, logsChannelName).send(
    functions.randomText("leftServer", {
      user: member.id,
    })
  );
});

client.on("messageCreate", async (message) => {
  await commands(message, client);
});

client.on("error", function (error) {
  console.error(`client's WebSocket encountered a connection error: ${error}`);
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
      content:
        "There was an error while executing this command! Contact mods if it persists.",
      ephemeral: true,
    });
  }
});

// Let the guild know about the crash.
process.on("uncaughtException", async (error) => {
  await client.channels.cache
    .find(
      (channel) =>
        channel.id === generalChannelID && channel.type == "GUILD_TEXT"
    )
    .send("https://c.tenor.com/FZfzOwrrJWsAAAAC/janet-the-good-place.gif");
  await client.channels.cache
    .find(
      (channel) =>
        channel.name === logsChannelName && channel.type == "GUILD_TEXT"
    )
    .send(`There is a crash. Contact Aras about this.\n \n${error}`);
  console.log(error);
  process.exit(1);
});

// Let the guild know about the crash.
process.on("connResetException", async (error) => {
  await client.channels.cache
    .find(
      (channel) =>
        channel.name === logsChannelName && channel.type == "GUILD_TEXT"
    )
    .send(`Something happened to the connection. \n \n${error}`);
  console.log(error);
});

client.login(token); // Login bot using token.
