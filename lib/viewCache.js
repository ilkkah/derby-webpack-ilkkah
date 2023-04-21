/** @type {Map<string, AppCacheEntry>} */
const cache = new Map();

exports.registerApp = (app) => {
  cache.set(app.filename, new AppCacheEntry(app));
};

/**
 * @param {string} appPath
 */
exports.getViewsSource = (appPath) => {
  if (cache.has(appPath)) {
    return cache.get(appPath).getViewsSource();
  } else {
    throw new Error(`App ${appPath} wasn't registered in cache`);
  }
};

exports.refreshApp = (app) => {
  const appPath = app.filename;
  if (cache.has(appPath)) {
    cache.get(appPath).onViewUpdate();
  } else {
    throw new Error(`App ${appPath} wasn't registered in cache`);
  }
};

/** @typedef {() => void} ViewUpdateListener */

/**
 * @param {string} appPath
 * @param {ViewUpdateListener} listener
 */
exports.addViewUpdateListener = (appPath, listener) => {
  if (cache.has(appPath)) {
    cache.get(appPath).addViewUpdateListener(listener);
  } else {
    throw new Error(`App ${appPath} wasn't registered in cache`);
  }
};

class AppCacheEntry {
  constructor(app) {
    this.app = app;
    this.viewsSource = '';
    /** @type {ViewUpdateListener[]} */
    this.viewUpdateListeners = [];
  }

  getViewsSource() {
    if (!this.viewsSource) {
      this.viewsSource = this.app._viewsSource({server: false, minify: false});
    }
    return this.viewsSource;
  }

  onViewUpdate() {
    // Invalidate cached viewsSource
    this.viewsSource = '';

    for (const listener of this.viewUpdateListeners) {
      listener();
    }
  }

  /**
   * Adds a listener that will be called when the app's views are updated.
   * @param {ViewUpdateListener} listener
   */
  addViewUpdateListener(listener) {
    this.viewUpdateListeners.push(listener);
  }
}
