Package.describe({
  name: 'emmerge:graviton',
  summary: "Transform collection records into Models and define and use relationships between Meteor collections",
  git: "https://github.com/emmerge/graviton",
  version: '1.0.0'
});

Package.onUse(function(api) {

  api.versionsFrom('1.3.4');

  api.use([
    'mongo',
    'ejson',
    'underscore',
    'minimongo',
    'peerlibrary:async@0.9.2_1',
    'ecmascript'
  ]);

  api.addFiles([
    'lib/mongo-query.js',
    'lib/relations.js',
    'lib/model.js',
    'graviton.js'
  ]);

  api.export('Graviton');
});

Package.onTest(function(api) {
  api.use([
    'mongo',
    'underscore',
    'ecmascript',
    'coffeescript',
    'velocity:helpers',
    'emmerge:graviton',
    'insecure',
    'autopublish',
    'matb33:collection-hooks@0.8.1',
    'practicalmeteor:chai',
    'dispatch:mocha-browser',
    'dispatch:mocha-phantomjs@=0.1.2'
  ]);

  api.mainModule('package-tests.js');
  api.mainModule('package-tests-server.js', 'server');

});


