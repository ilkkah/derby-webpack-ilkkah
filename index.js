const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const webpackConfig = require('./webpack.config');

function derbyWebpack(apps, rootDir) {
  const config = () => webpackConfig(webpack, apps, rootDir);

  const hotReloadMiddleware = config => webpackHotMiddleware(webpack(config));
  const devMiddleware = config => webpackMiddleware(webpack(config), {
    serverSideRender: true,
    index: false,
    publicPath: config.output.publicPath,
  });

  return {
    config,
    devMiddleware,
    hotReloadMiddleware,
  }
}

module.exports = derbyWebpack;
