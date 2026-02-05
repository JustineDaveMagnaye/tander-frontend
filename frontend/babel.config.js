module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@app': './src/app',
            '@features': './src/features',
            '@shared': './src/shared',
            '@navigation': './src/navigation',
            '@services': './src/services',
            '@store': './src/store',
            '@assets': './src/assets',
            '@config': './src/config',
          },
        },
      ],
      'react-native-reanimated/plugin',
      'react-native-worklets-core/plugin',
    ],
  };
};
