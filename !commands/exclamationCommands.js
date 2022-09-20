const { add } = require("./add");
const { remove } = require("./remove");
const { moveto } = require("./moveto");
const { copyto } = require("./copyto");
const { basicMessageChecking } = require("./basicMessageChecking");

module.exports = {
  commands: async (message, client) => {
    let isMod = false;
    let messageFirstWord;
    let command = false;

    // Let's save some bandwith and CPU.
    if (message.content.startsWith("!")) {
      command = true;
      isMod = await message.member.roles.cache.some(
        (role) => role.id === process.env.MODROLEID
      );

      // Extracts the first word of message to check for commands later.
      messageFirstWord = message.content.split(" ")[0];
    }

    if (isMod && command)
      switch (true) {
        // Adds several users to several channels. !add username username channelname channelname
        case messageFirstWord === "!add":
          await add(message);
          break;

        // Removes people from several channels. !remove username username channelname channelname
        case messageFirstWord === "!remove":
          await remove(message);
          break;

        // Move message to another channel.
        case messageFirstWord === "!moveto":
          await moveto(message);
          break;

        // Copy message to another channel.
        case messageFirstWord === "!copyto":
          await copyto(message);
          break;
      }

    if (!command) await basicMessageChecking(message, client);
  },
};
