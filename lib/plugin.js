const { readFileSync } = require('fs');
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

  // In production, read JS bundle info from manifest.json.
  // Cache it in-memory to avoid reading from disk on each request.
  let manifestAssets;
  function readManifestAssets() {
    if (manifestAssets) {
      return manifestAssets;
    }
    const filepath = './public/manifest.json';
    let manifestString;
    try {
      manifestString = readFileSync(filepath, 'utf-8');
    } catch {
      console.error('No manifest.json file found, and webpack middleware not available. Run pack to build static bundle before starting');
      throw new Error('Missing manifest.json');
    }
    const assetMap = JSON.parse(manifestString);
    manifestAssets = Object.entries(assetMap)
      .filter(([key]) => sourcesRe.test(key))
      .map(([_, value]) => value);
    return manifestAssets;
  }

  app.on('htmlDone', (page) => {
    const scriptCrossOrigin = page.app.scriptCrossOrigin || false;

    // If scriptBaseUrl is provided, take the non-path info as the base,
    // otherwise assume root of the same host. This assumes Webpack manifest
    // assets are prefixed with '/'.
    let scriptBaseUrl;
    if (page.app.scriptBaseUrl) {
      const parsedBaseUrl = new URL(page.app.scriptBaseUrl);
      scriptBaseUrl = parsedBaseUrl.protocol + '//' + parsedBaseUrl.host;
    } else {
      scriptBaseUrl = '';
    }

    let assets;
    if (page.res.locals.webpack) {
      assets = middlewareAssets(page);
    } else {
      assets = readManifestAssets();
    }
    const scriptTags = assets.map(assetUrlPath => {
      const scriptUrl = scriptBaseUrl + assetUrlPath;
      return `<script async ${scriptCrossOrigin ? 'crossorigin ' : ''}src="${scriptUrl}" type="text/javascript"></script>`
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
