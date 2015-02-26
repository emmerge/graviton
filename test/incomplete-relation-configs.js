
/**
 * tests for relations -> getCollection()
 */

var hasInvalidCollModel = Graviton.Model.extend({
  hasMany: {
    invalidCollRelation: {
      collectionName: 'fake'
    }
  }
},{});
var hasInvalidCollCollection = Graviton.define('hicc', { modelCls: hasInvalidCollModel });


var Unregistered = new Mongo.Collection('unregistered');
var hasUnregisteredCollModel = Graviton.Model.extend({
  hasMany: {
    invalidCollRelation: {
      collectionName: 'unregistered'
    }
  }
},{});
var hasUnregisteredCollCollection = Graviton.define('hucc', { modelCls: hasUnregisteredCollModel });


var Registered = new Mongo.Collection('registered');
var hasRegisteredCollModel = Graviton.Model.extend({
  hasMany: {
    validCollRelation: {
      collectionName: 'registered',
      foreignKey: 'registeredId'
    }
  }
},{});
var hasRegisteredCollCollection = Graviton.define('hrcc', { modelCls: hasRegisteredCollModel });


Tinytest.add('Incomplete configuration - hasMany w/ undefined collection', function(test) {

  test.throws(function () {
    hasInvalidCollCollection.build({});
  }, 'A collection named \'fake\' has not been defined or registered in Graviton');

});

Tinytest.add('Incomplete configuration - hasMany w/ unregistered collection', function(test) {

  test.throws(function () {
    hasUnregisteredCollCollection.build({});
  }, 'A collection named \'unregistered\' has not been defined or registered in Graviton');

});

Tinytest.add('Configuration - hasMany w/ registered collection', function(test) {

  Graviton.registerCollection(Registered);
  hasRegisteredCollCollection.build({});

});


/**
 * Required fields in config
 */

Graviton.define('dummyCollection');

var missingFKInRelationModel = Graviton.Model.extend({
  hasMany: {
    hasManyMissingFK: {
      collectionName: 'dummyCollection'
    }
  }
},{});
var missingFieldInRelationCollection = Graviton.define('mfirc', { modelCls: missingFKInRelationModel });

Tinytest.add('Incomplete configuration - hasMany w/o foreignKey', function(test) {

  test.throws(function () {
    missingFieldInRelationCollection.build({});
  }, 'Invalid HasMany relationship configuration - `foreignKey` must be specified.');

});