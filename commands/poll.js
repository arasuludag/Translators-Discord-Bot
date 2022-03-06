const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll.")
    .addStringOption((option) =>
      option
        .setName("poll_text")
        .setDescription("What are you polling?")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("time_limit")
        .setDescription("When should the poll close? (In minutes)")
    )
    .addStringOption((option) =>
      option.setName("bulb_option").setDescription("An optional option.")
    ),
  async execute(interaction) {
    const timeLimit = interaction.options.getInteger("time_limit") * 60 * 1000;

    await interaction.reply({
      content: functions.randomNonEmbedText("requestAcquired", {}),
      ephemeral: true,
    });

    const bulb = interaction.options.getString("bulb_option");

    interaction.channel
      .send(
        functions.randomText("poll.itself", {
          user: interaction.user.id,
          pollText: interaction.options.getString("poll_text"),
          bulb: bulb ? `💡 for '${bulb}'` : " ",
        })
      )
      .then((replyMessage) => {
        replyMessage.react("👍");
        replyMessage.react("👎");
        replyMessage.react("🤷");
        if (bulb) replyMessage.react("💡");

        let thumbsUp = 0;
        let thumbsDown = 0;
        let maybe = 0;
        let optionalBulb = 0;

        const filter = (reaction, user) => {
          return (
            (reaction.emoji.name === "👍" ||
              reaction.emoji.name === "👎" ||
              reaction.emoji.name === "🤷" ||
              reaction.emoji.name === "💡" ||
              (reaction.emoji.name === "✅" &&
                user.id === interaction.user.id)) &&
            !user.bot
          );
        };

        const collector = replyMessage.createReactionCollector({
          filter,
          time: timeLimit,
          idle: timeLimit ? undefined : 86400000,
        });

        collector.on("collect", (reaction) => {
          switch (reaction.emoji.name) {
            case "👍":
              thumbsUp++;
              break;

            case "👎":
              thumbsDown++;
              break;

            case "🤷":
              maybe++;
              break;

            case "💡":
              optionalBulb++;
              break;

            case "✅":
              collector.stop();
          }
        });

        collector.on("end", () => {
          results({
            yes: thumbsUp,
            no: thumbsDown,
            maybe: maybe,
            optionalBulb: optionalBulb,
          });
        });

        function results(results) {
          replyMessage.reply(
            functions.randomText("poll.close", {
              yes: results.yes,
              no: results.no,
              maybe: results.maybe,
              optionalBulb: bulb ? `💡 ${results.optionalBulb}` : "",
              bulb: bulb ? bulb : "",
            })
          );
        }
      });
  },
};
