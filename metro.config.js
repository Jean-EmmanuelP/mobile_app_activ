const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .woff and .woff2 font files
config.resolver.assetExts.push('woff', 'woff2');

module.exports = config;