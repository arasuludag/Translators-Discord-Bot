const fs = require("fs");
const functions = require("../functions.js");

async function removefunfact(message) {
  if (!message.content.split(" ")[1]) {
    await message.reply(functions.randomText("addFunfact.empty", {}));
    return;
  }

  const splitMessage = message.content.substring(
    message.content.indexOf(" ") + 1
  );

  fs.readFile(require.resolve("../funfacts.json"), function (err, data) {
    let json = JSON.parse(data);

    json.funfacts = json.funfacts.filter(
      (funfact) => !funfact.includes(splitMessage)
    );

    const saveableJSON = JSON.stringify(json, null, 2); // convert it back to json
    fs.writeFile(
      require.resolve("../funfacts.json"),
      saveableJSON,
      "utf8",
      async () => {
        await message.reply(functions.randomText("requestCompleted", {}));
      }
    ); // write it back
  });
}
exports.removefunfact = removefunfact;
