const fs = require('node:fs');
const path = require('node:path');
const fileWatcher = require('./FileWatcher');

module.exports = reloader;

function reloader(appPath, initFn) {
  if (!path.isAbsolute(appPath)) {
    throw new Error('Reloader requires an absolute path to module');
  }

  let appModule = null;
  let appInstance = null;

  appModule = require(appPath);
  if (initFn) {
    appInstance = initFn(appModule);
  } else {
    appInstance = appModule;
  }

  if (!process.env.DERBY_HMR) {
    // return un-proxied appInstance
    // if DERBY_HMR is not enabled
    return appInstance;
  }

  const filepath = require.resolve(appPath);
  const resolvedPath = path.dirname(filepath) === appPath
    ? appPath   // appPath resolves a directory, watch all
    : filepath; // appPath resolves a filename, watch file
  fileWatcher(resolvedPath);

  const handler = (req, res, next) => {
    if (!require.cache[appPath]) {
      // has been evicted form require.cache
      // ensure initalization is handled again
      appInstance = null;
    }
    if (!appInstance) {
      appModule = require(appPath);
      if (initFn) {
        appInstance = initFn(appModule);
      } else {
        appInstance = appModule;
      }
    }
    appInstance(req, res, next);
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
