const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const domRectReadOnlyShim = path.resolve(projectRoot, 'metro-shims/DOMRectReadOnly.js');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('./metro-transformer.js'),
};

config.resolver = {
  ...config.resolver,
  resolveRequest(context, moduleName, platform) {
    const originModulePath = context.originModulePath || '';
    const isDomRectReadOnlyRequest =
      moduleName === './DOMRectReadOnly' ||
      moduleName === '../webapis/geometry/DOMRectReadOnly' ||
      moduleName.endsWith('/DOMRectReadOnly');

    const isReactNativePrivateDomRect =
      originModulePath.includes('/node_modules/react-native/src/private/');

    if (isDomRectReadOnlyRequest && isReactNativePrivateDomRect) {
      return {
        type: 'sourceFile',
        filePath: domRectReadOnlyShim,
      };
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;