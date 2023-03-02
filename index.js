const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const webpackConfig = require('./webpack.config');

function derbyWebpack(apps, rootDir) {
  const config = () => webpackConfig(webpack, apps, rootDir);

  const hotReloadMiddleware = resolvedConfig => webpackHotMiddleware(webpack(resolvedConfig));
  const devMiddleware = resolvedConfig => webpackMiddleware(webpack(resolvedConfig), {
    serverSideRender: true,
    index: false,
    publicPath: resolvedConfig.output.publicPath,
  });

  return {
    config,
    devMiddleware,
    hotReloadMiddleware,
  }
}

module.exports = derbyWebpack;
