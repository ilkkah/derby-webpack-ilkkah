const VirtualModulesPlugin = require('webpack-virtual-modules');
const viewCache = require('./viewCache');

module.exports = DerbyViewsPlugin;

/*
*  app = { [app name]: <path to derby app> }
*/
function DerbyViewsPlugin(appNameToPath, rootPath) {
  this.appNameToPath = appNameToPath;
  this.rootPath= rootPath || process.cwd();
}

DerbyViewsPlugin.prototype.apply = function(compiler) {
  // one view module per derby app
  const viewsSuffix = '__views.js';
  const virtualModules = new VirtualModulesPlugin({});
  virtualModules.apply(compiler);
  const { appNameToPath, rootPath } = this;
  let virtualViewFilesInitialized = false;
  compiler.hooks.compilation.tap('DerbyViewsPlugin', function(compilation) {
    // Add serialized Derby views for all apps as virtual modules.
    if (!virtualViewFilesInitialized) {
      virtualViewFilesInitialized = true;
      Object.entries(appNameToPath).forEach(([appName, requirePath]) => {
        const appPath = require.resolve(requirePath, { paths: [rootPath] });
        if (!process.env.DERBY_HMR) {
          const app = require(appPath);
          viewCache.registerApp(app);
        }
        function updateVirtualViewsFile() {
          const viewSource = viewCache.getViewsSource(appPath);
          if (viewSource) {
            const moduleFile = `${appName}${viewsSuffix}`;
            const modulePath = `/derby-webpack-virtual-fs/app-views/${moduleFile}`;
            virtualModules.writeModule(modulePath, viewSource);
          }
        }
        updateVirtualViewsFile();
        if (process.env.DERBY_HMR) {
          viewCache.addViewUpdateListener(appPath, updateVirtualViewsFile);
        }
      });
    }

    // When Webpack detects requires with partially-dynamic paths, it will
    // include all potentially matching modules as dependencies. The views
    // are required from derby/lib/App.js, so views for all apps are included
    // in all app bundles.
    //
    // This uses the optimizeChunks hook to prune non-relevant view files from
    // each app's bundle, so that each app bundle only includes its own views.
    compilation.hooks.optimizeChunks.tap(
      'DerbyViewsPlugin',
      (chunks) => {
        const chunkGraph = compilation.chunkGraph;
        for (const chunk of chunks) {
          const viewModulesForOtherApps = [];
          for (const module of chunkGraph.getChunkModules(chunk)) {
            if (module.request?.endsWith(viewsSuffix)) {
              if (!module.request.endsWith(`/${chunk.name}${viewsSuffix}`)) {
                viewModulesForOtherApps.push(module);
              }
            }
          }
          for (const moduleToRemove of viewModulesForOtherApps) {
            chunkGraph.disconnectChunkAndModule(chunk, moduleToRemove);
          }
        }
      }
    );
  });
}

