if (process.title === 'browser') {
  const App = require('derby/lib/App');

  App.prototype._views = function () {
    const appName = this.name;
    // This can't interpolate with a shared constant in another file, because then Webpack's
    // static analysis would treat this require as having a second dynamic path segment.
    return require(`/derby-webpack-virtual-fs/app-views/${appName}__views`);
  }
}
