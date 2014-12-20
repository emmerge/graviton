// constructor used by collection transform functions
// Model classes are not tied to any particular collection
// model instances have a reference to the collection they came from
// relations are also defined with collections and added to models when they are instantiated
Model = function(collection, obj) {
  if (!(collection instanceof Mongo.Collection))
    throw new Error("Models must be instantiated with a Mongo.Collection");

  if (!_.isObject(obj) || _.isFunction(obj))
    obj = new Object;

  this._collection = collection;

  this.attributes = obj;
  this._pendingMods = []; // fill with modifiers to run when save is called

  // new Gravition.Model will instantiate without any options
  // use Model.extend to create a constructor with defaults/initialize
  _.defaults(this, {
    _options: {},
    _super: null
  });

  var self = this;

  // new way of adding relations
  _.each(this._options.relations, function(relationsOfType, relationType) {
    _.each(relationsOfType, function(cfg, relationName) {
      var relCls = ManyRelation._types[relationType];
      if (relCls) {
        cfg.relationName = relationName;
        self[relationName] = new relCls(self, cfg);
      }
    });
  });
  

  // old way of adding relations
  var relations = this._collection._graviton.relations;

  _.each(relations.hasMany, function(cfg, name) {
    self[name] = new HasMany(self, cfg);
  });
  _.each(relations.hasOne, function(cfg, name) {
    self[name] = colHasOne(self, cfg);
  });
  _.each(relations.belongsTo, function(cfg, name) {
    self[name] = colBelongsTo(self, cfg, name);
  });
  _.each(relations.belongsToMany, function(cfg, name) {
    self[name] = new BelongsToMany(self, cfg);
  });
  _.each(relations.embeds, function(cfg, name) {
    self[name] = colEmbeds(self, cfg, name);
  });
  _.each(relations.embedsMany, function(cfg, name) {
    self[name] = new EmbeddedModels(self, cfg, name);
  });

  

  _.defaults(this.attributes, this._options.defaults);

  if (_.isFunction(this._options.initialize)) {
    this._options.initialize.call(this, obj);
  }
};

isModel = function(obj) {
  return (obj instanceof Graviton.Model || Graviton.Model.prototype.isPrototypeOf(obj));  
};

var addSingularRelations = function(proto, relations) {
  _.each(relations, function(relationsOfType, relationType) {
    _.each(relationsOfType, function(cfg, relationName) {
      var relFn = Relation._types[relationType];
      if (relFn) {
        cfg.relationName = relationName;
        proto[relationName] = relFn(cfg);
      }
    });
  });
};

// for creating a custom class to use for model transforms
// options:
// * initialize - call when instances are created
// * defaults - default values for attributes
Model.extend = function(options, proto) {
  var self = this;

  options = options || {};

  if (_.isArray(options._arguments)) {
    proto = options._arguments[1];
    options = options._arguments[0];
  }
  
  proto = proto || {};

  var relations = _.clone(this.relations) || {};

  _.each(relations, function(rel, relName) {
    relations[relName] = _.extend({}, rel, options[relName]);
  });
  _.defaults(relations, _.pick(options, Relation.typeNames()));

  var opts = {
    defaults: _.extend({}, this.defaults, options.defaults),
    initialize: options.initialize,
    relations: relations
  };

  var Mdl = function(collection, obj) {
    this._super = self;
    // we want any arbitrary options used to extend
    this._options = _.extend(opts, _.omit(options, 'defaults', 'initialize', 'relations'));
    Model.call(this, collection, obj);
  };

  Mdl._arguments = [options, proto];

  Mdl.relations = opts.relations;
  Mdl.initialize = opts.initialize;
  Mdl.defaults = opts.defaults;
  Mdl.extend = this.extend;
  Mdl.prototype = Object.create(this.prototype);
  Mdl.prototype.constructor = Mdl;

  addSingularRelations(Mdl.prototype, opts.relations);

  _.extend(Mdl.prototype, proto);
  
  return Mdl;
};

Model.prototype.get = function(key) {
  return Graviton.getProperty(this.attributes, key);
};

// * thing - string or object
// * value - anything serializable. isn't used if thing is an object
Model.prototype.set = function(thing, value) {
  if (_.isObject(thing)) {
    for (var k in thing) {
      this._setProperty(k, thing[k]);
    }
    this._pendingMods.push({$set: thing});
    return this;
  }
  // else
  this._setProperty(thing, value);
  var obj = {};
  obj[thing] = value;
  this._pendingMods.push({$set: obj});
  return this;
};

// * thing - string or object
// * increment - number
Model.prototype.inc = function(thing, increment) {
  if (_.isObject(thing)) {
    if (_.isObject(thing)) {
      for (var k in thing) {
        var val = this.get(k) || 0;
        this._setProperty(k, val + thing[k]);
      }
      this._pendingMods.push({$inc: thing});
      return this;
    }
  }
  // else
  var val = this.get(thing) || 0;
  this._setProperty(thing, val + increment);
  var incObj = {};
  incObj[thing] = increment;
  var $inc = {$inc: incObj};
  this._pendingMods.push($inc);
  return this;
};

/**
 * _pushProperty
 *
 * Takes an object or array value and pushes it to the model property found using `key`.
 * Returns an object to be used in the Mongo `$push` operation.
 *  - In the case of an {Object} value this is simply just the value.
 *  - In the case of an {Array} value it will be an object containing an `$each` expression.
 *
 * @param key {String} the property key (must have an array value).
 * @param value {Array} or {Object}
 * @returns {Object}
 * @private
 */
Model.prototype._pushProperty = function(key, value) {
  var array = this.get(key);
  if (!_.isArray(array))
    throw new Error("Trying to push a value onto a non-array property");
  if (_.isArray(value)) {
    this._setProperty(key, array.concat(value));
    return {$each: value};
  } else {
    array.push(value);
    return value;
  }
};

