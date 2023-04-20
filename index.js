const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const reloader = require('./lib/reloader');
const createWatcher = require('./lib/FileWatcher');

/**
 * Creates a webpack compiler, plus associated dev and hot reload middleware.
 *
 * @param {webpack.Configuration} webpackConfig
 */
exports.createMiddleware = function createMiddleware(webpackConfig) {
  const webpackCompiler = webpack(webpackConfig);

  const devMiddleware = webpackMiddleware(webpackCompiler, {
    serverSideRender: true,
    index: false,
    publicPath: webpackConfig.output.publicPath,
    headers: (req, res, _context) => {
      const origin = req.headers['origin'];
      if (!origin) return;
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('X-Derby-Webpack', 1);
    }
  });
  const hotReloadMiddleware = webpackHotMiddleware(webpackCompiler);

  return { devMiddleware, hotReloadMiddleware, webpackCompiler };
};

exports.reloader = reloader;
exports.createWatcher = createWatcher;
