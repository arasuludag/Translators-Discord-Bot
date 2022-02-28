const { archiveCategory, logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function archive(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);

  if (message.channel.isThread()) {
    await message.author
      .send(functions.randomText("setParentError", {}))
      .catch(() => {
        console.error("Failed to send DM");
      });
    return;
  }

  for await (let i of Array.from(Array(100).keys())) {
    let isOkay = true;
    const category = functions.findCategoryByName(
      message,
      `${archiveCategory} ${i}🗑`
    );
    if (!category) continue;

    await message.channel
      .setParent(category.id, { lockPermissions: false })
      .catch(() => {
        isOkay = false;
      });

    if (isOkay) break;
  }

  await message.channel.send(
    functions.randomText("movedToWO_User", {
      channel: message.channel.id,
    })
  );

  await logsChannel.send(
    functions.randomText("movedToArchive", {
      user: message.author.id,
      channel: message.channel.id,
    })
  );
  await message.delete();
}
exports.archive = archive;
