module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // No react-native-reanimated/plugin here on purpose.
    // react-native-reanimated is present only as a peer dependency of
    // react-native-gesture-handler — nothing in this codebase imports
    // Reanimated or uses worklets directly. As of Reanimated 4, that
    // babel plugin requires the separate `react-native-worklets`
    // package to exist, which we don't otherwise need. If a future
    // screen actually uses Reanimated animations, install
    // `react-native-worklets` and add 'react-native-worklets/plugin'
    // (NOT 'react-native-reanimated/plugin') as the LAST plugin here.
    plugins: [],
  };
};
