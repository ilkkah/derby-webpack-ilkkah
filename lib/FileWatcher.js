/**
 *  WATCHER for server-side changes and cache invalidation
 *  only watches paths under app path
 *  does not watch anything in node_modules/ 
 */
const chokidar = require('chokidar');
const p = require('path');

module.exports = FileWatcher;

function FileWatcher(path) {  
  const options = {ignored:['*.html']};

  const watcher = chokidar.watch(path, options);
    watcher.on('ready', function() {
    const apppath = p.resolve(path);
    watcher.on('all', function(type, subpath) {
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

FileWatcher.prototype.close = function () {
  this.watcher.close();
}
 