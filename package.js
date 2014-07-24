Package.describe({
  summary: "Define and use relationships between meteor collections"
});

Package.on_use(function (api, where) {
  api.use(['underscore', 'minimongo', 'async'], ['client', 'server']);
  api.add_files(['lib/relations.js', 'lib/model.js', 'graviton.js'], ['client', 'server']);

  if (typeof api.export !== 'undefined') {
    api.export("Graviton", ["client", "server"]);
  }
});

Package.on_test(function (api) {
  api.use(['graviton', 'tinytest', 'test-helpers']);

  api.add_files([
    'test/test-helpers.js',
    'test/relation-test.js',
    'test/model-test.js',
    'test/legacy-test.js'
  ], 
  ['client', 'server']);
});


