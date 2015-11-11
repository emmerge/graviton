Package.describe({
  name: 'emmerge:graviton',
  summary: "Transform collection records into Models and define and use relationships between Meteor collections",
  git: "https://github.com/emmerge/graviton",
  version: '0.0.19'
});

Package.onUse(function(api) {

  api.versionsFrom('0.9.1');

  api.use([
    'mongo',
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
    'sanjo:jasmine@0.20.2',
    'velocity:html-reporter',
    'velocity:helpers',
    'emmerge:graviton',
    'insecure',
    'autopublish'
  ]);

  api.addFiles([
    'test/test-helpers.js',
    'test/test-model-definitions.js',
    // 'test/relation-test.js',
    // 'test/model-test.js',
    // 'test/legacy-test.js',
    // 'test/extension-test.js',
    // 'test/packages-test.js',
    // 'test/incomplete-relation-configs.js',
    // 'test/unit-test.js'
    'test/mongo-query-spec.js',
    'test/graviton-spec.js',
    'test/relation-spec.js',
    'test/model-spec.js',
    'test/mixin-spec.js'
    // 'test/test-model-definitions.js',
  ]);
});


