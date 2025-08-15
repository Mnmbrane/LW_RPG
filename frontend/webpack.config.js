const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
  entry: "./bootstrap.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bootstrap.js",
  },
  mode: "development",
  experiments: {
    asyncWebAssembly: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'index.html', to: 'index.html' },
        { from: 'admin.html', to: 'admin.html' },
        { from: 'styles.css', to: 'styles.css' },
        { from: 'admin.css', to: 'admin.css' },
        { from: 'admin.js', to: 'admin.js' },
        { from: '../default_profile.jpg', to: 'default_profile.jpg' }
      ]
    })
  ],
};
