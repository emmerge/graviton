Graviton = {
  Model: Model,
  Relation: Relation,
  ManyRelation: ManyRelation,
  _collections: {}
};

// Meteor.users is a special collection which should not be transformed. Here it is added to Graviton._collections
// so it can be referenced by other other collections without a model/transformation.
Meteor.startup(function() {
  Graviton._collections.users = Meteor.users;
});

/**
 *
 * Mongo.Collection.prototype
 *
 */

CollectionClass = (typeof Mongo !== 'undefined') ? Mongo.Collection : Meteor.Collection;

// all() convenience method == find().fetch()
CollectionClass.prototype.all = ManyRelation.prototype.all;

// build an instance of this collections model type but do not save it to the db
// returns the built model.
CollectionClass.prototype.build = function(obj) {
  if (!_.isObject(obj)) obj = {};
  var mdl = this._graviton.model(obj);
  mdl._id = obj._id;
  return mdl;
};

// does an insert but builds a model first, returns the model instead of an id
CollectionClass.prototype.create = function(obj, callback) {
  var model = this.build(obj);
  var id;
  if (callback) {
    model.setId(this.insert(model.attributes, function(err, res) {
      callback(err, model);
    }));
  } else {
    model.setId(this.insert(model.attributes));
  }
  return model;
};

/**
 *
 * Graviton
 *
 */

// use a period-delimited string to access a deeply-nested object
Graviton.getProperty = function(obj, string) {
  var arr = string.split(".");
  while (obj && arr.length) {
    obj = obj[arr.shift()];
  }
  if (arr.length === 0) {
    return obj;
  }
};

Graviton.setProperty = function(obj, key, val) {
  if (!key) throw new Error("Cannot setProperty with no key specified.");
  var arr = key.split(".");
  while (obj && arr.length > 1) {
    key = arr.shift();
    if (_.isUndefined(obj[key])) {
      obj[key] = {};
    }
    obj = obj[key];
  }
  if (arr.length === 1) {
    obj[arr[0]] = val;
    return val;
  }
};

Graviton.mongoSanitize = function(str) {
  if (/^\#/.test(str)) {
    str = '##'+str.substr(1);
  }
  if (/^\$/.test(str)) {
    str = '#'+str.substr(1);
  }
  if (/\@/.test(str)) {
    str = str.replace(/\@/g, '@@')
  }
  if (/\./.test(str)) {
    str = str.replace(/\./g, '@');
  }
  return str;
};

// Helper function to deal with objects which may have keys which are illegal in mongo
// 1. Mongo keys cannot start with $
// -- convert starts with $ to starts with #
// -- also convert starts with # to starts with ## to avoid collisions
// 2. Mongo keys cannot contain .
// -- convert . to @
// -- also convert @ to @@ to avoid collisions
Graviton.sanitizeKeysForMongo = function(obj) {
  var nk;
  for (var k in obj) {
    if (_.isObject(obj[k])) Graviton.sanitizeKeysForMongo(obj[k]);
    nk = Graviton.mongoSanitize(k);
    if (nk !== k) {
      obj[nk] = obj[k];
      delete obj[k];
    }
  }
};

Graviton.isModel = isModel;

var getModelCls = function(obj, options) {
  if (_.isFunction(options.modelCls)) return options.modelCls;
  if (_.isObject(options.modelCls)) {
    var type = ((options.typeAttribute) ? obj[options.typeAttribute] : obj._type) || options.defaultType;
    if (type) {
      if (!options.modelCls[type]) throw new Error("Model class for type '"+type+"' was not found. Can't build model.");
      return options.modelCls[type];
    }
  }
  return Graviton.Model;
};

// declare new collections of models
// options contain the relations etc.
Graviton.define = function(collectionName, options) {
  if (!options) options = {};

  var relations = _.pick(options, Relation.typeNames());

  options = _.pick(options, 
    'persist', // if false, is backed by a local collection only
    'modelCls', // either model constructor or object containing model constructors
    'defaultType', // used only when modelCls is an object
    'typeAttribute', // attribute to use for type instead of _type
    'timestamps',
    'name'
  );

  _.defaults(options, {
    persist: true
  });

  options.relations = relations;

  options.model = function(obj) {
    var Cls = getModelCls(obj, options);
    return new Cls(collection, obj);
  };

  var colName = (options.persist) ? collectionName : null;

  var collection = new CollectionClass(colName, {
    transform: options.model
  });

  // uses collection-hooks package
  if (Meteor.isServer && options.timestamps && collection.before) {
    collection.before.insert(function(userId, doc) {
      var now = +new Date;
      doc.createdAt = now;
      doc.updatedAt = now;
    });
    collection.before.update(function(userId, doc, fieldNames, modifier, options) {
      var now = +new Date;
      modifier.$set = modifier.$set || {};
      modifier.$set.updatedAt = now;
    });
  }

  this._collections[collectionName] = collection;
  collection._graviton = options;

  return collection;
};

// alias
Graviton.defineCollection = Graviton.define;


