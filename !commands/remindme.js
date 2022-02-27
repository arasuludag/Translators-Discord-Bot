const functions = require("../functions.js");

async function remindme(message) {
  const splitMessage = message.content
    .substring(message.content.indexOf(" ") + 1)
    .split(" | ");

  const mentionedChannel = await message.mentions.channels;

  if (
    splitMessage[0] === "!remindme" ||
    !splitMessage[1] ||
    !splitMessage[2] ||
    !mentionedChannel.keys().next().value
  ) {
    await message.reply(functions.randomText("reminder.help", {}));
    return;
  }

  const remindText = splitMessage[0];
  const unixTimeWhen = Date.parse(splitMessage[1]);

  if (isNaN(unixTimeWhen)) {
    return message.reply(functions.randomText("reminder.notADate", {}));
  }

  const differenceBetween = unixTimeWhen - Date.now();
  if (differenceBetween < 0) {
    return message.reply(functions.randomText("reminder.enteredPastDate", {}));
  }

  if (!Number.isInteger(parseInt(splitMessage[2]))) {
    return message.reply(functions.randomText("reminder.notAnInt", {}));
  }

  await message.react("⏳");

  let timeLeftTimeout = [];
  let timeCameTimeout = [];

  mentionedChannel.map(async (value, index) => {
    await value.send(
      functions.randomText(
        "reminder.initiated",
        {
          event: remindText,
          time: `<t:${unixTimeWhen / 1000}> (<t:${unixTimeWhen / 1000}:R>)`,
          before: splitMessage[2],
        },
        undefined,
        undefined,
        undefined,
        "@everyone"
      )
    );

    timeLeftTimeout[index] = setTimeout(
      () =>
        value.send(
          functions.randomText(
            "reminder.minutesLeft",
            {
              minutesBefore: splitMessage[2],
              remindText: remindText,
            },
            undefined,
            undefined,
            undefined,
            "@everyone"
          )
        ),
      differenceBetween - splitMessage[2] * 60 * 1000
    );
    timeCameTimeout[index] = setTimeout(
      () =>
        value.send(
          functions.randomText(
            "reminder.itsTime",
            {
              remindText: remindText,
            },
            undefined,
            undefined,
            undefined,
            "@everyone"
          )
        ),
      differenceBetween
    );
  });

  const filter = (reaction, user) => reaction.emoji.name === "❌" && !user.bot;

  const collector = message.createReactionCollector({
    filter,
    time: differenceBetween,
    max: 1,
  });

  collector.on("collect", async () => {
    message.react("❌");

    mentionedChannel.map(async (value, index) => {
      clearTimeout(timeLeftTimeout[index]);
      clearTimeout(timeCameTimeout[index]);

      await value.send(
        functions.randomText("reminder.canceled", {
          event: remindText,
        })
      );
    });
  });
}
exports.remindme = remindme;
