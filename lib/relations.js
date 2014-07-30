// return a defined collection based on relation configuration
var getCollection = function(config) {
  var collection;
  if (config.collection && (config.collection instanceof Meteor.Collection)) {
    collection = config.collection;
  } else {
    var name = config.collectionName || config.collection || config.klass;
    collection = Graviton._collections[name];
    if (!collection) throw new Error("Collection named '"+name+"' has not been defined");
  }
  return collection;
};


// base for many-relations
Relation = function(model, config) {
  config = config || {};
  this._model = model;
  this._collection = getCollection(config);
  if (config.field) this._field = config.field;
  if (config.foreignKey) this._foreignKey = config.foreignKey;
};
Relation.prototype.constructor = Relation;

Relation.prototype.collection = function() {
  if (!this._collection)
    this._collection = Graviton._collections[this._collection._name];
  return this._collection;
};


Relation.prototype.build = function(obj) {
  if (Graviton.isModel(obj)) return obj;
  if (_.isObject(obj)) return this._collection.build(obj);
};

// inserts model if it doesn't have an id - typically called by add
Relation.prototype.persist = function(model) {
  model = this.build(model);
  model.persist();
  return model;
};



// base
ManyRelation = function(model, config) {
  Relation.prototype.constructor.apply(this, arguments);
};
ManyRelation.prototype = Object.create(Relation.prototype);
ManyRelation.prototype.constructor = ManyRelation;

var getFindQuery = function(filter, query) {
  if (query) {
    filter = {'$and': [query, filter]};
  }
  return filter;
};

ManyRelation.prototype.find = function(query) {
  return this._collection.find(getFindQuery(this._filter(), query));
};

ManyRelation.prototype.findOne = function(query) {
  return this._collection.findOne(getFindQuery(this._filter(), query));
};

ManyRelation.prototype.plain = function() {
  return _.map(this.all(), function(model) {
    return model.plain();
  });
};

ManyRelation.prototype.all = function() {
  return this.find().fetch();
};

ManyRelation.prototype._applyArray = function(fnName, model) {
  if (_.isArray(model)) {
    for (var i in model) {
      this[fnName](model[i]);
    }
    return true;
  }
  return false;
};




// foreign key is an array ('field')
BelongsToMany = function(model, config) {
  ManyRelation.prototype.constructor.apply(this, arguments);
  if (!model.get(this._field)) {
    model._setProperty(this._field, []);
  }
};
BelongsToMany.prototype = Object.create(ManyRelation.prototype);
BelongsToMany.prototype.constructor = HasMany;

BelongsToMany.prototype._filter = function() {
  return {_id: {$in: this._model.get(this._field)}};
};

BelongsToMany.prototype.add = function(model) {
  if (this._applyArray('add', model)) return;

  if (_.isString(model)) { // we are passing an id
    model = {_id: model};
  } else {
    model = this.build(model);
    Relation.prototype.persist.call(this, model);
  }
  
  var push = {$push: {}};
  push['$push'][this._field] = model._id;
  this._model.attributes[this._field].push(model._id);
  this._model._collection.update(this._model._id, push);
};

BelongsToMany.prototype.remove = function(model) {
  if (this._applyArray('remove', model)) return;

  var id = (_.isString(model)) ? model : model._id;

  var pull = {$pull: {}};
  pull['$pull'][this._field] = id;
  var attr = this._model.attributes[this._field];
  attr.splice(_.indexOf(attr, id), 1);
  this._model._collection.update(this._model._id, pull);
};

BelongsToMany.prototype.toggle = function(model) {
  if (this._applyArray('toggle', model)) return;
  var id;
  if (_.isString(model)) {
    id = model;
  } else {
    // ensure model is a Model with an _id or undefined
    model = Relation.prototype.persist.call(this, model); 
    if (!model) return;
    id = model._id;
  }
  
  if (_.indexOf(this._model.get(this._field), id) === -1) {
    this.add(id);
  } else {
    this.remove(id);
  }
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
  if (!this._foreignKey) throw Error('Cannot add record to HasMany relationship. No foreign key specified.');
  if (this._applyArray('add', model)) return;
  model = this.build(model || {});
  model.set(this._foreignKey, this._model._id);

  if (!model.persist()) {
    model.save();
  }
  return model;
};


// the "col" versions are used when specified at the collection
// these will likely go away soon

