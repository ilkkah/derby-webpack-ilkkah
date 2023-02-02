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
  const sourcesRe = new RegExp(`(${app.name}|vendors|common|runtime)\.js$`);

  App.prototype.writeScripts = function(backend, dir, options, cb) {
    // no-op function
    if (typeof cb === 'function') {
      cb();
    }
  }

  app.on('htmlDone', (page) => {
    const scriptCrossOrigin = page.app.scriptCrossOrigin || false;

    if (page.res.locals.webpack) {
      const { devMiddleware } = page.res.locals.webpack;
      const jsonWebpackStats = devMiddleware.stats.toJson();
      const { assetsByChunkName } = jsonWebpackStats;
      const chunkEntries = Object.values(assetsByChunkName);
      const scriptTags = chunkEntries.map(entry => normalizeAssets(entry))
        .filter(([key]) => sourcesRe.test(key))
        .flat()
        .map(path => `<script ${scriptCrossOrigin ? 'crossorigin ' : ''}src="${path}"></script>`)
        .join('\n');
      page.res.write(scriptTags);
    } else {
      // write from manifest for static assets
      if (!existsSync('./public/manifest.json')) {
        console.error('No manifest.json file found, and webpack middleware not available. Run pack to build static bundle before starting');
        throw new Error('Missing manifest.json');
      }
      const manifestString = readFileSync('./public/manifest.json', 'utf-8');
      const manifest = JSON.parse(manifestString);
      ASSETS = Object.entries(manifest)
        .filter(([key]) => sourcesRe.test(key))
        .map(([_, value]) => value);
      const scriptTags = ASSETS.map(path => `<script ${scriptCrossOrigin ? 'crossorigin ' : ''}src="${path}"></script>`)
        .join('\n');
      page.res.write(scriptTags);
    }
  });
}

let ASSETS = [];

function isObject(x) {
  return typeof x === 'object' && x !== null;
};

function normalizeAssets(assets) {
  if (isObject(assets)) {
    return Object.values(assets);
  }
  return Array.isArray(assets) ? assets : [assets];
}

function includeJsAssets(path) {
  return path.endsWith(".js") && !path.includes('hot-update');
}