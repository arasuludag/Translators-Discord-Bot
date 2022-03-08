const { projectsCategory, logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function unarchive(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);

  if (message.channel.isThread()) {
    await message.author
      .send(functions.randomSend("setParentError"))
      .catch(() => {
        console.error("Failed to send DM");
      });
    return;
  }

  const category = functions.findCategoryByName(message, projectsCategory);

  message.channel
    .setParent(category.id, { lockPermissions: false })
    .catch((error) => {
      message.author.send("Error", error);
    });

  await message.channel.send(
    functions.randomSend({
      path: "movedFromWO_User",
      values: {
        channel: message.channel.id,
      },
    })
  );

  await logsChannel.send(
    functions.randomSend({
      path: "movedFromArchive",
      values: {
        user: message.author.id,
        channel: message.channel.id,
      },
    })
  );
  await message.delete();
}
exports.unarchive = unarchive;
