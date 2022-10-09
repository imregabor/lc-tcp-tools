const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      // see https://gauger.io/fonticon/
      // and https://stackoverflow.com/questions/37298215/add-favicon-with-react-and-webpack
      favicon: './src/favicon.png',
      title: 'Output Management',
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
      }
    ]
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
};
