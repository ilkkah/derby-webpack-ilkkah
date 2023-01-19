
const { WebpackDeduplicationPlugin } = require('webpack-deduplication-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const path = require('path');

const DerbyViewsPlugin = require('./lib/DerbyViewPlugin');


module.exports = (webpack, apps, rootDir) => ({
  mode: 'development',
  entry: Object.entries(apps).reduce((acc, [name, path]) => ({
    ...acc,
    [name]: [
      'webpack-hot-middleware/client',
      path,
    ],
  }), {}),
  node: {
    __dirname: true,
    __filename: true,
  },
  optimization: {
    chunkIds: 'named',
    moduleIds: 'named',
    minimize: false,
    concatenateModules: true,
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
      }
    },
  },
  output: {
    filename: '[name]-[contenthash].js',
    chunkFilename: '[id]-[chunkhash].js',
    path: path.resolve(rootDir, 'public'),
    clean: false,
    publicPath: '/',
  },
  devtool: 'source-map',
  module: {
    rules: [
      // {
      //   test: /\.ts$/,
      //   use: 'ts-loader',
      //   exclude: /node_modules/,
      // },
      // {
      //   test: /\.coffee$/,
      //   loader: "coffee-loader",
      //   exclude: /node_modules/,
      // },
    ],
  },
  plugins: [
    // order matters
    // provide plugin before hot module replacement
    // to ensure polyfills can be applied
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.title': JSON.stringify('browser'),
      'DERBY_BUNDLED_AT': (new Date()).toISOString(),
      'DERBY_SCRIPT_HASH': 'm4gic_h4$h',
      'process.browser': true,
      'process.env.LEVER_NGROK_ID': 0,
      'process.env.DEBUG_MIME': false,
    }),
    new WebpackDeduplicationPlugin({}),
    new DerbyViewsPlugin(apps),
    new WebpackManifestPlugin({ writeToFileEmit: true }),
  ],
  resolve: {
    extensions: ['...', '.coffee', '.ts'], // .coffee and .ts last so .js files in node_modules get precedence
    fallback: {
      // trailing slash required to indicate to lookup algorithm that this is not node core lib
      events: require.resolve('events/'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      racer: require.resolve('racer'),
      // below added for admin2
      // trailing slash required to indicate to lookup algorithm that this is not node core lib
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      stream: require.resolve('stream-browserify'),
      os: require.resolve('os-browserify'),
      url: require.resolve('url'),
      constants: false,
      fs: false,
      zlib: false,
      net: false,
      tls: false,
      vm: false,
    },
  },
});