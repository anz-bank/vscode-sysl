/**
 * Overrides for Create React App.
 */

const path = require(`path`);
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  webpack: {
    alias: {
      react: path.resolve("../../node_modules/react"),
      "react-dom": path.resolve("../../node_modules/react-dom"),
      gojs: path.resolve("../../node_modules/gojs"),
      "@material-ui": path.resolve("../../node_modules/@material-ui"),
    },
    configure: {
      output: {
        filename: "static/js/main.js",
      },
      optimization: {
        runtimeChunk: false,
        splitChunks: {
          chunks(chunk) {
            return false;
          },
        },
      },
    },
    plugins: [
      new MiniCssExtractPlugin({
        // TODO: Don't also output main.[hash].css.
        filename: "static/css/[name].css",
        chunkFilename: "static/css/[id].css",
      }),
    ],
  },
};
