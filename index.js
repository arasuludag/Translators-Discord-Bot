require("dotenv").config();
const { readdirSync } = require("fs");
const translation = require("./data.json");
const i18next = require("i18next");
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} = require("discord.js");
const { commands } = require("./!commands/exclamationCommands");
const { findChannelByID } = require("./functions");
const { deploy } = require("./deploy-commands");
const { sendEmbed } = require("./customSend");
const connectDB = require("./models/db");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Connect to MongoDB
connectDB();

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

// When we are ready, emit this.
client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  function presence() {
    client.user.setPresence({
      status: "idle",
      activities: [
        {
          name: "Translation",
          type: "WATCHING",
        },
      ],
    });
  }

  presence();
  deploy();

  setInterval(presence, 1000 * 60 * 60);
});

// Sends a welcome message to newly joined users.
client.on("guildMemberAdd", (member) => {
  member
    .send({
      embeds: [
        {
          color: process.env.EMBEDCOLOR,
          title: i18next.t("welcome.title"),
          description: i18next.t("welcome.message", {
            reception: process.env.RECEPTIONCHANNELID,
          }),
        },
      ],
    })
    .then(() => {
      sendEmbed(findChannelByID(member, process.env.LOGSCHANNELID), {
        path: "joinedServer",
        values: {
          user: member.id,
        },
      });
    })
    .catch((error) => {
      findChannelByID(member, process.env.LOGSCHANNELID).send(
        `Probably couldn't send DM to <@${member.id}> \n \n ${error}`
      );
    });
});

// Who left the server. Log it on the logs channel.
client.on("guildMemberRemove", (member) => {
  sendEmbed(findChannelByID(member, process.env.LOGSCHANNELID), {
    path: "leftServer",
    values: {
      user: member.id,
    },
  });
});

// For ! commands and funny replies.
client.on("messageCreate", async (message) => {
  await commands(message, client);
});

// If there's an error. Log it.
client.on("error", function (error) {
  console.error(`client's WebSocket encountered a connection error: ${error}`);
});

// For commands.
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content:
          "There was an error while executing this command! Contact admins if it persists.",
        ephemeral: true,
      });
    }
  } else if (interaction.isButton()) {
    try {
      const customId = interaction.customId;
      
      if (customId.startsWith("translators-addme-")) {
        const { handleAddmeButtons } = require("./buttonHandlers/addmeButtons");
        await handleAddmeButtons(interaction);
      }
      
    } catch (error) {
      console.error("Error handling button interaction:", error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "An error occurred processing this button. Please try again or contact an admin.",
            ephemeral: true,
          });
        }
      } catch (replyError) {
        console.error("Error replying to button interaction:", replyError);
      }
    }
  }
});

// Let the guild know about the crash.
process.on("uncaughtException", async (error, origin) => {
  await client.channels.cache
    .find(
      (channel) =>
        channel.id === process.env.GENERALCHANNELID && channel.type === 0
    )
    .send("https://c.tenor.com/FZfzOwrrJWsAAAAC/janet-the-good-place.gif");
  await client.channels.cache
    .find(
      (channel) =>
        channel.id === process.env.LOGSCHANNELID && channel.type === 0
    )
    .send(
      `<@&${process.env.MODROLEID}> Contact Aras about this.\n \n${error}\n \n ${origin}`
    );
  console.log(error, origin);
  // Nothing to mess up. So no need to exit.
  // process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at: ", promise, "reason: ", reason);

  client.channels.cache
    .find(
      (channel) =>
        channel.id === process.env.LOGSCHANNELID && channel.type === 0
    )
    .send(
      `<@&${process.env.MODROLEID}> Contact Aras about this.\n \n ${reason}`
    );
});

client.login(process.env.TOKEN); // Login bot using token.
