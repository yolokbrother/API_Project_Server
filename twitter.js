const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const postTweet = async (tweetText) => {
  const tweet = await twitterClient.v2.tweet(tweetText);
  return tweet.data.id;
};

module.exports = {
  postTweet
};