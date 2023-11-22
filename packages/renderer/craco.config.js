/**
 * Overrides for Create React App.
 */

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  webpack: {
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
