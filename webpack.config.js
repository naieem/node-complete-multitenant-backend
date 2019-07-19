const path = require("path");
const nodeExternals = require('webpack-node-externals')
module.exports = {
  entry: "./app.js",
  output: {
    path: path.join(__dirname, "/bundle"),
    filename: "app.js"
  },
  target:"node",
  resolve: {
    extensions: [".js"]
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      }
    ]
  }
};
