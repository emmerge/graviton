function BelongsTo(model) {
  return () => {
    return Graviton.getCollection(this).findOne({
      _id: model.get(this.field)
    });
  };
}

function HasOne(model) {
  return () => {
    return Graviton.getCollection(this).findOne({
      [this.foreignKey]: model._id
    });
  };
}

const relationGenerators = {
  belongsTo: BelongsTo,
  hasOne: HasOne,
  hasMany: function(mdl) { return new HasMany(mdl, this); },
  belongsToMany: function(mdl) { return new BelongsToMany(mdl, this); },
  manyToMany: function(mdl) { return new ManyToMany(mdl, this); },
  hasAndBelongsToMany: function(mdl) { return new HasAndBelongsToMany(mdl, this); },
  embed: function(mdl) { return new Embedded(mdl, this); }
};
relationGenerators.embeds = relationGenerators.embed;
relationGenerators.embedsMany = relationGenerators.embed;

Relation = class Relation extends MongoQuery {
  constructor(model, config) {
    super(Graviton.getCollection(config));
    this.model = model;
    this.config = config;
  }

  get field() {
    return this.config.field || '_id';
  }

  get fieldValue() {
    return this.model.get(this.field);
  }

  get foreignKey() {
    return this.config.foreignKey || '_id';
  }

  static getGenerator(type) {
    return relationGenerators[type];
  }

  static supportedTypes() {
    return Object.keys(relationGenerators);
  }
};

// array on this side of the association
class BelongsToMany extends Relation {
  get selector() {
    return {[this.field]: {$in: this.fieldValue}};
  }

  add(modelOrAttrs) {
    var related = _getModel.call(this, modelOrAttrs);
    this.model.addToSet(this.field, related.get(this.foreignKey)).save();
    return related;
  }
}

// foreign key
class HasMany extends Relation {
  get selector() {
    return {[this.foreignKey]: this.fieldValue};
  }

  add(modelOrAttrs) {
    var related = _getModel.call(this, modelOrAttrs);
    related.set(this.foreignKey, this.fieldValue).save();
    return related;
  }
}

// array on foreign side of relation
class HasAndBelongsToMany extends Relation {
  get selector() {
    return {[this.foreignKey]: this.fieldValue};
  }

  add(modelOrAttrs) {
    var related = _getModel.call(this, modelOrAttrs);
    related.addToSet(this.foreignKey, this.fieldValue).save();
    return related;
  }
}

// array on both sides of relation
class ManyToMany extends Relation {
  get selector() {
    return {[this.foreignKey]: {$in: this.fieldValue}};
  }

  add(modelOrAttrs, commonValue) {
    var related = _getModel.call(this, modelOrAttrs);
    this.model.addToSet(this.field, commonValue).save();
    related.addToSet(this.foreignKey, commonValue).save();
    return related;
  }
}

function _getModel(modelOrAttrs) {
  if (modelOrAttrs instanceof Graviton.Model) {
    return modelOrAttrs;
  } else {
    return this.collection.build(modelOrAttrs);
  }
}

class Embedded {
  constructor(model, config) {
    this.collection = Graviton.getCollection(config);
    this.model = model;
    this.config = config;
  }

  get(index) {
    var value = this.model.get(this.config.relationName);
    if (_.isEmpty(value)) return value;

    if (_.isArray(value)) {
      if (!_.isUndefined(index)) {
        value = value[index];
        value = this.collection.build(value);
      } else {
        value = _.map(value, (obj) => {
          return  this.collection.build(obj);
        });
      }
    } else {
      value = this.collection.build(value);
    }
    return value;
  }
}
