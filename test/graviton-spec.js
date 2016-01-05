var TestCol = Graviton.define('graviton-test');

describe('Graviton', function() {
  describe('getCollection', function() {
    it('should find collections with various args', function() {
      expect(Graviton.getCollection('graviton-test')).toEqual(TestCol);
      expect(Graviton.getCollection({collectionName: 'graviton-test'})).toEqual(TestCol);
      expect(Graviton.getCollection({collection: 'graviton-test'})).toEqual(TestCol);
      expect(Graviton.getCollection({klass: 'graviton-test'})).toEqual(TestCol);
    });
  });

  describe('defined collections', function() {
    describe('build', function() {
      it('should not return a model with _id = undefined', function() {
        var car = Car.build({});
        expect(car.hasOwnProperty('_id')).toBe(false);
      });
    });
  });

  describe('isModel', function() {
    it('should determine if an object in an instance of Graviton.Model', function() {
      var c = Car.build();
      var ec = Car.build({_type: 'electric'});
      expect(Graviton.isModel(c)).toBe(true);
      expect(Graviton.isModel(ec)).toBe(true);
      expect(Graviton.isModel({})).toBe(false);
      expect(Graviton.isModel([])).toBe(false);
      expect(Graviton.isModel("xxx")).toBe(false);
      expect(Graviton.isModel(234)).toBe(false);
      expect(Graviton.isModel(_)).toBe(false);
      expect(Graviton.isModel(Graviton)).toBe(false);
      expect(Graviton.isModel(Graviton.Model)).toBe(false);
      expect(Graviton.isModel(undefined)).toBe(false);
      expect(Graviton.isModel(null)).toBe(false);
    });
  });
});
