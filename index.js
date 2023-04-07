const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const webpackConfig = require('./webpack.config');

function derbyWebpack(apps, rootDir, options) {
  const config = () => webpackConfig(webpack, apps, rootDir, options);

  let compilerInstance;
  function compiler(resolvedConfig) {
    compilerInstance = compilerInstance ?? webpack(resolvedConfig);
    return compilerInstance;
  }

  const hotReloadMiddleware = resolvedConfig => {
    return webpackHotMiddleware(compiler(resolvedConfig));
  }
  const devMiddleware = resolvedConfig => {
    return webpackMiddleware(compiler(resolvedConfig), {
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
  }

  return {
    config,
    devMiddleware,
    hotReloadMiddleware,
  }
}

module.exports = derbyWebpack;
