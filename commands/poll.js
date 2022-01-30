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
    ),
  async execute(interaction) {
    var timeLimit = 3000000;
    if (interaction.options.getInteger("time_limit")) {
      timeLimit = interaction.options.getInteger("time_limit") * 60 * 1000;
    }
    await interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });
    interaction.channel
      .send(
        functions.randomText("poll.itself", {
          user: interaction.user.id,
          pollText: interaction.options.getString("poll_text"),
        })
      )
      .then((replyMessage) => {
        replyMessage.react("👍");
        replyMessage.react("👎");
        replyMessage.react("🤷");
        replyMessage.react("💡");

        var resultsShown = false;
        var thumbsUp = 0;
        var thumbsDown = 0;
        var maybe = 0;
        var none = 0;

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
              none++;
              break;

            case "✅":
              results({
                yes: thumbsUp,
                no: thumbsDown,
                maybe: maybe,
                none: none,
              });
          }
        });

        collector.on("end", () => {
          if (!resultsShown)
            results({
              yes: thumbsUp,
              no: thumbsDown,
              maybe: maybe,
              none: none,
            });
        });

        function results(results) {
          resultsShown = true;
          replyMessage.reply(
            functions.randomText("poll.close", {
              yes: results.yes,
              no: results.no,
              maybe: results.maybe,
              none: results.none,
            })
          );
        }
      });
  },
};
