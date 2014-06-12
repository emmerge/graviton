
Model = function(klass, obj, options) {
  options = options || {};
  this.attributes = obj;

  this._klass = Model._klasses[klass];


  if (_.isUndefined(this._klass)) throw "Can't find klass '"+klass+"'";

  if (_.isFunction(options.initialize)) {
    options.initialize.call(this, obj);
  }

  var self = this;
  _.each(options.hasMany, function(cfg, name) {
    self[name] = new HasMany(self, cfg);
  });
  _.each(options.hasOne, function(cfg, name) {
    self[name] = hasOne(self, cfg);
  });
  _.each(options.belongsTo, function(cfg, name) {
    self[name] = belongsTo(self, cfg, name);
  });
  _.each(options.belongsToMany, function(cfg, name) {
    self[name] = new BelongsToMany(self, cfg);
  });
  _.each(options.embeds, function(cfg, name) {
    self[name] = embeds(self, cfg, name);
  });
  _.each(options.embedsMany, function(cfg, name) {
    self[name] = new EmbeddedModels(self, cfg, name);
  });
  _.defaults(this.attributes, options.defaults);
  _.extend(this, options.properties);
};

Model._klasses = {};

Meteor.startup(function() {
  Model._klasses.users = Meteor.users;
});

// use a period-delimited string to access a deeply-nested object
Model.getProperty = function(obj, string) {
  var arr = string.split(".");
  while (obj && arr.length) {
    obj = obj[arr.shift()];
  }
  if (arr.length === 0) {
    return obj;
  }
};

Model.setProperty = function(obj, key, val) {
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

// use this to declare new models
// options contain the relations etc.
Model.define = function(klass, options) {

  _.defaults(options, {
    persist: true
  });

  var model = function(obj) {
    var Cls = options.modelCls || Model;
    return new Cls(klass, obj, options);
  };

  var colName = (options.persist) ? klass : null;

  var collection = new Meteor.Collection(colName, {
    transform: model
  });

  // uses collection-hooks package
  if (options.timestamps && collection.before) {
    collection.before.insert(function(userId, doc) {
      if (Meteor.isServer) {
        var now = + new Date;
        doc.createdAt = now;
        doc.updatedAt = now;
      }
    });
  }

  collection.build = function(obj) {
    var mdl = model(obj);
    mdl._id = obj._id;
    return mdl;
  };

  this._klasses[klass] = collection;

  return collection;
};

// for creating a custom class to user for model transforms
Model.extend = function(proto) {
  var self = this;
  var o = function(klass, obj, options) {
    self.call(this, klass, obj, options);
  };
  o.prototype = _.extend({}, this.prototype, proto);
  o.extend = this.extend;
  return o;
};

Model.prototype.get = function(key) {
  return Model.getProperty(this.attributes, key);
};

Model.prototype.set = function(key, value) {
  return Model.setProperty(this.attributes, key, value);
};

Model.prototype.plain = function() {
  return _.clone(this.attributes);
};

Model.prototype.save = function() {
  if (this._id) {
    this._klass.update(this._id, {$set: _.omit(this.attributes, '_id')});
  } else {
    this._id = this._klass.insert(this.attributes);
    this.set("_id", this._id);
  }
  return this;
};


// convenience
Meteor.Collection.prototype.all = ManyRelation.prototype.all;