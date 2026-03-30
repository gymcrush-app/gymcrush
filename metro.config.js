const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Uppercase .OTF (and .TTF) must be in assetExts or Metro parses fonts as JS
if (!config.resolver.assetExts.includes("OTF")) {
  config.resolver.assetExts.push("OTF");
}
if (!config.resolver.assetExts.includes("TTF")) {
  config.resolver.assetExts.push("TTF");
}

module.exports = config;
