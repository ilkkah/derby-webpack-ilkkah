const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

/**
 * Creates a webpack compiler, plus associated dev and hot reload middleware.
 *
 * @param {webpack.Configuration} webpackConfig
 */
exports.createWebpackCompiler = function getMiddleware(webpackConfig) {
  const webpackCompiler = webpack(webpackConfig);

  const devMiddleware = webpackMiddleware(webpackCompiler, {
    serverSideRender: true,
    index: false,
    publicPath: resolvedConfig.output.publicPath,
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
