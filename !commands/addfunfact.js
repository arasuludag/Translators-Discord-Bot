const fs = require("fs");
const functions = require("../functions.js");

async function addfunfact(message) {
  if (!message.content.split(" ")[1]) {
    await message.reply(functions.randomText("addFunfact.empty", {}));
    return;
  }

  fs.readFile(
    require.resolve("../funfacts.json"),
    "utf8",
    function readFileCallback(err, data) {
      if (err) {
        console.log(err);
      } else {
        let obj = JSON.parse(data); // Parse it into JSON.
        obj.funfacts.push(
          message.content.substring(message.content.indexOf(" ") + 1)
        ); // Add the data.
        const json = JSON.stringify(obj, null, 2); // Convert it back to stringified JSON.
        fs.writeFile(
          require.resolve("../funfacts.json"),
          json,
          "utf8",
          async () => {
            await message.reply(
              functions.randomText("addFunfact.added", {
                funfact: message.content.substring(
                  message.content.indexOf(" ") + 1
                ),
              })
            );
          }
        ); // Write it back.
      }
    }
  );
}
exports.addfunfact = addfunfact;
