const { existsSync, readFileSync } = require('fs');

module.exports = plugin;

// - Adds on `htmlDone` handler to write js assets script tags to tail of html body
// - Adds stub method for `writeScripts`
function plugin(app, options) {
  if (process.title === 'browser') {
    // not in server
    return;
  }
  const { derby } = app;
  const { App, util } = derby;
  const sourcesRe = new RegExp(`(${app.name}|${app.name}_views|vendors|common|runtime).*\.js$`);

  App.prototype.writeScripts = function(backend, dir, options, cb) {
    this._autoRefresh(backend);
    if (typeof cb === 'function') {
      cb();
    }
  }

  function middlewareAssets(page) {
    const { devMiddleware } = page.res.locals.webpack;
    const jsonWebpackStats = devMiddleware.stats.toJson();
    const { assetsByChunkName } = jsonWebpackStats;
    return Object.values(assetsByChunkName)
      .flatMap(normalizeAssets)
      .filter(key => sourcesRe.test(key));
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
    if (page.res.locals.webpack) {
      assets = middlewareAssets(page);
    } else {
      assets = readManifestAssets('./public/manifest.json');
    }
    const scriptTags = assets.map(path => `<script ${scriptCrossOrigin ? 'crossorigin ' : ''}src="${path}" type="text/javascript"></script>`)
      .join('\n');
    page.res.write(scriptTags);
  });
}


function isObject(x) {
  return typeof x === 'object' && x !== null;
};

function normalizeAssets(assets) {
  if (isObject(assets)) {
    return Object.values(assets);
  }
  return Array.isArray(assets) ? assets : [assets];
}
