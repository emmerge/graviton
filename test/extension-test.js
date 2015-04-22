var InnerModel = Graviton.Model.extend({}, {
  naturalProtoFunction: function() {
    return 'inner natural proto';
  }
});

InnerModel.prototype.extendedProtoFunction = function() {
  return 'inner extended proto';
};

var MiddleModel = Graviton.Model.extend({}, {
  middleNaturalProtoFunction: function() {
    return 'middle natural proto';
  }
});

MiddleModel.prototype.middleExtendedProtoFunction = function() {
  return 'middle extended proto';
};

var Inner = Graviton.define('inner', { modelCls: InnerModel });

var ExtendsMultipleModel = InnerModel.extend(MiddleModel).extend({}, {
  outerProto: function() { return 'outer natural proto'; }
});

var ExtendsMultipleCollection = Graviton.define('extends_multiple', { modelCls: ExtendsMultipleModel });


/**
 * Test that basic model.extend keeps the prototype functions of the model being extended... even if they were extensions after creation
 */
Tinytest.add("Model Extension - (no extension) natural and extended prototype", function(test) {
  var o = Inner.build();

  test.isTrue(_.isFunction(o.naturalProtoFunction), 'naturalProtoFunction expected to be a function');
  test.equal(o.naturalProtoFunction(), 'inner natural proto', 'naturalProtoFunction should return what we expect');

  test.isTrue(_.isFunction(o.extendedProtoFunction), 'extendedProtoFunction expected to be a function');
  test.equal(o.extendedProtoFunction(), 'inner extended proto', 'extendedProtoFunction should return what we expect');
});

/**
 * Test that tiered model.extend keeps the prototype functions of the model being extended... even if they were extensions after creation
 */
Tinytest.add("Model Extension - (tiered extension) natural and extended prototype", function(test) {
  var o = ExtendsMultipleCollection.build();

  test.isTrue(_.isFunction(o.naturalProtoFunction), 'naturalProtoFunction expected to be a function');
  test.equal(o.naturalProtoFunction(), 'inner natural proto', 'naturalProtoFunction should return what we expect');

  test.isTrue(_.isFunction(o.extendedProtoFunction), 'extendedProtoFunction expected to be a function');
  test.equal(o.extendedProtoFunction(), 'inner extended proto', 'extendedProtoFunction should return what we expect');

  test.isTrue(_.isFunction(o.middleNaturalProtoFunction), 'middleNaturalProtoFunction expected to be a function');
  test.equal(o.middleNaturalProtoFunction(), 'middle natural proto', 'middleNaturalProtoFunction should return what we expect');

  test.isTrue(_.isFunction(o.middleExtendedProtoFunction), 'middleExtendedProtoFunction expected to be a function');
  test.equal(o.middleExtendedProtoFunction(), 'middle extended proto', 'middleExtendedProtoFunction should return what we expect');
});