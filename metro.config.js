const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workaround for React Native bundling issue
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'],
  assetExts: [...config.resolver.assetExts, 'png', 'jpg', 'jpeg', 'svg', 'gif'],
};

module.exports = config;
