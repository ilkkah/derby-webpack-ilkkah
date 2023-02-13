const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const webpackConfig = require('./webpack.config');

function derbyWebpack(apps, rootDir) {
  const config = () => webpackConfig(webpack, apps, rootDir);

  const hmrConfig = webpackConfig(webpack, apps, rootDir, {hotModuleReplacement: true});
  const compiler = webpack(hmrConfig);
  const hotReloadMiddleware = () => webpackHotMiddleware(webpackCompiler);

  const devMiddleware = () => webpackMiddleware(compiler, {
    serverSideRender: true,
    index: false,
    publicPath: hmrConfig.output.publicPath,
  });

  return {
    config,
    devMiddleware,
    hotReloadMiddleware,
  }
}

module.exports = derbyWebpack;
