const pathsToApps = new Map();
const pathsToViewsSource = new Map();

exports.registerApp = (app) => {
  pathsToApps.set(app.filename, app);
};

exports.getViewsSource = (appPath) => {
  if (pathsToViewsSource.has(appPath)) {
    return pathsToViewsSource.get(appPath);
  } else if (pathsToApps.has(appPath)) {
    const app = pathsToApps.get(appPath);
    const viewsSource = app._viewsSource({server: false, minify: false});

    pathsToViewsSource.set(appPath, viewsSource);
    return viewsSource;
  } else {
    // TODO: Throw an error instead?
    return '';
  }
};

exports.refreshApp = (app) => {
  const appPath = app.filename;
  pathsToApps.set(appPath, app);
  // Invalidate viewsSource cache for the app.
  pathsToViewsSource.delete(appPath);
};
