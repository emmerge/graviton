Graviton = {
  Model: Model,
  _collections: {}
};

Meteor.startup(function() {
  Graviton._collections.users = Meteor.users;
});

// convenience
Meteor.Collection.prototype.all = ManyRelation.prototype.all;

Meteor.Collection.prototype.build = function(obj) {
  if (!_.isObject(obj)) obj = {};
  var mdl = this._graviton.model(obj);
  mdl._id = obj._id;
  return mdl;
};

// does an insert but builds a model first, returns the model instead of an id
Meteor.Collection.prototype.create = function(obj, callback) {
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

Graviton.isModel = isModel;

var getModelCls = function(obj, options) {
  if (_.isFunction(options.modelCls)) return options.modelCls;
  if (_.isObject(options.modelCls)) {
    var type = ((options.typeAttribute) ? obj[options.typeAttribute] : obj._type) || options.defaultType;
    if (type) {
      return options.modelCls[type];
    }
  }
  return Graviton.Model;
};

// use this to declare new models
// options contain the relations etc.
Graviton.define = function(collectionName, options) {
  var relations = _.pick(options,
    'belongsTo',
    'belongsToMany',
    'hasOne',
    'hasMany',
    'embeds',
    'embedsMany'
  );

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

  var collection = new Meteor.Collection(colName, {
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
      doc.updatedAt = now;
    });
  }

  this._collections[collectionName] = collection;
  collection._graviton = options;

  return collection;
};

// alias
Graviton.defineCollection = Graviton.define;


