require("dotenv").config();
const { ETwitterStreamEvent, TwitterApi } = require("twitter-api-v2");
const { twitterIDs, avtNewsChannelID } = require("./config.json");

const client = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function twitterStream(discordClient) {
  const newsChannel = await discordClient.channels.cache.find(
    (channel) => channel.id === avtNewsChannelID
  );

  const stream = await client.v1.stream.getStream("statuses/filter.json", {
    follow: twitterIDs,
    filter_level: "low",
  });

  // Emitted on Tweet
  stream.on(ETwitterStreamEvent.Data, async (tweet) => {
    if (tweet.user && twitterIDs.some((id) => tweet.user.id_str === id)) {
      const sentBefore = await newsChannel.messages
        .fetch({ limit: 20 })
        .then((messages) =>
          // Are there any messages that includes that ID?
          messages.some(
            (message) =>
              message.content.includes(tweet.id_str) ||
              (tweet.retweeted_status &&
                message.content.includes(tweet.retweeted_status.id_str))
          )
        );

      if (!sentBefore) {
        if (tweet.retweeted_status) {
          newsChannel.send(
            `${tweet.user.screen_name} retweeted: https://twitter.com/${tweet.retweeted_status.user.screen_name}/status/${tweet.retweeted_status.id_str}`
          );
        } else {
          newsChannel
            .send(
              `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
            )
            .then((message) => {
              if (tweet.quoted_status) {
                message.reply(
                  `${tweet.user.name} quoted this: \n https://twitter.com/${tweet.quoted_status.user.screen_name}/status/${tweet.quoted_status.id_str}`
                );
              }
            });
        }
      }
    }
  });

  // Start stream!
  await stream
    .connect({ autoReconnect: true, autoReconnectRetries: Infinity })
    .catch((error) => {
      console.log(error);
    });
}
exports.twitterStream = twitterStream;
