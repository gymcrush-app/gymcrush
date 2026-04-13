const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Uppercase .OTF (and .TTF) must be in assetExts or Metro parses fonts as JS
if (!config.resolver.assetExts.includes("OTF")) {
  config.resolver.assetExts.push("OTF");
}
if (!config.resolver.assetExts.includes("TTF")) {
  config.resolver.assetExts.push("TTF");
}

module.exports = config;