const path = require('node:path');

module.exports = reloader;

function reloader(appPath, initFn) {
  if (!path.isAbsolute(appPath)) {
    throw new Error('Reloader requires an absolute path to module');
  }

  let appModule = null;
  let appInstance = null;

  function initAppInstance() {
    if (!appInstance) {
      appModule = require(appPath);
      if (initFn) {
        appInstance = initFn(appModule);
      } else {
        appInstance = appModule;
      }
    }
  }
  initAppInstance();

  if (!process.env.DERBY_HMR) {
    // return un-proxied appInstance
    // if DERBY_HMR is not enabled
    return appInstance;
  }
  
  const idStr = require.resolve(appPath);
  function reloadModuleIfNeeded() {
    if (!require.cache[idStr]) {
      // has been evicted form require.cache
      // ensure initialization is handled again
      appInstance = null;
    }
    initAppInstance();
  }
  function derbyWebpackHotReloadingMiddleware(req, res, next) {
    reloadModuleIfNeeded();
    appInstance(req, res, next);
  }

  const proxy = new Proxy(derbyWebpackHotReloadingMiddleware, {
    get(_target, prop) {
      reloadModuleIfNeeded();
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
