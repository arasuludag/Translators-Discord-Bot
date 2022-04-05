const functions = require("../functions.js");

async function announcement(message) {
  {
    await functions
      .findChannel(message, process.env.ANNOUNCEMENTSCHANNELNAME)
      .send({
        embeds: [
          {
            color: process.env.EMBEDCOLOR,
            title: "Announcement",
            description: message.content.substring(
              message.content.indexOf(" ") + 1
            ),
          },
        ],
      });
  }
}
exports.announcement = announcement;
