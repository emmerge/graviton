// simple linked-list used to flatten complex object trees
class Link {
  constructor(key, parent) {
    this.result = (parent && parent.result) || {};
    this.parent = parent;
    this.key = key;
  }

  // traverse up the tree and build a dot-delimited string
  chainKey() {
    var links = [this.key];
    var parent = this.parent;
    while(parent) {
      if (parent.key)
        links.unshift(parent.key);
      parent = parent.parent;
    }
    return links.join('.');
  }

  // take an object of any depth and return an object with only one level
  // build linked-lists by traversing object tree
  flattenObject(obj) {
    if (!_.isObject(obj)) {
      // found a leaf, save the key/value in result
      let key = this.chainKey();
      this.result[key] = obj;
      return;
    }
    for (let key of Object.keys(obj)) {
      new Link(key, this).flattenObject(obj[key]);
    }
    return this.result;
  }
}

const updateOperators = [
  '$set',
  '$unset',
  '$addToSet',
  '$push',
  '$pull',
  '$pop',
  '$inc'
];

function _keysOverlap(a, b) {
  if (a === b) return false;
  return (_.first(a.split('.')) === _.first(b.split('.')));
}


// extend two flat objects but discard keys that are contained within another
function _mongoExtend(objA, objB) {
  for (let keyB of Object.keys(objB)) {
    for (let keyA of Object.keys(objA)) {
      if (MongoModifier.keysConflict(keyB, keyA)) {
        throw new Error("Cannot apply this modification because it conflicts with unsaved ones. Please save first or re-write update.");
      }
    }
  }
  return _.extend(objA, objB);
}

MongoModifier = class MongoModifier {

  static flattenObject(keyOrObj, value) {
    if (_.isString(keyOrObj)) {
      return {[keyOrObj]: value};
    } else
    if (_.isObject(keyOrObj)) {
      return new Link().flattenObject(keyOrObj);
    }
  }

  // is one key fully-contained in the other?
  static keysConflict(a, b) {
    if (a === b) return false;
    var arrA = a.split('.');
    var arrB = b.split('.');
    if (arrA.length === arrB.length) return false;
    do {
      if (arrA.shift() !== arrB.shift()) {
        return false;
      }
    } while (arrA.length && arrB.length);
    return true;
  }

  constructor(defaults = {}) {
    for (let type of updateOperators) {
      this[type] = defaults[type] || {};
    }
  }

  reset() {
    for (let type of updateOperators) {
      this[type] = {};
    }
  }

  modObject() {
    var mod = {};
    for (let type of updateOperators) {
      if (!_.isEmpty(this[type])) {
        mod[type] = this[type];
      }
    }
    return mod;
  }

  // merge a mongo update statement into the modifier
  mergeUpdate(mongoUpdate) {
    for (let type of updateOperators) {
      if (_.isObject(mongoUpdate[type])) {
        let obj = MongoModifier.flattenObject(mongoUpdate[type]);
        _mongoExtend(this[type], obj);
      }
    }
    return this;
  }

  set(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _mongoExtend(this.$set, obj);
    return {$set: obj};
  }

  unset(keyOrObj) {
    var obj = MongoModifier.flattenObject(keyOrObj, "");
    _mongoExtend(this.$unset, obj);
    return {$unset: obj};
  }

  addToSet(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _mongoExtend(this.$addToSet, obj);
    return {$addToSet: obj};
  }

  push(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _mongoExtend(this.$push, obj);
    return {$push: obj};
  }

  pull(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _mongoExtend(this.$pull, obj);
    return {$pull: obj};
  }

  inc(keyOrObj, value = 1) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _mongoExtend(this.$inc, obj);
    return {$inc: obj};
  }

  pop(keyOrObj) {
    var obj = MongoModifier.flattenObject(keyOrObj, 1);
    _mongoExtend(this.$pop, obj);
    return {$pop: obj};
  }

  shift(keyOrObj) {
    var obj = MongoModifier.flattenObject(keyOrObj, -1);
    _mongoExtend(this.$pop, obj);
    return {$pop: obj};
  }
};

/**
 * A MongoModifier with a collection
 * Provides methods for interacting with a collection via a MongoModifier
 * Contained by models and base class for many relations
 */
MongoQuery = class MongoQuery extends MongoModifier {

  constructor(collection, selector = {}, modifier = {}, options = {}) {
    super(modifier);
    this.collection = collection;
    this.options = options;
    this._selector = selector;
  }

  get selector() {
    return this._selector;
  }

  set selector(val) {
    this._selector = val;
  }

  find(selector = {}, options = {}) {
    _.defaults(options, this.options);
    _.extend(selector, this.selector);
    return this.collection.find(selector, options);
  }

  findOne(selector = {}, options = {}) {
    _.defaults(options, this.options);
    _.extend(selector, this.selector);
    return this.collection.findOne(selector, options);
  }

  and(mongoQuery) {
    if (mongoQuery.collection !== this.collection) {
      throw new Error("Cannot combine mongo queries with different collections.");
    }
    var selector;
    if (_keysHaveDollars(mongoQuery._selector) || _keysHaveDollars(this._selector)) {
      selector = {$and: [this._selector, mongoQuery._selector]};
    } else {
      selector = _.extend({}, this._selector, mongoQuery._selector);
    }
    return new MongoQuery(this.collection, selector);
  }

  or(mongoQuery) {
    if (mongoQuery.collection !== this.collection) {
      throw new Error("Cannot combine mongo queries with different collections.");
    }
    var selector;
    if (Object.keys(this._selector).length === 1 && this._selector.$or) {
      selector = EJSON.clone(this._selector);
      selector.$or.push(mongoQuery._selector);
    } else {
      selector = {$or: [this._selector, mongoQuery._selector]};
    }
    return new MongoQuery(this.collection, selector);
  }

  all(options = {}) {
    _.defaults(options, this.options);
    return this.collection.find({}, options).fetch();
  }

  // apply this modifier to an object
  applyModifier(obj = {}) {
    LocalCollection._modify(obj, this.modObject());
    return obj;
  }

  insert(attributes = {}, callback = undefined) {
    attributes._id = this.collection.insert(attributes, callback);
    return attributes._id;
  }

  create(attributes = {}, callback = undefined) {
    if (this.collection.create) {
      return this.collection.create(attributes, callback);
    }
  }

  update(selector = {}, options = {}, callback = undefined) {
    _.defaults(options, this.options);
    _.extend(selector, this.selector);
    var mod = this.modObject();
    if (!_.isEmpty(mod)) {
      return this.collection.update(selector, this.modObject(), options, callback);
    }
  }

  remove(selector = {}, options = {}, callback = undefined) {
    _.defaults(options, this.options);
    _.extend(selector, this.selector);
    return this.collection.remove(selector, options, callback);
  }
};

function _keysHaveDollars(obj) {
  for (var key in Object.keys(obj)) {
    if (key.substr(0, 1) === '$') {
      return true;
    }
  }
  return false;
}
