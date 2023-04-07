const path = require('node:path');

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
  
  const handler = function (idStr) {
    return function (req, res, next) {
      if (!require.cache[idStr]) {
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
    };
  }

  const proxy = new Proxy(handler(require.resolve(appPath)), {
    get(_target, prop) {
      const value = appInstance[prop];
      if (value instanceof Function) {
        // any function called on proxy should be
        // invoked on current instance
        return function(...args) {
          return value.apply(appInstance, args)
        }
      }
      return value;
    }
  });

  return proxy;
}
