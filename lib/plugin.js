const { existsSync, readFileSync } = require('fs');
const viewCache = require('./viewCache');

module.exports = plugin;

function plugin(AppForServer) {
  if (process.title === 'browser') {
    // not in server
    return;
  }
  const oldAppInit = AppForServer.prototype._init;
  AppForServer.prototype._init = function() {
    oldAppInit.apply(this, arguments);
    pluginForAppInstance(this);
  };
}

// - Adds on `htmlDone` handler to write js assets script tags to tail of html body
// - Adds stub method for `writeScripts`
function pluginForAppInstance(app) {
  const sourcesRe = new RegExp(`(${app.name}|${app.name}_views|vendors|common|runtime).*\.js$`);
  const hotUpdatesRe = new RegExp('\.hot-update\.js$');

  app.writeScripts = function(backend, dir, options, cb) {
    this._autoRefresh(backend);
    if (typeof cb === 'function') {
      cb();
    }
  }

  if (process.env.DERBY_HMR) {
    viewCache.registerApp(app);
    app._updateScriptViews = function() {
      viewCache.refreshApp(this);
    };
  }

  function middlewareAssets(page) {
    const { devMiddleware } = page.res.locals.webpack;
    const jsonWebpackStats = devMiddleware.stats.toJson();
    const { assetsByChunkName } = jsonWebpackStats;
    const publicPath = devMiddleware.options.publicPath ?? '/';

    return Object.values(assetsByChunkName)
    .flatMap(normalizeAssets)
    .filter(key => sourcesRe.test(key))
    .filter(fileName => !hotUpdatesRe.test(fileName))
    .map(fileName => `${publicPath}${fileName}`);
  }
  
  function readManifestAssets(filepath) {
    if (!existsSync(filepath)) {
      console.error('No manifest.json file found, and webpack middleware not available. Run pack to build static bundle before starting');
      throw new Error('Missing manifest.json');
    }
    const manifestString = readFileSync(filepath, 'utf-8');
    const assetMap = JSON.parse(manifestString);
    return Object.entries(assetMap)
      .filter(([key]) => sourcesRe.test(key))
      .map(([_, value]) => value);
  }

  app.on('htmlDone', (page) => {
    const scriptCrossOrigin = page.app.scriptCrossOrigin || false;
    const baseUrl = new URL(page.app.scriptBaseUrl);
    baseUrl.pathname = '';
    if (page.res.locals.webpack) {
      assets = middlewareAssets(page);
    } else {
      assets = readManifestAssets('./public/manifest.json');
    }
    const scriptTags = assets.map(path => {
      const scriptPath = new URL(path, baseUrl);
      return `<script ${scriptCrossOrigin ? 'crossorigin ' : ''}src="${scriptPath}" type="text/javascript"></script>`
    }).join('\n');
    page.res.write(scriptTags);
  });
}

function isObject(x) {
  return typeof x === 'object' && x !== null;
}

function normalizeAssets(assets) {
  if (isObject(assets)) {
    return Object.values(assets);
  }
  return Array.isArray(assets) ? assets : [assets];
}
