// const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');

import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

// see https://iamwebwiz.medium.com/how-to-fix-dirname-is-not-defined-in-es-module-scope-34d94a86694d
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

//module.exports = {
export default {
  entry: './src/entry.js',
  devtool: 'source-map',
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // see https://stackoverflow.com/questions/37298215/add-favicon-with-react-and-webpack
        {
          from: './src/favicon.png'
        },
      ]
    }),
    new HtmlWebpackPlugin({
      // see https://gauger.io/fonticon/
      // and https://stackoverflow.com/questions/37298215/add-favicon-with-react-and-webpack
      filename: 'index.html',
      favicon: './src/favicon.png',
      title: 'Web Audio based visualization',
      meta : {
        viewport : 'user-scalable=no, width=device-width, initial-scale=1.0',
        'apple-mobile-web-app-capable' : 'yes'
      }
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/, 
        use: [ 'style-loader', 'css-loader' ] 
      },
      { 
        test: /\.txt.gz$/,
        use: [ 'raw-loader', 'gzip-loader'  ]
      },
      {
        // See https://stackoverflow.com/questions/37671342/how-to-load-image-files-with-webpack-file-loader
        // and https://v4.webpack.js.org/loaders/file-loader/
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [ 'file-loader' ]
      }
    ]
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  // stats : 'detailed',
};
