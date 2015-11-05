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
});
