require("dotenv").config();
const i18next = require("i18next");
const translation = require("./data.json");

i18next.init({
  lng: "en",
  preload: true,
  resources: {
    en: {
      translation,
    },
  },
});

module.exports = {
  // Selects a random text from a JSON array.
  randomSend: (
    params,
    {
      path = params.path ? params.path : params,
      values = params.values ? params.values : {},
      title = params.title,
      content = params.content,
      components = params.components,
      ephemeral = params.ephemeral,
    } = {}
  ) => {
    values.returnObjects = true;
    values.interpolation = { escapeValue: false };

    const description = i18next.t(path, values)[
      Math.floor(Math.random() * i18next.t(path, values).length)
    ];

    return {
      embeds: [
        {
          color: process.env.EMBEDCOLOR,
          title: title,
          description: description,
        },
      ],
      content: content,
      components: components,
      ephemeral: ephemeral,
    };
  },

  // Getting and turning project name into Discords channel format. Ex. 'Hede Hodo' into 'hede-hodo'
  discordStyleProjectName: (project) => {
    const pName = project
      .replace(
        /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$£€%&()*+,./:;<=>?@[\]^`{|}~]/g,
        ""
      )
      .trim()
      .replace(/\s+/g, "-")
      .replace(/_/g, "-")
      .toLowerCase();

    if (pName.replace(/-/g, "").length == 0) throw "ChannelNameError";
    return pName;
  },

  // Finds channel by name.
  findChannel: (message, channelName) => {
    return message.guild.channels.cache.find(
      (channel) => channel.name === channelName && channel.type == "GUILD_TEXT"
    );
  },

  // Finds channel by ID.
  findChannelByID: (message, channelID) => {
    return message.guild.channels.cache.find(
      (channel) => channel.id === channelID && channel.type == "GUILD_TEXT"
    );
  },

  // Find category by name.
  findCategoryByName: (message, channelName) => {
    return message.guild.channels.cache.find(
      (c) => c.name == channelName && c.type == "GUILD_CATEGORY"
    );
  },
};
