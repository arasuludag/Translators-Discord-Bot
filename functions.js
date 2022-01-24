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
  randomText: (path, values) => {
    values["returnObjects"] = true;

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
    return message.guild.channels.cache.find(
      (channel) => channel.name === channelName
    );
  },
};
