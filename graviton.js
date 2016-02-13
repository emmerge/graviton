Graviton = class Graviton {

  static getCollection(options) {
    var name;
    if (_.isString(options)) {
      name = options;
    } else
    if (_.isObject(options)) {
      name = options.collectionName || options.collection || options.klass || options.relationName;
    }
    if (name) {
      return Graviton._collections[name];
    }
  }

  // use a period-delimited string to access a deeply-nested object
  static getProperty(obj, key) {
    if (!key) throw new Error("Cannot getProperty with no key specified.");
    var arr = key.split(".");
    while (obj && arr.length) {
      obj = obj[arr.shift()];
    }
    if (arr.length === 0) {
      return obj;
    }
  }

  static setProperty(obj, key, val) {
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
  }

  static unsetProperty(obj, key) {
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
  }

  // currently mongo sanitize causes ambiguous / non-unique keys for some inputs such as...
  // '$#foo' vs '#foo'
  // 'foo@.bar' vs 'foo.@bar'
  // 'foo..bar' vs 'foo@bar'
  // TODO: refactor to make non-ambiguous / unique keys - probably incorporating some other special characters
  static mongoSanitize(str) {
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
  }

  static reverseMongoSanitize(sanitizedString) {
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
  }

  // Helper function to deal with objects which may have keys which are illegal in mongo
  // 1. Mongo keys cannot start with $
  // -- convert starts with $ to starts with #
  // -- also convert starts with # to starts with ## to avoid collisions
  // 2. Mongo keys cannot contain .
  // -- convert . to @
  // -- also convert @ to @@ to avoid collisions
  static sanitizeKeysForMongo(obj) {
    var nk;
    for (var k in obj) {
      if (_.isObject(obj[k])) Graviton.sanitizeKeysForMongo(obj[k]);
      nk = Graviton.mongoSanitize(k);
      if (nk !== k) {
        obj[nk] = obj[k];
        delete obj[k];
      }
    }
  }

  // declare new collections of models
  // options contain the relations etc.
  static define(collectionName, options = {}) {
    options = _.pick(options,
      'persist',            // if false, is backed by a local collection only
      'modelCls',           // either model constructor or object containing model constructors
      'defaultType',        // used only when modelCls is an object
      'typeAttribute',      // attribute to use for type instead of _type
      'registerCollection', // if true, saves this collection in Gravition._collections[collectionName]
      'timestamps',         // if true, use collection-hooks (if available) to generate createdAt and updatedAt timestamps
      'name',               // name of collection, optional
      'timestampFormat'     // set to 'number' to use old, integer timestamps
    );

    _.defaults(options, {
      persist: true,
      registerCollection: true,
      timestamps: true,
      timestampFormat: Graviton.timestampFormat
    });

    options.model = function(obj) {
      var Model = _getModelClass(obj, options);
      return new Model(collection, obj);
    };

    var collection;

    if (collectionName === 'users') {
      collection = Meteor.users;
    } else {
      var colName = (options.persist) ? collectionName : null;

      collection = new Mongo.Collection(colName, {
        transform: options.model
      });

      // uses collection-hooks package
      if (Meteor.isServer && options.timestamps && collection.before) {
        collection.before.insert(function(userId, doc) {
          var now = (options.timestampFormat == 'number') ? +new Date() : new Date();
          doc.createdAt = now;
          doc.updatedAt = now;
        });
        collection.before.upsert(function(userId, selector, modifier) {
          var now = (options.timestampFormat == 'number') ? +new Date() : new Date();
          Graviton.setProperty(modifier, '$setOnInsert.createdAt', now);
          Graviton.setProperty(modifier, '$set.updatedAt', now);
        });
        collection.before.update(function(userId, doc, fieldNames, modifier) {
          var now = (options.timestampFormat == 'number') ? +new Date() : new Date();
          Graviton.setProperty(modifier, '$set.updatedAt', now);
        });
      }
    }

    if (options.registerCollection) {
      this._collections[collectionName] = collection;
    }
    collection._graviton = options;

    return collection;
  }

  static registerCollection(collection) {
    if (collection && collection instanceof Mongo.Collection && collection._name)
      this._collections[collection._name] = collection;
  }

  // doesn't do much. here for legacy support
  static isModel(obj) {
    return obj instanceof Graviton.Model;
  }
};

// alias
Graviton.defineCollection = Graviton.define;

_.extend(Graviton, {
  MongoQuery: MongoQuery,
  MongoModifier: MongoModifier,
  Model: Model,
  Relation: Relation,
  timestampFormat: 'date', // set to 'number' for backwards compatibilty with old versions
  _collections: {}
});


// return model class given options
var _getModelClass = function(obj, options) {
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
 *
 * Mongo.Collection.prototype
 *
 */

// all() convenience method
Mongo.Collection.prototype.all = function() {
  return this.find({}).fetch();
};

// build an instance of this collections model type but do not save it to the db
// returns the built model.
Mongo.Collection.prototype.build = function(obj) {
  if (!_.isObject(obj)) obj = {};
  var mdl = this._graviton.model(obj);
  if (obj._id) {
    mdl._id = obj._id;
  }
  mdl._collection = this; // keep the collection this model came out of
  return mdl;
};

// does an insert but builds a model first, returns the model instead of an id
Mongo.Collection.prototype.create = function(obj, callback) {
  var model = this.build(obj);
  if (callback) {
    model.setId(this.insert(model.attributes, function(err) {
      callback(err, model);
    }));
  } else {
    model.setId(this.insert(model.attributes));
  }
  return model; // model will have an _id even if this is called with a callback
};
