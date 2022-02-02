const i18next = require("i18next");
const translation = require("./data.json");
const { embedColor } = require("./config.json");

i18next.init({
  lng: "en",
  preload: true,
  resources: {
    en: {
      translation,
    },
  },
});

function handleError(message, error) {
  message.channel.send(i18next.t("error", error));
}

module.exports = {
  // Selects a random text from a JSON array.
  randomText: (path, values, title, author, iconURL, content) => {
    values.returnObjects = true;
    values.interpolation = { escapeValue: false };

    return {
      embeds: [
        {
          color: embedColor,
          title: title,
          author: {
            name: author,
            icon_url: iconURL,
          },
          description: i18next.t(path, values)[
            Math.floor(Math.random() * i18next.t(path, values).length)
          ],
        },
      ],
      content: content,
    };
  },

  // Selects a random text from a JSON array.
  randomEphemeralText: (path, values) => {
    values.returnObjects = true;
    values.interpolation = { escapeValue: false };

    return i18next.t(path, values)[
      Math.floor(Math.random() * i18next.t(path, values).length)
    ];
  },

  // Getting and turning project name into Discords channel format. Ex. 'Hede Hodo' into 'hede-hodo'
  discordStyleProjectName: (project) => {
    return project.replace(/\s+/g, "-").toLowerCase();
  },

  // Finds channel by name.
  findChannel: (message, channelName) => {
    const foundChannel = message.guild.channels.cache.find(
      (channel) => channel.name === channelName && channel.type == "GUILD_TEXT"
    );

    if (foundChannel) return foundChannel;
    else throw handleError(message, "Can't find channel. Check config file.");
  },

  // Finds channel by ID.
  findChannelByID: (message, channelID) => {
    const foundChannel = message.guild.channels.cache.find(
      (channel) => channel.id === channelID && channel.type == "GUILD_TEXT"
    );

    if (foundChannel) return foundChannel;
    else throw handleError(message, "Can't find channel. Check config file.");
  },

  // Find category by name.
  findCategoryByName: (message, channelName) => {
    const foundChannel = message.guild.channels.cache.find(
      (c) => c.name == channelName && c.type == "GUILD_CATEGORY"
    );

    if (foundChannel) return foundChannel;
    else throw handleError(message, "Can't find category. Check config file.");
  },
};
