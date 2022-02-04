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
    var timeLimit = 300000000;
    if (interaction.options.getInteger("time_limit")) {
      timeLimit = interaction.options.getInteger("time_limit") * 60 * 1000;
    }
    await interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
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

        var resultsShown = false;
        var thumbsUp = 0;
        var thumbsDown = 0;
        var maybe = 0;
        var optionalBulb = 0;

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

        var collector = replyMessage.createReactionCollector({
          filter,
          time: timeLimit,
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
              results({
                yes: thumbsUp,
                no: thumbsDown,
                maybe: maybe,
                optionalBulb: optionalBulb,
              });
          }
        });

        collector.on("end", () => {
          if (!resultsShown)
            results({
              yes: thumbsUp,
              no: thumbsDown,
              maybe: maybe,
              optionalBulb: optionalBulb,
            });
        });

        function results(results) {
          resultsShown = true;
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
