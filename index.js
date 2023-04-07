const webpack = require("webpack");
const webpackMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const webpackConfig = require('./webpack.config');

function derbyWebpack(apps, rootDir, options) {
  const config = () => webpackConfig(webpack, apps, rootDir, options);

  // TODO:
  // 1. Split out a separate function for getting the base config.
  // 2. If the hotReloadMiddleware and devMiddleware are always used together
  //    and with the same config, then have one function that, given the config,
  //    returns them both together with a single underlying compiler, instead
  //    needing the cachedCompiler stuff.
  // Both of those would be breaking changes and necessitate a major version,
  // unless we first add them as separate functions in a minor version, then
  // remove the current one in a major version.
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
