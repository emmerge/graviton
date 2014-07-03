Graviton = {
  Model: Model,
  _collections: {}
};

Meteor.startup(function() {
  Graviton._collections.users = Meteor.users;
});

// convenience
Meteor.Collection.prototype.all = ManyRelation.prototype.all;

// does an insert but builds a model first, returns the model instead of an id
Meteor.Collection.prototype.create = function(obj, callback) {
  var model = this.build(obj);
  var id;
  if (callback) {
    model.setId(this.insert.call(this, model.attributes, function(err, res) {
      callback(err, model);
    }));
  } else {
    model.setId(this.insert.call(this, model.attributes));
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

// use this to declare new models
// options contain the relations etc.
Graviton.define = function(collectionName, options) {

  _.defaults(options, {
    persist: true
  });

  var model = function(obj) {
    var Cls = options.modelCls || Graviton.Model;
    return new Cls(collectionName, obj, options);
  };

  options.model = model;

  var colName = (options.persist) ? collectionName : null;

  var collection = new Meteor.Collection(colName, {
    transform: model
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

  collection.build = function(obj) {
    if (!_.isObject(obj)) obj = {};
    var mdl = model(obj);
    mdl._id = obj._id;
    return mdl;
  };
  this._collections[collectionName] = collection;
  collection._graviton = options;

  return collection;
};

// alias
Graviton.defineCollection = Graviton.define;
