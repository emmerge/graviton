describe('Graviton.Model', function() {
  beforeEach(function() {
    class TestModel extends Graviton.Model {

    }
    TestModel.relations({
      belongsTo: {
        something: {
          collectionName: 'something',
          field: 'somethingId'
        }
      }
    });
    this.mdl = new TestModel(new Mongo.Collection(), {
      hello: 'World',
      object: {
        nesting: 'level 1',
        deeper: {
          nesting: 'level 2'
        }
      },
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
      this.mdl.set('foo.inner.other', 'xyz');
      expect(this.mdl.get('foo')).toEqual({inner: {other: 'xyz'}});
      expect(this.mdl._saveQuery.modObject()).toEqual({$set: {'newkey': {'diff': 'value'}, 'foo.inner.other': 'xyz'}});
    });
  });
});
