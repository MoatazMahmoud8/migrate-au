const path = require('path');
const defaultTransformer = require('expo/node_modules/@expo/metro-config/babel-transformer');

const projectRoot = __dirname;
const reactNativeRoot = path.join(projectRoot, 'node_modules/react-native');
const virtualReactNativeRoot = path.join(projectRoot, '.metro-react-native');

function rewriteFilename(filename) {
  if (!filename.includes(reactNativeRoot)) {
    return filename;
  }

  return path.join(virtualReactNativeRoot, path.relative(reactNativeRoot, filename));
}

module.exports = {
  transform({ filename, options, src, plugins }) {
    return defaultTransformer.transform({
      filename: rewriteFilename(filename),
      options,
      src,
      plugins,
    });
  },
  getCacheKey: defaultTransformer.getCacheKey ? defaultTransformer.getCacheKey.bind(defaultTransformer) : undefined,
};