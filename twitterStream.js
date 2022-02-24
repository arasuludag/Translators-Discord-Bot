require("dotenv").config();
const Twit = require("twit");
const { avtNewsChannelName, embedColor, twitterIDs } = require("./config.json");

function twitterStream(client) {
  var T = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000,
    strictSSL: true, // optional - requires SSL certificates to be valid.
  });

  var stream = T.stream("statuses/filter", {
    follow: twitterIDs,
  });

  stream.on("tweet", function (tweet) {
    client.channels.cache
      .find(
        (channel) =>
          channel.name === avtNewsChannelName && channel.type == "GUILD_TEXT"
      )
      .send({
        embeds: [
          {
            color: embedColor,
            title: "Link",
            url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
            author: {
              name: tweet.user.name,
              icon_url: tweet.user.profile_image_url_https,
            },
            description: tweet.text,
            fields: tweet.quoted_status
              ? [
                  {
                    name: `Quoted ${tweet.quoted_status.user.name}`,
                    value: tweet.quoted_status.text,
                  },
                ]
              : undefined,
          },
        ],
        content: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
      });
  });
}
exports.twitterStream = twitterStream;
