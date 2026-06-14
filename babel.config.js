module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 1. Parse and transform modern class field assignments FIRST
      ['@babel/plugin-transform-class-properties', { "loose": true }],
      ['@babel/plugin-transform-private-methods', { "loose": true }],
      ['@babel/plugin-transform-private-property-in-object', { "loose": true }],
      // 2. THEN safely convert classes down to ES5 prototypes for Hermes
      ['@babel/plugin-transform-classes', { "loose": true }],
      'react-native-reanimated/plugin',
    ],
  };
};
