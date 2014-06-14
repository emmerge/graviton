// constructor used by collection transform functions
Model = function(collectionName, obj, options) {
  options = options || {};
  this.attributes = obj;

  this._collection = Graviton._collections[collectionName];


  if (_.isUndefined(this._collection)) throw "Can't find collection: '"+collectionName+"'. Has it been defined?";

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

// for creating a custom class to user for model transforms
Model.extend = function(proto) {
  var self = this;
  var o = function(collectionName, obj, options) {
    self.call(this, collectionName, obj, options);
  };
  o.prototype = _.extend({}, this.prototype, proto);
  o.extend = this.extend;
  return o;
};

Model.prototype.get = function(key) {
  return Graviton.getProperty(this.attributes, key);
};

Model.prototype.set = function(key, value) {
  return Graviton.setProperty(this.attributes, key, value);
};

Model.prototype.plain = function() {
  return _.clone(this.attributes);
};

Model.prototype.save = function() {
  if (this._id) {
    this._collection.update(this._id, {$set: _.omit(this.attributes, '_id')});
  } else {
    this._id = this._collection.insert(this.attributes);
    this.set("_id", this._id);
  }
  return this;
};