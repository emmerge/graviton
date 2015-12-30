describe('Graviton.Model.mixin', function() {
  beforeEach(function() {
    class MixinBaseModel extends Graviton.Model {
      baseProtoMethod() {
        return "base proto result";
      }
    }
    class MixinModel extends MixinBaseModel {
      protoMethod() {
        return "mixin proto result";
      }
      overriddenMethod() {
        return "foo";
      }
    }
    MixinModel.relations({
      hasMany: {
        things: {
          collectionName: 'things',
          foreignKey: 'mixinId'
        }
      },
      belongsTo: {
        something: {
          collectionName: 'something_else',
          field: 'somethingElseId'
        }
      }
    });
    class TestModel extends Graviton.Model {
      overriddenMethod() {
        return "bar";
      }
    }
    TestModel
    .relations({
      belongsTo: {
        something: {
          collectionName: 'something',
          field: 'somethingId'
        }
      }
    })
    .defaults({
      foo: 'bar',
      speed: 'fast',
      driver: {
        name: 'Mario',
        age: 54
      }
    })
    .mixin(MixinModel);

    this.collection = new Mongo.Collection(null);
    this.mdl = new TestModel(this.collection, {
      hello: 'World',
      object: {
        nesting: 'level 1',
        deeper: {
          nesting: 'level 2'
        }
      },
      speed: 'slow',
      array: ['one', 'two']
    });
  });

  it('should add prototype methods', function() {
    expect(this.mdl.protoMethod()).toEqual('mixin proto result');
    expect(this.mdl.baseProtoMethod()).toEqual('base proto result');
  });

  it('should override mixed in methods', function() {
    expect(this.mdl.overriddenMethod()).toEqual('bar');
  });

  it('should mixin relations', function() {
    expect(this.mdl.things instanceof Graviton.Relation).toBe(true);
    var somethingRel = _.findWhere(this.mdl.constructor._relations, {relationName: 'something'});
    expect(somethingRel.collectionName).toEqual('something');
  });
});
