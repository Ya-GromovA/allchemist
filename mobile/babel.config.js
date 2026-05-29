module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          extensions: [".ios.js", ".android.js", ".js", ".ios.ts", ".android.ts", ".ts", ".ios.tsx", ".android.tsx", ".tsx", ".json"],
          alias: {
            "@app": "./app",
          },
        },
      ],

      // MUST be last
      "react-native-reanimated/plugin",
    ],
  };
};
