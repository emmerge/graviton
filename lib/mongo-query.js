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

const modifierTypes = ['$set', '$addToSet', '$pull', '$inc'];

class MongoModifier {

  static flattenObject(keyOrObj, value) {
    if (_.isString(keyOrObj)) {
      return {[keyOrObj]: value};
    } else
    if (_.isObject(keyOrObj)) {
      return new Link().flattenObject(keyOrObj);
    }
  }

  constructor(defaults = {}) {
    for (let type of modifierTypes) {
      this[type] = defaults[type] || {};
    }
  }

  modObject() {
    var mod = {};
    for (let type of modifierTypes) {
      if (!_.isEmpty(this[type])) {
        mod[type] = this[type];
      }
    }
    return mod;
  }

  set(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _.extend(this.$set, obj);
  }

  addToSet(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _.extend(this.$addToSet, obj);
  }

  pull(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _.extend(this.$pull, obj);
  }

  inc(keyOrObj, value) {
    var obj = MongoModifier.flattenObject(keyOrObj, value);
    _.extend(this.$inc, obj);
  }

}
this.MongoModifier = MongoModifier;


class MongoQuery extends MongoModifier {

  constructor(collection, selector = {}, modifier = {}, options = {}) {
    super(modifier);
    this.collection = collection;
    this.options = options;
    this.selector = selector;
  }

  find(options = {}) {
    _.extend(options, this.options);
    return this.collection.find(this.selector, options);
  }

  findOne(options = {}) {
    _.extend(options, this.options);
    return this.collection.find(this.selector, options);
  }

  update(options = {}) {
    _.extend(options, this.options);
    return this.collection.update(this.selector, this.modObject(), this.options);
  }

  remove(options = {}) {
    _.extend(options, this.options);
    return this.collection.remove(this.selector, options);
  }
}
this.MongoQuery = MongoQuery;
