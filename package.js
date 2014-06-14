Package.describe({
  summary: "Define and use relationships between meteor collections"
});

Package.on_use(function (api, where) {
  api.use(["underscore"], ["client", "server"]);
  api.add_files(['lib/model.js', 'lib/relations.js', 'graviton.js'], ['client', 'server']);

  if (typeof api.export !== 'undefined') {
    // api.export("Model", ["client", "server"]);
    api.export("Graviton", ["client", "server"]);
  }
});

Package.on_test(function (api) {
  api.use(['graviton', 'tinytest', 'test-helpers']);

  api.add_files('test/graviton-test.js', ['client', 'server']);
});


