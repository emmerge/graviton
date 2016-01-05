describe('Graviton.Model', function() {
  beforeEach(function() {

    function defn() {
      this.relations({
        belongsTo: {
          something: {
            collectionName: 'something',
            field: 'somethingId'
          }
        }
      });
      this.defaults({
        foo: 'bar',
        speed: 'fast',
        driver: {
          name: 'Mario',
          age: 54
        }
      });
    }
    class TestModel extends Graviton.Model {

    }
    defn.call(TestModel);

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

  it('should have relations', function() {
    expect(_.isFunction(this.mdl.something)).toBe(true);
  });

  describe('get', function() {
    it('should return attributes', function() {
      expect(this.mdl.get('hello')).toEqual('World');
      expect(this.mdl.get('object.deeper.nesting')).toEqual('level 2');
      expect(this.mdl.get('array.1')).toEqual('two');
    });

    it('should return clones', function() {
      var obj = this.mdl.get('object');
      expect(obj).not.toBe(this.mdl.attributes.object);
      expect(obj.deeper).not.toBe(this.mdl.attributes.deeper);
    });
  });

  describe('set', function() {
    it('should set attributes with key, value', function() {
      this.mdl.set('newkey', 'aValue');
      expect(this.mdl.get('newkey')).toEqual('aValue');
      this.mdl.set('newkey', {diff: 'value'});
      this.mdl.set('some.inner.other', 'xyz');
      expect(this.mdl.get('some')).toEqual({inner: {other: 'xyz'}});
      expect(this.mdl._saveQuery.modObject()).toEqual({$set: {'newkey': {'diff': 'value'}, 'some.inner.other': 'xyz'}});
    });
  });

  describe('defaults', function() {
    it('should initialize with default values', function() {
      expect(this.mdl.get('foo')).toEqual('bar');
      expect(this.mdl.get('driver.name')).toEqual('Mario');
    });
  });

  describe('save', function() {
    it('should insert a doc to collection', function() {
      this.mdl.save();
      expect(this.collection.findOne(this.mdl._id)).toEqual(this.mdl.attributes);
    });
  });

  describe('extend', function() {
    it('should add relations by name', function() {
      var ec = Car.create({_type: 'electric'});
      expect(ec.batteries instanceof Graviton.Relation).toBe(true);
    });

    it('should not modify defaults of base class', function() {
      var Base = Graviton.Model.extend({defaults: {}});
      expect(Base._defaults.foo).toBe(undefined);
    });
  });

  describe('create', function() {
    it('should not insert dates as strings', function() {
      var date = new Date();
      var car = Car.create({purchaseDate: date});
      car = Car.findOne(car._id);
      expect(_.isString(car.get('purchaseDate'))).toBe(false);
    });
  });
});
