// ThingSpeak Configuration from environment variables
// Get your Channel ID and Read API Key from https://thingspeak.com/
// Channels > My Channels > API Keys tab
const THINGSPEAK_CONFIG = {
  channelId: import.meta.env.VITE_THINGSPEAK_CHANNEL_ID,
  readApiKey: import.meta.env.VITE_THINGSPEAK_READ_API_KEY,
  // API URL template for fetching feeds
  url: (channelId, readApiKey, results) =>
    `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=${results}`,
  // Number of records to fetch (max 800 for ThingSpeak free tier)
  results: 200,
};

export default THINGSPEAK_CONFIG;
