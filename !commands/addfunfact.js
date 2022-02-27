const fs = require("fs");
const functions = require("../functions.js");

async function addfunfact(message) {
  if (!message.content.split(" ")[1]) {
    await message.reply(functions.randomText("addFunfact.empty", {}));
    return;
  }

  fs.readFile("../funfacts.json", "utf8", function readFileCallback(err, data) {
    if (err) {
      console.log(err);
    } else {
      let obj = JSON.parse(data); // now it an object
      obj.funfacts.push(
        message.content.substring(message.content.indexOf(" ") + 1)
      ); // add some data
      const json = JSON.stringify(obj, null, 2); // convert it back to json
      fs.writeFile("../funfacts.json", json, "utf8", async () => {
        await message.reply(
          functions.randomText("addFunfact.added", {
            funfact: message.content.substring(
              message.content.indexOf(" ") + 1
            ),
          })
        );
      }); // write it back
    }
  });
}
exports.addfunfact = addfunfact;
