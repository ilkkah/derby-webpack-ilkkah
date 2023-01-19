const { readFileSync } = require('fs');

module.exports = plugin;

// Adds on htmlDone handler to write js assets script tags to tail of html body
function plugin(app, options) {
  if (process.title === 'browser') {
    // not in server
    return;
  }
  const { derby } = app;
  const { App, util } = derby;

  app.on('htmlDone', (page) => {
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
      const manifestString = readFileSync('./public/manifest.json', 'utf-8');
      const manifest = JSON.parse(manifestString);
      ASSETS = Object.entries(manifest)
        .filter(([key]) => sourcesRe.test(key))
        .map(([_, value]) => value);
      const scriptTags = ASSETS.map(path => `<script ${scriptCrossOrigin ? 'crossorigin ' : ''}src="/${path}"></script>`)
        .join('\n');
      page.res.write(scriptTags);
    }
  
    page.res.write('<script data-derby-app-state type="application/json">');
  })
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