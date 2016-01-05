Model = class Model {
  constructor(collection, obj) {
    if (!(collection instanceof Mongo.Collection))
      throw new Error("Models must be instantiated with a Mongo.Collection");

    if (!_.isObject(obj) || _.isFunction(obj)) {
      obj = {};
    } else {
      obj = _deepClone(obj);
    }

    if (obj._id) {
      this._id = obj._id;
    }

    this._collection = collection;
    this.attributes = _.defaults(obj, this.constructor._defaults);

    for (let relName of Object.keys(this.constructor._relations)) {
      let rel = this.constructor._relations[relName];
      this[relName] = rel.generate(this);
    }

    this._saveQuery = new MongoQuery(collection);
  }
  /**
   * If merge == true, override and add to any inherited relations
   * Otherwise, completely re-define the relations for this class
   * Pass an empty object to clear all inherited relations
   */
  static relations(relationsObj, merge = false) {
    relationsObj = _deepClone(relationsObj);
    var relations = {};
    for (let relationType of Object.keys(relationsObj)) {
      let generator = Relation.getGenerator(relationType);
      if (!generator) {
        continue;
      }
      for (let relationName of Object.keys(relationsObj[relationType])) {
        if (relations[relationName]) {
          throw new Error("Trying to add a relation that already exists:", relationName);
        }
        let cfg = relationsObj[relationType][relationName];
        cfg.type = relationType;
        cfg.relationName = relationName;
        cfg.generate = generator;
        relations[relationName] = cfg;
      }
    }
    if (merge) {
      _.extend(this._relations, relations);
    } else {
      this._relations = relations;
    }
    return this;
  }

  /**
   * If merge == true, override and add to any inherited defaults
   * Otherwise, completely re-define the defaults for this class
   * Pass an empty object to clear all inherited defaults
   * Must be serializable
   */
  static defaults(defaultsObj, merge = false) {
    var defaults = _deepClone(defaultsObj);
    if (merge) {
      this._defaults = _.extend({}, this._defaults, defaults);
    } else {
      this._defaults = defaults;
    }
    return this;
  }

  /**
   * Add another class's prototype, relations and defaults
   * Don't override anthing defined on this class
   */
  static mixin(modelClass) {
    _.defaults(this.prototype, modelClass.prototype);
    _.defaults(this._defaults, modelClass._defaults);
    for (let relName of Object.keys(modelClass._relations)) {
      if (!this._relations[relName]) {
        this._relations[relName] = modelClass._relations[relName];
      }
    }
    return this;
  }

  /**
   * Legacy API support
   */
  static extend(modelClassOrOptions, proto) {
    var Mdl;
    if (modelClassOrOptions.prototype instanceof Graviton.Model) {
      Mdl = class extends this { }.mixin(modelClassOrOptions);
    } else {
      var BaseClass = _modelClassFromOptions(this, modelClassOrOptions, proto);
      Mdl = class extends BaseClass { };
    }
    return Mdl;
  }

  // alter the attributes using dot-delimited key
  _setProperty(key, value) {
    return Graviton.setProperty(this.attributes, key, value);
  }

  setId(id) {
    this._id = id;
    this._setProperty('_id', id);
    return this;
  }

  // take a mongo update statement and modify the model attributes with it
  // doesn't alter pending save
  _applyUpdate(update) {
    LocalCollection._modify(this.attributes, update);
  }

  get(key) {
    return _deepClone(Graviton.getProperty(this.attributes, key));
  }

  set(keyOrObj, value) {
    this._applyUpdate(this._saveQuery.set(keyOrObj, value));
    return this;
  }

  unset(keyOrObj) {
    this._applyUpdate(this._saveQuery.unset(keyOrObj));
    return this;
  }

  inc(keyOrObj, value) {
    this._applyUpdate(this._saveQuery.inc(keyOrObj, value));
    return this;
  }

  push(keyOrObj, value) {
    this._applyUpdate(this._saveQuery.push(keyOrObj, value));
    return this;
  }

  pull(keyOrObj, value) {
    this._applyUpdate(this._saveQuery.unset(keyOrObj, value));
    return this;
  }

  addToSet(keyOrObj, value) {
    this._applyUpdate(this._saveQuery.addToSet(keyOrObj, value));
    return this;
  }

  pop(keyOrObj) {
    this._applyUpdate(this._saveQuery.pop(keyOrObj));
    return this;
  }

  shift(keyOrObj) {
    this._applyUpdate(this._saveQuery.shift(keyOrObj));
    return this;
  }

  // given a mongo update statement, make the modification to
  // the model's attributes and add to pending modifications to save
  modify(update) {
    this._saveQuery.mergeUpdate(update);
    this._applyUpdate(update);
    return this;
  }

  update(update, callback) {
    if (!this._id) {
      throw new Error("Can't update model. It has no _id.");
    }
    this.modify(update);
    this.save(callback);
  }

  save(callback) {
    if (this._id) {
      this._saveQuery.selector = {_id: this._id};
      _performUpdate.call(this, 'update', callback);
    } else {
      this._id = _performUpdate.call(this, 'insert', this.attributes, callback);
    }
    return this;
  }

  remove(callback) {
    if (this._id) {
      this._saveQuery.selector = {_id: this._id};
      return _performUpdate.call(this, 'remove', callback);
    }
  }
};
Model._relations = [];
Model._defaults = {};

// handle async vs. sync
function _performUpdate(...args) {
  var method = args.shift();
  var callback = (_.isFunction(_.last(args))) ? args.pop() : undefined;

  if (callback) {
    this._saveQuery[method](...args, (err) => {
      if (!err) {
        this._saveQuery.reset();
      }
      callback.apply(this, arguments);
    });
  } else {
    var result = this._saveQuery[method](...args);
    this._saveQuery.reset();
    return result;
  }
}

function _deepClone(obj) {
  if (!_.isObject(obj)) return obj;
  return EJSON.clone(obj);
}

function _modelClassFromOptions(BaseClass, options = {}, proto = {}) {
  var Mdl = class extends BaseClass {
    constructor() {
      super(...arguments);
      if (options.initialize) {
        options.initialize.apply(this, arguments);
      }
    }
  };
  if (options.defaults) {
    Mdl.defaults(options.defaults, true);
  }
  if (options.relations) {
    Mdl.relations(options.relations, true);
  } else {
    let relations = _.pick(options, ...Graviton.Relation.supportedTypes());
    if (!_.isEmpty(relations)) {
      Mdl.relations(relations);
    }
  }
  _.extend(Mdl.prototype, proto);
  return Mdl;
}
