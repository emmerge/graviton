Graviton = {
  Model: Model,
  Relation: Relation,
  ManyRelation: ManyRelation,
  _collections: {}
};

/**
 *
 * Mongo.Collection.prototype
 *
 */

// all() convenience method == find().fetch()
Mongo.Collection.prototype.all = ManyRelation.prototype.all;

// build an instance of this collections model type but do not save it to the db
// returns the built model.
Mongo.Collection.prototype.build = function(obj) {
  if (!_.isObject(obj)) obj = {};
  var mdl = this._graviton.model(obj);
  if (obj._id) {
    mdl._id = obj._id;
  }
  return mdl;
};

// does an insert but builds a model first, returns the model instead of an id
Mongo.Collection.prototype.create = function(obj, callback) {
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

Graviton.unsetProperty = function(obj, key) {
  if (!key) throw new Error("Cannot unsetProperty with no key specified");
  var arr = key.split(".");
  while (obj && arr.length > 1) {
    key = arr.shift();
    if (_.isUndefined(obj[key]))
      return;  // The nested key can't possibly exist, it is already unset
    obj = obj[key];
  }
  if (arr.length == 1) {
    delete obj[arr[0]];
    return;
  }
};

// currently mongo sanitize causes ambiguous / non-unique keys for some inputs such as...
// '$#foo' vs '#foo'
// 'foo@.bar' vs 'foo.@bar'
// 'foo..bar' vs 'foo@bar'
// TODO: refactor to make non-ambiguous / unique keys - probably incorporating some other special characters
Graviton.mongoSanitize = function(str) {
  if (/^\#/.test(str)) {
    str = '##'+str.substr(1);
  }
  if (/^\$/.test(str)) {
    str = '#'+str.substr(1);
  }
  if (/\@/.test(str)) {
    str = str.replace(/\@/g, '@@');
  }
  if (/\./.test(str)) {
    str = str.replace(/\./g, '@');
  }
  return str;
};

Graviton.reverseMongoSanitize = function(sanitizedString) {
  if (_.isString(sanitizedString)) {
    // first replace all singular @ symbols (in js regex that means @ not followed by @ and proceeded by a the beginning of the string or by @)
    return sanitizedString.replace(/(^|[^@])@(?!@)/g,'$1.')
      // then replace @@
      .replace(/@@/g,'@')
      // then replace starts with # (not followed by another #)
      .replace(/^\#(?!\#)/,'$')
      // then replace starts with ##
      .replace(/^\#\#/,'#');
  }
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

/**
 * Declare new collections of models
 * @param {Object} options contain the relations etc; optional.
 * @param {Object} options.collection contains options for the collection; optional.
 */
Graviton.define = function(collectionName, options) {
  if (!options) options = {};
  var collectionOptions = options.collection || {};

  var relations = _.pick(options, Relation.typeNames());

  options = _.pick(options,
    'persist', // if false, is backed by a local collection only
    'modelCls', // either model constructor or object containing model constructors
    'defaultType', // used only when modelCls is an object
    'typeAttribute', // attribute to use for type instead of _type
    'registerCollection', // if true, saves this collection in Gravition._collections[collectionName]
    'timestamps',
    'name'
  );

  _.defaults(options, {
    persist: true,
    registerCollection: true
  });

  options.relations = relations;

  options.model = function(obj) {
    var Cls = getModelCls(obj, options);
    return new Cls(collection, obj);
  };

  var collection;

  if (collectionName === 'users') {
    collection = Meteor.users;
  } else {
    var colName = (options.persist) ? collectionName : null;

    collectionOptions = _.extend( {}, collectionOptions, { transform: options.model } );
    collection = new Mongo.Collection(colName, collectionOptions);

    // uses collection-hooks package
    if (Meteor.isServer && options.timestamps && collection.before) {
      collection.before.insert(function(userId, doc) {
        var now = +new Date(); // number
        doc.createdAt = now;
        doc.updatedAt = now;
      });
      collection.before.upsert(function(userId, selector, modifier, options) {
        var now = +new Date(); // number
        Graviton.setProperty(modifier, '$setOnInsert.createdAt', now);
        Graviton.setProperty(modifier, '$set.updatedAt', now);
      });
      collection.before.update(function(userId, doc, fieldNames, modifier, options) {
        var now = +new Date(); // number
        Graviton.setProperty(modifier, '$set.updatedAt', now);
      });
    }
  }

  if (options.registerCollection) {
    this._collections[collectionName] = collection;
  }
  collection._graviton = options;

  return collection;
};

Graviton.registerCollection = function(collection) {
  if (collection && collection instanceof Mongo.Collection && collection._name)
    this._collections[collection._name] = collection;
};

// alias
Graviton.defineCollection = Graviton.define;