// same as has many but only returns the first matching item
// a unique index should probably be on foreignKey
colHasOne = function(model, config) {
  var rel = new Relation(model, config);
  return function(model) {
    if (model) {
      model = rel.build(model);
      if (model.get(rel._foreignKey) !== rel._model._id) {
        model.set(rel._foreignKey, rel._model._id);
      } 
      model.save();
      return model;
    } else {
      var criteria = {};
      criteria[rel._foreignKey] = rel._model._id;
      return rel._collection.findOne(criteria);
    }
  }
};

// reverse of HasMany
// returns a function that returns one model
colBelongsTo = function(model, config, name) {
  var rel = new Relation(model, config);
  return function() {
    return rel._collection.findOne(rel._model.get(rel._field));
  };
};

colEmbeds = function(model, config, name) {
  return function() {
    var obj = model.get(name);
    if (!obj) return;
    var rel = new Relation(model, config);
    var subModel = rel._collection.build(obj);
    subModel._parent = model;
    return subModel;
  };
};


// these newer versions are used to add to model prototypes

hasOne = function(config) {
  return function(model) {
    var collection = Graviton._collections[config.collectionName];
    if (model) {
      model = collection.build(model);
      if (model.get(config.foreignKey) !== this._id) {
        model.set(config.foreignKey, this._id).save();
      } 
      return model;
    } else {
      var criteria = {};
      criteria[config.foreignKey] = this._id;
      return collection.findOne(criteria);
    }
  }
};

// reverse of HasMany
// returns a function that returns one model
// TODO: pass model to set
belongsTo = function(config) {
  return function() {
    // var collection = Graviton._collections[config.collectionName];
    var collection = getCollection(config);
    return collection.findOne(this.get(config.field));
  };
};

// need to decide if embedded models need a local collection
// currently they do but conceivably, they only need a model class
// if they do need a collection, we could leverage that possibly to make better finders etc.
embeds = function(config) {
  return function() {
    var obj = this.get(config.relationName);
    if (!obj) return;
    var collection = Graviton._collections[config.collectionName];
    // var rel = new Relation(model, config);
    var subModel = collection.build(obj);
    subModel._parent = this;
    return subModel;
  };
};


EmbeddedModels = function(model, config, name) {
  Relation.prototype.constructor.apply(this, arguments);
  this._name = config.relationName || name;
  if (!this._model.get(this._name)) this._model.set(this._name, []);
};
EmbeddedModels.prototype = Object.create(Relation.prototype);
EmbeddedModels.prototype.constructor = EmbeddedModels;

EmbeddedModels.prototype.add = function(model) {
  if (ManyRelation.prototype._applyArray.call(this, 'add', model)) return;

  model = this.build(model);

  this._model.get(this._name).push(model.attributes);
  if (!this._model.persist()) {
    var push = {};
    push[this._name] = model.attributes;
    this._model._collection.update(this._model._id, {$push: push});
  }
};

EmbeddedModels.prototype.indexOf = function(model) {
  if (!model) return -1;
  model = this.build(model);
  var items = this._objects();
  for (var i in items) {
    if (model.equals(items[i])) return +i;
  }
  return -1;
};

EmbeddedModels.prototype.remove = function(model) {
  if (ManyRelation.prototype._applyArray.call(this, 'remove', model)) return;

  model = this.build(model);

  var index = this.indexOf(model);
  if (index === -1) return;
  this._model.get(this._name).splice(index, 1);

  var pull = {};
  pull[this._name] = model.attributes;
  if (!this._model.persist()) {
    this._model._collection.update(this._model._id, {$pull: pull});
  }
};

EmbeddedModels.prototype.plain = ManyRelation.prototype.plain;

EmbeddedModels.prototype.count = function() {
  return this._objects().length;
};

EmbeddedModels.prototype.all = function() {
  var self = this;
  return _.map(this._objects(), function(obj) {
    var subModel = self._collection.build(obj);
    subModel._parent = self._model;
    return subModel;
  });
};

EmbeddedModels.prototype.pluck = function(key) {
  return _.pluck(this._objects(), key);
};

EmbeddedModels.prototype._objects = function() {
  var objs = this._model.get(this._name);
  return _.isArray(objs) ? objs : [];
};

// more efficient than embededmodels.all()[index]
EmbeddedModels.prototype.at = function(index) {
  var obj = this._objects()[index];
  if (!obj) return;
  return this._collection.build(obj);
};