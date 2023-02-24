const fs = require('node:fs');
const path = require('node:path');
const fileWatcher = require('./FileWatcher');

module.exports = reloader;

function reloader(apppath, initFn) {
  if (!path.isAbsolute(apppath)) {
    throw new Error('Reloader requires an absolute path to module');
  }

  const filepath = require.resolve(apppath);
  const resolvedPath = path.dirname(filepath) === apppath
    ? apppath   // apppath resolves a directory, whatch all
    : filepath; // apppath resolves a filename, watch file
  fileWatcher(resolvedPath);

  let m = null;
  let instance = null;

  m = require(apppath);
  if (initFn && !instance) {
    instance = initFn(m);
  } else {
    instance = m;
  }

  if (!process.env.DERBY_HMR) {
    // return un-proxied instance
    // if DERBY_HMR is not enabled
    return instance;
  }

  const handler = (req, res, next) => {
    if (!require.cache[apppath]) {
      // has been evicted form require.cache
      // ensure initalization is handled again
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
    instance(req, res, next);
  }

  const proxy = new Proxy(handler, {
    get(_target, prop) {
      const value = instance[prop];
      if (value instanceof Function) {
        // any function called on proxy should be
        // invoked on current instance
        return function(...args) {
          return value.apply(instance, args)
        }
      }
      return value;
    }
  });

  return proxy;
}
