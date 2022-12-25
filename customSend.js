require("dotenv").config();
const i18next = require("i18next");

function getEmbed(
  params,
  {
    path = params.path ? params.path : params,
    values = params.values ? params.values : {},
    title = params.title,
    content = params.content,
    components = params.components,
    ephemeral = params.ephemeral,
  } = {}
) {
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
}

module.exports = {
  // Selects a random text from a JSON array.
  replyEmbed: async (
    to,
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
    return await to
      .reply(
        getEmbed({
          path,
          values,
          title,
          content,
          components,
          ephemeral,
        })
      )
      .catch((error) => {
        console.error("Failed to reply \n" + error);
      });
  },

  sendEmbed: async (
    to,
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
    return await to
      .send(
        getEmbed({
          path,
          values,
          title,
          content,
          components,
          ephemeral,
        })
      )
      .catch((error) => {
        console.error("Failed to send \n" + error);
      });
  },

  updateEmbed: async (
    to,
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
    return await to
      .update(
        getEmbed({
          path,
          values,
          title,
          content,
          components,
          ephemeral,
        })
      )
      .catch((error) => {
        console.error("Failed to update \n" + error);
      });
  },

  getEmbed,
};
