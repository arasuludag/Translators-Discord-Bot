const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");
const { embedColor } = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("custompoll")
    .setDescription("Create a poll.")
    .addStringOption((option) =>
      option
        .setName("poll_text")
        .setDescription("What are you polling?")
        .setRequired(true)
    )

    .addStringOption((option) =>
      option
        .setName("options")
        .setDescription("Seperate your options with '-'")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("time_limit")
        .setDescription("When should the poll close? (In minutes)")
    ),
  async execute(interaction) {
    let timeLimit = 300000000;
    if (interaction.options.getInteger("time_limit")) {
      timeLimit = interaction.options.getInteger("time_limit") * 60 * 1000;
    }
    const splitMessage = await interaction.options
      .getString("options")
      .split("-")
      .filter((n) => n);

    if (splitMessage.length > 5) {
      await interaction.reply({
        content: functions.randomEphemeralText("poll.tooMany", {}),
        ephemeral: true,
      });
      return;
    }

    const pollText = await interaction.options.getString("poll_text");

    let options = [];
    splitMessage.map((option, i) => {
      options[i] = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(i + " " + interaction.id)
          .setLabel(option)
          .setStyle("PRIMARY")
      );
    });

    const userNickname = interaction.guild.members.cache.find(
      (a) => a.user === interaction.user
    ).nickname;

    const endButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("End " + interaction.id)
        .setLabel("End Poll")
        .setStyle("DANGER")
    );

    await interaction.reply({
      components: [endButton],
      ephemeral: true,
    });

    await interaction.channel
      .send({
        embeds: [
          {
            color: embedColor,
            title: "Poll",
            author: {
              name: userNickname ? userNickname : interaction.user.username,
              icon_url: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png?size=256`,
            },
            description: pollText,
          },
        ],
        components: options,
      })
      .then(async (replyMessage) => {
        const filter = (i) => interaction.id === i.customId.split(" ")[1];
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: timeLimit,
        });

        let pollCount = [];
        let fields = [];

        collector.on("collect", async (i) => {
          let votes = Array(splitMessage.length).fill(0);
          const index = i.customId.split(" ")[0];

          if (index === "End") collector.stop();

          const found = await pollCount.find(
            (vote) => vote.userID === i.user.id
          );

          if (found) found.index = index;
          else pollCount.push({ index: index, userID: i.user.id });

          for (let vote of pollCount) {
            votes[vote.index]++;
          }

          fields = [];
          for (let index = 0; index < splitMessage.length; index++) {
            fields.push({
              name: splitMessage[index],
              value: votes[index].toString(),
              inline: true,
            });
          }

          await i.update({
            embeds: [
              {
                color: embedColor,
                title: "Poll",
                author: {
                  name: userNickname ? userNickname : interaction.user.username,
                  icon_url: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png?size=256`,
                },
                description: pollText,
                fields: fields,
              },
            ],
          });
        });

        collector.on("end", async () => {
          await replyMessage
            .edit({
              components: [],
            })
            .then(async (replyMessage) => {
              await replyMessage.reply(functions.randomText("poll.ended", {}));
            });
          await interaction.editReply({
            description: "Done.",
            components: [],
          });
        });
      });
  },
};