Model.prototype.push = function(thing, value) {
  var push;
  if (_.isObject(thing)) {
    for (var k in thing) {
      thing[k] = this._pushProperty(k, thing[k]);
    }
    push = thing;
  } else {
    value = this._pushProperty(thing, value);
    push = {};
    push[thing] = value;
  }
  this._pendingMods.push({$push: push});
};

Model.prototype._popProperty = function(key, first) {
  var array = this.get(key);
  if (!_.isArray(array)) throw new Error("Trying to pop a value from a non-array");
  if (first) {
    return array.shift();
  } else {
    return array.pop();
  }
};

Model.prototype._applyPop = function(keys, first) {
  var pop = {};
  for (var i in keys) {
    pop[keys[i]] = (first) ? -1 : 1;
    this._popProperty(keys[i], first);
  }
  this._pendingMods.push({$pop: pop});
};

Model.prototype.pop = function() {
  this._applyPop(_.toArray(arguments));
};

Model.prototype.shift = function(key) {
  this._applyPop(_.toArray(arguments), true);
};

Model.prototype._setProperty = function(key, value) {
  Graviton.setProperty(this.attributes, key, value);
};

Model.prototype.setId = function(id) {
  this._id = id;
  this._setProperty('_id', id);
};

// deep clone of attributes
Model.prototype.plain = function() {
  var str = JSON.stringify(this.attributes);
  return JSON.parse(str);
};

// deep equals of attributes
// designed to be overridden by subclasses
// used by indexOf on relations
Model.prototype.equals = function(obj) {
  if (Graviton.isModel(obj)) obj = obj.attributes;
  return _.isEqual(obj, this.attributes);
};

// insert a doc if it has no _id
// if it does, either upsert or do nothing 
// return new id if new doc was inserted
Model.prototype.persist = function(callback) {
  if (!this._id) {
    var id = this._collection.insert.apply(this._collection, _.compact([this.attributes, callback]));
    this.setId(id);
    this._pendingMods = [];
    return this._id;
  }
  if (callback) callback(null, false);
  return false;
};

// applies a mongo modifier to the document
// does not update the database until you call save
Model.prototype.modify = function(modifier) {
  LocalCollection._modify(this.attributes, modifier);
  this._pendingMods.push(modifier);
  return this;
};

// does a modify with persistence
Model.prototype.update = function(modifier, callback) {
  var self = this;
  LocalCollection._modify(this.attributes, modifier);

  if (callback) {
    this.persist(function(err, id) {
      if (!err) {
        self._collection.update(self._id, modifier, callback);
      } else {
        callback(err);
      }
    });
  } else {
    if (!this.persist()) {
      this._collection.update(this._id, modifier);
    }
  } 
  return this;
};

// insert or execute pending modifiers added with modify
Model.prototype.save = function(callback) {
  var self = this;
  if (callback) {
    this.persist(function(err, id) {
      if (!err) {
        var updates = _.map(self._pendingMods, function(mod) {
          return function(cb) {
            self._collection.update(self._id, mod, function(err, res) {
              if (!err) self._pendingMods.shift();
              cb(err, res);
            });
          };
        });
        var done = function(err, res) {
          callback(err, 1);
        };
        async.series(updates, done);
      } else {
        callback(err);
      }
    });
  } else {
    if (!this.persist()) {
      for (var i in this._pendingMods) {
        this._collection.update(this._id, this._pendingMods[i]);
      }
      this._pendingMods = [];
    }
    return this;
  }
};

Model.prototype.remove = function(callback) {

  var removed_id = this._id;
  var self = this;
  var relations;

  // find all the relations so that we can handle cascade options
  if (this._options.relations) {
    relations = _.pick(this._options.relations, ['hasMany', 'hasOne']);
    relations = _.extend(relations.hasMany || {}, relations.hasOne);
  }

  // before destroying the parent, check for relational restrictions
  var denyRelations = _.filter(relations, function(relation) {
    return relation.onRemove === 'deny';
  });
  _.each(denyRelations, function(relation) {
    //console.log('collection:', self._collection._name, 'relation:',  relation.relationName, 'is on remove deny restricted');
    //console.log('self[relation.relationName].findOne()',self[relation.relationName].findOne());
    if (self[relation.relationName].findOne())
      throw Error('Cannot remove record, relation \''+relation.relationName+'\' denies removal if child records exist.');
  });

  // remove the document from the collection itself
  if (callback) {
    this._collection.remove(this._id, function(err, res) {
      if (!err) self.setId(null);
      callback(err, res);
    });
  } else {
    this._collection.remove(this._id);
    this.setId(null);
  }

  // after destroying the parent, remove or nullify the children based on relational options
  _.each(relations, function(relation) {
    self._id = removed_id; //mock up the model like it still exists to allow the relations to work naturally

    if (relation.onRemove == 'cascade') {
      //console.log('collection:', self._collection._name, 'relation:',  relation.relationName, 'should onRemove cascade');
      _.each(self[relation.relationName].all(), function(child) {
        //console.log('child', relation.collection, 'to delete:', child._id);
        child.remove();
      })
    }
    else if (relation.onRemove == 'unset') {
      //console.log('collection:', self._collection._name, 'relation:',  relation.relationName, 'should remove reference');
      _.each(self[relation.relationName].all(), function(child) {
        //console.log('child', relation.collection, 'to remove reference to:', child._id);
        var updateObj = {};
        updateObj['$unset'] = {};
        updateObj['$unset'][relation.foreignKey] = true;
        child.update(updateObj);
      })
    }

    self._id = null; //reset the removed model.
  });

  return this;
};
