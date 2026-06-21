const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/assets', to: 'assets' },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 8080,
    hot: true,
  },
  mode: 'development',
};
