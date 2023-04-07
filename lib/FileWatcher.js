/**
 *  WATCHER for server-side changes and cache invalidation
 *  only watches paths under app path
 *  does not watch anything in node_modules/ 
 */
const chokidar = require('chokidar');
const { resolve } = require('path');

const watchers = new Map();

module.exports = function createWatcher(path) {
  if (watchers.has(path)) {
    return watchers.get(path);
  }
  const watcher = new FileWatcher(path);
  watchers.set(path, watcher);
  return watcher;
};

function FileWatcher(path) {  
  const options = {
    ignored: ['*.html'],
    useFsEvents: Boolean(JSON.parse(process.env.WATCH_FSEVENTS ?? false)),
    usePolling: Boolean(JSON.parse(process.env.WATCH_POLL ?? false)),
  };

  const root = resolve(path);

  const watcher = chokidar.watch(root, options);

  watcher
    .on('change', function (subpath) {
      const path = resolve(subpath);
      console.log('---> 🔁 WATCHER CHANGE', path);
      purgeRefs(path, root);
    })
    .on('ready', function () {
      console.log('===> 🔎 watching', root);
    })

  this.watcher = watcher;
}

FileWatcher.prototype.on = function (event, callback) {
  this.watcher.on(event, callback);
  return this;
}

FileWatcher.prototype.close = function () {
  this.watcher.close();
}

function findChildRefs(idStr) {
  const entries = Object.values(require.cache);
  return entries.filter(entry => entry.children.some(child => child.id === idStr)).map(entry => entry.id);
}

function purgeRefs(idStr, root) {
  if (!require.cache[idStr]) {
    return;
  }
  console.log('---> 🗑️ decache', idStr);
  delete require.cache[idStr];
  const markedForDecache = findChildRefs(idStr);
  markedForDecache.filter(idStr => idStr.startsWith(root))
    .forEach(idStr => {
      purgeRefs(idStr, root);
    });
}
