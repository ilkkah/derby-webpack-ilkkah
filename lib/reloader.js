const path = requrie('node:path');
const fs = require('node:fs');
const fileWatcher = require('./FileWatcher');

module.exports = reloader;

function reloader(apppath, initFn) {
  filepath = require.resolve(apppath)
  resolvedPath = filepath
  fileWatcher(resolvedPath);

  let m = null;
  let instance = null;

  m = require(apppath);
  if (initFn && !instance) {
    instance = initFn(m);
  } else {
    instance = m;
  }

  return (req, res, next) => {
    if (!require.cache[apppath]) {
      instance = null;
    }
    if (!instance) {
      m = require(apppath);
      if (initFn) {
        instance = initFn(m);
      } else {
        instance = m;
      }
    }
    instance(req, res, next)
  }
}
