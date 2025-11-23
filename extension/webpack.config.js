const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'content-script': './content-script.tsx',
    'background': './background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
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
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  optimization: {
    minimize: false,
    splitChunks: false // Disable code splitting to avoid CSP issues
  },
  devtool: 'cheap-module-source-map'
};
