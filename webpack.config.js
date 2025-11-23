const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'content-script': './extension/content-script.tsx',
    'background': './extension/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'extension/dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      'react': path.resolve(__dirname, 'extension/node_modules/react'),
      'react-dom': path.resolve(__dirname, 'extension/node_modules/react-dom'),
      '@shared': path.resolve(__dirname, 'shared')
    }
  },
  optimization: {
    minimize: false
  },
  devtool: 'cheap-module-source-map'
};


