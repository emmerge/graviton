
// base
Relation = function(model, config) {
  config = config || {};
  this._model = model;
  this._klass = Model._klasses[config.klass];
  if (config.field) this._field = config.field;
  if (config.foreignKey) this._foreignKey = config.foreignKey;
};
Relation.prototype.constructor = Relation;

Relation.prototype.build = function(obj) {
  if (obj instanceof Model) return obj;
  return this._klass.build(obj); 
};
// inserts model if it doesn't have an id - typically called by add
Relation.prototype.persist = function(model) {
  model = this.build(model);
  if (!model._id) {
    model._id = this._klass.insert(model.attributes);
    model.set('_id', model._id);
  }
  return model;
};



// base
ManyRelation = function(model, config) {
  Relation.prototype.constructor.apply(this, arguments);
};
ManyRelation.prototype = Object.create(Relation.prototype);
ManyRelation.prototype.constructor = ManyRelation;

ManyRelation.prototype.find = function(query) {
  return this._klass.find(_.extend(query || {}, this._filter()));
};

ManyRelation.prototype.findOne = function(query) {
  return this._klass.findOne(_.extend(query || {}, this._filter()));
};

ManyRelation.prototype.plain = function() {
  return _.map(this.all(), function(model) {
    return model.plain();
  });
};

ManyRelation.prototype.all = function() {
  return this.find().fetch();
};

ManyRelation.prototype.add = function(model) {
  if (_.isArray(model)) {
    for (var i in model) {
      this.add(model[i]);
    }
    return true;
  }
  return false;
};




// foreign key is an array ('field')
BelongsToMany = function(model, config) {
  ManyRelation.prototype.constructor.apply(this, arguments);
  if (!model.get(this._field)) {
    model.set(this._field, []);
  }
};
BelongsToMany.prototype = Object.create(ManyRelation.prototype);
BelongsToMany.prototype.constructor = HasMany;

BelongsToMany.prototype._filter = function() {
  return {_id: {$in: this._model.get(this._field)}};
};

BelongsToMany.prototype.add = function(model) {
  if (ManyRelation.prototype.add.apply(this, arguments)) return;

  model = this.build(model);
  Relation.prototype.persist.call(this, model);

  var push = {$push: {}};
  push['$push'][this._field] = model._id;
  this._model.attributes[this._field].push(model._id);
  this._model._klass.update(this._model._id, push);
};




// foreign key is an id
HasMany = function(model, config) {
  ManyRelation.prototype.constructor.apply(this, arguments);
};
HasMany.prototype = Object.create(ManyRelation.prototype);
HasMany.prototype.constructor = HasMany;

HasMany.prototype._filter = function() {
  var query = {};
  query[this._foreignKey] = this._model._id;
  return query;
};

HasMany.prototype.add = function(model) {
  if (ManyRelation.prototype.add.apply(this, arguments)) return;

  model = this.build(model);
  model.set(this._foreignKey, this._model._id);

  Relation.prototype.persist.call(this, model);

  var set = {$set: {}};
  set['$set'][this._foreignKey] = this._model._id;
  this._klass.update(model._id, set);
};



// same as has many but only returns the first matching item
// a unique index should probably be on foreignKey
hasOne = function(model, config) {
  var rel = new Relation(model, config);
  return function(model) {
    if (model) {
      model = Relation.prototype.build.call(rel, model);
      if (model.get(rel._foreignKey) !== rel._model._id) {
        model.set(rel._foreignKey, rel._model._id);
      }
      model.save();
      return model;
    } else {
      var criteria = {};
      criteria[rel._foreignKey] = rel._model._id;
      return rel._klass.findOne(criteria);
    }
  }
};




// reverse of HasMany
// returns a function that returns one model
belongsTo = function(model, config, name) {
  var rel = new Relation(model, config);
  return function() {
    return rel._klass.findOne(rel._model.get(rel._field));
  };
};

embeds = function(model, config, name) {
  return function() {
    var obj = model.get(name);
    if (!obj) return;
    var rel = new Relation(model, config);
    var subModel = rel._klass.build(obj);
    subModel._parent = model;
    return subModel;
  };
};




EmbeddedModels = function(model, config, name) {
  Relation.prototype.constructor.apply(this, arguments);
  this._name = name;
  if (!this._model.get(this._name)) this._model.set(this._name, []);
};
EmbeddedModels.prototype = Object.create(Relation.prototype);
EmbeddedModels.prototype.constructor = EmbeddedModels;

EmbeddedModels.prototype.add = function(model) {
  if (ManyRelation.prototype.add.apply(this, arguments)) return;

  model = this.build(model);

  this._model.get(this._name).push(model.attributes);
  this._model.save();
};

EmbeddedModels.prototype.plain = ManyRelation.prototype.plain;

EmbeddedModels.prototype.all = function() {
  var self = this;
  return _.map(this._objects(), function(obj) {
    var subModel = self._klass.build(obj);
    subModel._parent = self._model;
    return subModel;
  });
};

EmbeddedModels.prototype._objects = function() {
  var objs = this._model.get(this._name);
  return _.isArray(objs) ? objs : [];
};

// more efficient than embededmodels.all()[index]
EmbeddedModels.prototype.at = function(index) {
  var obj = this._objects()[index];
  if (!obj) return;
  return this._klass.build(obj);
};