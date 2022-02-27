const { announcementsChannelName, embedColor } = require("../config.json");
const functions = require("../functions.js");

async function announcement(message) {
  {
    await functions.findChannel(message, announcementsChannelName).send({
      embeds: [
        {
          color: embedColor,
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
