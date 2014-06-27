// constructor used by collection transform functions
Model = function(collectionName, obj, options) {
  options = options || {};
  this.attributes = obj;
  this.syncSavedState();

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

isModel = function(obj) {
  return (obj instanceof Graviton.Model || Graviton.Model.prototype.isPrototypeOf(obj));  
};


// for creating a custom class to user for model transforms
Model.extend = function(proto) {
  var self = this;
  var Model = function(collectionName, obj, options) {
    self.call(this, collectionName, obj, options);
  };
  Model.prototype = Object.create(this.prototype);
  _.extend(Model.prototype, proto);
  Model.extend = this.extend;
  return Model;
};

Model.prototype.get = function(key) {
  return Graviton.getProperty(this.attributes, key);
};

Model.prototype.set = function(key, value) {
  if (_.isObject(key)) {
    for (var k in key) {
      this.set(k, key[k]);
    }
    return this;
  }
  Graviton.setProperty(this.attributes, key, value);
  return this;
};

Model.prototype.setId = function(id) {
  this._id = id;
  this.set('_id', id);
};

Model.prototype.plain = function() {
  return _.clone(this.attributes);
};

// insert a doc if it has no _id
Model.prototype.persist = function() {
  if (!this._id) {
    this._id = this._collection.insert(this.attributes);
    this.set("_id", this._id);
    return true;
  }
  return false;
};

Model.prototype.syncSavedState = function() {
  // create a deep clone. is there a better way to do this?
  this._savedState = JSON.stringify(this.attributes);
};

Model.prototype.savedState = function() {
  // only parse the saved state when needed for efficiency
  if (_.isString(this._savedState)) this._savedState = JSON.parse(this._savedState);
  return this._savedState;
};

Model.prototype.update = function(modifier, options, callback) {
  var args = _.toArray(arguments);
  args.unshift({_id: this._id});
  return this._collection.update.apply(this, args);
};

// insert or update
// TODO: track the attributes that have changed and only update those
Model.prototype.save = function() {
  if (!this.persist()) {
    var diff = Graviton.mongoDiff(this.savedState(), this.attributes);
    if (!_.isEmpty(diff.operators)) {
      this.update(diff.operators);
      this.syncSavedState();
      return {updated: true, warnings: diff.warnings};
    }
    return false;
  }
  this.syncSavedState();
  return {inserted: true};
};
