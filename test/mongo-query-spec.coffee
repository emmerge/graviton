describe 'Graviton.MongoModifier', ->
  describe 'flattenObject', ->
    it 'should reduce a deep object into a single-level', ->
      obj = {a: {b: {c: 1, d: 2}, e: {f: 3, g: {h: 4}, i: 5}}};
      collapsed = Graviton.MongoModifier.flattenObject(obj)
      expected = {'a.b.c': 1, 'a.b.d': 2, 'a.e.f': 3, 'a.e.g.h': 4, 'a.e.i': 5}
      expect(_.isEqual(collapsed, expected)).toEqual true

  describe 'an instance', ->
    beforeEach ->
      @mod = new Graviton.MongoModifier()

    it 'should merge sets', ->
      @mod.set {foo: 'bar', baz: {zoo: 'kel'}}
      @mod.set {baz: {fir: {ack: 'ile'}}}
      expected = {$set: {foo: 'bar', 'baz.zoo': 'kel', 'baz.fir.ack': 'ile'}}
      expect(_.isEqual(@mod.modObject(), expected)).toEqual true
