/**
 *  WATCHER for server-side changes and cache invalidation
 *  only watches paths under app path
 *  does not watch anything in node_modules/ 
 */
const { resolve } = require('path');
const chokidar = require('chokidar');

const watchers = new Map();

/**
 * Returns a recursive file watcher for the given path.
 *
 * @param {string} path
 * @param {{ ignored?: string[] }} [options]
 * @returns {FileWatcher}
 */
module.exports = function createWatcher(path, options) {
  if (watchers.has(path)) {
    return watchers.get(path);
  }
  const watcher = new FileWatcher(path, options);
  watchers.set(path, watcher);
  return watcher;
};

const EVENTS = {
  decached: 'decached'
};

class FileWatcher extends chokidar.FSWatcher {
  constructor(path, options) {
    const chokidarOptions = {
      ignored: options?.ignored || ['**/*.html'],
      useFsEvents: Boolean(JSON.parse(process.env.WATCH_FSEVENTS ?? false)),
      usePolling: Boolean(JSON.parse(process.env.WATCH_POLL ?? false)),
    };
    super(chokidarOptions);
    const root = resolve(path);
    this.add(root);
    this.on('change', function (subpath) {
      setTimeout(() => {
        const path = resolve(subpath);
        const purgedIds = purgeRefs(path);
        this._emit(EVENTS.decached, purgedIds);
      }, 0);
    });
  }
}

/**
 * Finds all "parents" of the specified module, i.e. all usages of the module.
 *
 * `module.parent` only references the *first* usage of the module.
 *
 * @param {string} idStr
 * @returns {string[]} list of module ids that use the specified module
 */
function findParents(idStr) {
  const entries = Object.values(require.cache);
  return entries.filter(entry => entry.children.some(child => child.id === idStr)).map(entry => entry.id);
}

/**
 * Removes the specified module and all its "ancestors" from the module cache.
 *
 * @param {string} idStr - Initial module to purge
 * @param {string[]?} purged - Array to collect purged module ids
 * @returns {string[]} final array of purged modules ids
 */
function purgeRefs(idStr, purged = []) {
  if (!require.cache[idStr]) {
    return purged;
  }
  delete require.cache[idStr];
  purged.push(idStr);
  const markedForDecache = findParents(idStr);
  markedForDecache.forEach(idStr => {
    purgeRefs(idStr, purged);
  });
  return purged;
}
