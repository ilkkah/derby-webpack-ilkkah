/**
 *  WATCHER for server-side changes and cache invalidation
 *  only watches paths under app path
 *  does not watch anything in node_modules/ 
 */
const chokidar = require('chokidar');
const resolve = require('path').resolve;
const EvenEmitter = require('events').EventEmitter;

module.exports = function createWatcher(path) {
  return new FileWatcher(path);
};

function FileWatcher(path) {  
  const options = {ignored:['*.html']};

  const watcher = chokidar.watch(path, options);

  watcher.on('ready', function() {
    const apppath = resolve(path);
    watcher.on('change', function(subpath) {
      Object.keys(require.cache).forEach(function(id) {
        // CACHE INVALIDATION
        if (id.startsWith(apppath)) {
          delete require.cache[id];
        }
      });
    });
  });

  this.watcher = watcher;
}

FileWatcher.prototype.on = function (event, callback) {
  this.watcher.on(event, callback);
  return this;
}

FileWatcher.prototype.close = function () {
  this.watcher.close();
}
