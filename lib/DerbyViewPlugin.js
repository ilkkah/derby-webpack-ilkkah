const VirtualModulesPlugin = require('webpack-virtual-modules');

module.exports = DerbyViewsPlugin;

/*
*  app = { [app name]: <path to derby app> }
*/
function DerbyViewsPlugin(apps, rootPath) {
  this.apps = apps;
  this.rootPath= rootPath || process.cwd();
}

DerbyViewsPlugin.prototype.apply = function(compiler) {
  // one view module per derby app
  const viewsSuffix = '__views.js';
  const virtualModules = new VirtualModulesPlugin({});
  virtualModules.apply(compiler);
  const { apps, rootPath } = this;
  compiler.hooks.compilation.tap('DerbyViewsPlugin', function(ctx) {
    const originalNodeEnv = process.env.NODE_ENV;
    // hack to work around Derby listening for changes and holding process open
    process.env.NODE_ENV = 'production';
    Object.entries(apps).forEach(([appName, appPath]) => {
      // console.log('RESOLVE', require.resolve(appPath, { paths: [rootPath] }));
      const app = require(require.resolve(appPath, { paths: [rootPath] }));
      const viewSource = app._viewsSource({server: false, minify: false});
      const moduleFile = `${appName}${viewsSuffix}`;
      const modulePath = `./node_modules/derby/lib/${moduleFile}`;
      console.log('VIEWS', appName, appPath, '===>', modulePath);
      virtualModules.writeModule(modulePath, viewSource);
    });
    process.env.NODE_ENV = originalNodeEnv;
  });
}

