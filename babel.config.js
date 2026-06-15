module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Force hermes-v0 profile: transforms classes to ES5 and private fields
      // to WeakMap pattern - required because hermesc in RN 0.81.5 Linux does
      // not support class syntax or private fields (#x). TypeScript is stripped
      // first via babel-preset-expo's overrides before class transforms run.
      ['babel-preset-expo', { unstable_transformProfile: 'hermes-v0' }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
