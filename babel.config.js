module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Force transform all classes down to ES5 prototypes for Hermes compatibility
      ['@babel/plugin-transform-classes', { "loose": true }],
      ['@babel/plugin-transform-class-properties', { "loose": true }],
      ['@babel/plugin-transform-private-methods', { "loose": true }],
      ['@babel/plugin-transform-private-property-in-object', { "loose": true }],
      'react-native-reanimated/plugin',
    ],
  };
};
