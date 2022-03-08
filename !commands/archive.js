const { archiveCategory, logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function archive(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);

  if (message.channel.isThread()) {
    await message.author
      .send(functions.randomSend({ path: "setParentError" }))
      .catch(() => {
        console.error("Failed to send DM");
      });
    return;
  }

  for await (let i of Array.from(Array(100).keys())) {
    const category = functions.findCategoryByName(
      message,
      `${archiveCategory} ${i}🗑`
    );
    if (!category) continue;

    const isOkay = await message.channel
      .setParent(category.id, { lockPermissions: false })
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });

    if (isOkay) break;
  }

  await message.channel.send(
    functions.randomSend({
      path: "movedToWO_User",
      values: {
        channel: message.channel.id,
      },
    })
  );

  await logsChannel.send(
    functions.randomSend({
      path: "movedToArchive",
      values: {
        user: message.author.id,
        channel: message.channel.id,
      },
    })
  );
  await message.delete();
}
exports.archive = archive;
