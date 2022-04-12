const functions = require("../functions.js");

async function announcement(message) {
  {
    const description = message.content.substring(
      message.content.indexOf(" ") + 1
    );

    if (description.startsWith("!")) {
      await message.reply(functions.randomSend("enterProperName"));
      return;
    }
    await functions
      .findChannel(message, process.env.ANNOUNCEMENTSCHANNELNAME)
      .send({
        embeds: [
          {
            color: process.env.EMBEDCOLOR,
            title: "Announcement",
            description: description,
          },
        ],
      });
  }
}
exports.announcement = announcement;
