require("dotenv").config();
const { ETwitterStreamEvent, TwitterApi } = require("twitter-api-v2");
const { twitterIDs, avtNewsChannelName } = require("./config.json");

const client = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

async function twitterStream(discordClient) {
  const newsChannel = await discordClient.channels.cache.find(
    (channel) => channel.name === avtNewsChannelName
  );

  const stream = await client.v1.stream.getStream("statuses/filter.json", {
    follow: twitterIDs,
  });

  // Assign yor event handlers
  // Emitted on Tweet
  stream.on(ETwitterStreamEvent.Data, async (tweet) => {
    const sentBefore = await newsChannel.messages
      .fetch({ limit: 100 })
      .then((messages) => {
        //Iterate through the messages here with the variable "messages".
        return messages.forEach((message) => {
          if (
            message.content.includes(tweet.id_str) ||
            (tweet.retweeted_status &&
              message.content.includes(tweet.retweeted_status.id_str))
          ) {
            return true;
          }
        });
      });

    try {
      if (!sentBefore && tweet.user) {
        if (tweet.retweeted_status) {
          await newsChannel.send(
            `${tweet.user.screen_name} retweeted: https://twitter.com/${tweet.retweeted_status.user.screen_name}/status/${tweet.retweeted_status.id_str}`
          );
        } else {
          await newsChannel
            .send(
              `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
            )
            .then(async (message) => {
              if (tweet.quoted_status) {
                await message.reply(
                  `${tweet.user.name} quoted this: \n https://twitter.com/${tweet.quoted_status.user.screen_name}/status/${tweet.quoted_status.id_str}`
                );
              }
            });
        }
      }
    } catch (error) {
      // It's fine.
    }
  });
  // Emitted only on initial connection success
  stream.on(ETwitterStreamEvent.Connected, () =>
    console.log("Stream is started.")
  );

  // Start stream!
  await stream
    .connect({ autoReconnect: true, autoReconnectRetries: Infinity })
    .catch(console.log("Couldn't connect to Twitter Stream."));
}
exports.twitterStream = twitterStream;
