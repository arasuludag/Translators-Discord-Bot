const { projectsCategory, logsChannelID } = require("../config.json");
const functions = require("../functions.js");

async function unarchive(message) {
  const logsChannel = await functions.findChannelByID(message, logsChannelID);

  const category = functions.findCategoryByName(message, projectsCategory);
  try {
    message.channel.setParent(category.id, { lockPermissions: false });
  } catch (error) {
    await message.author
      .send(functions.randomText("setParentError", {}))
      .catch(() => {
        console.error("Failed to send DM");
      });
    return;
  }

  await message.channel.send(
    functions.randomText("movedFromWO_User", {
      channel: message.channel.id,
    })
  );

  await logsChannel.send(
    functions.randomText("movedFromArchive", {
      user: message.author.id,
      channel: message.channel.id,
    })
  );
  await message.delete();
}
exports.unarchive = unarchive;
