describe('Graviton.MongoModifier', function() {
  describe('flattenObject', function() {

    it('should reduce a deep object into a single-level', function() {
      var collapsed, expected, obj;
      obj = {
        a: {
          b: {
            c: 1,
            d: 2
          },
          e: {
            f: 3,
            g: {
              h: 4
            },
            i: 5
          }
        }
      };
      collapsed = Graviton.MongoModifier.flattenObject(obj);
      expected = {
        'a.b.c': 1,
        'a.b.d': 2,
        'a.e.f': 3,
        'a.e.g.h': 4,
        'a.e.i': 5
      };
      expect(_.isEqual(collapsed, expected)).toEqual(true);
    });
  });

  describe('an instance', function() {
    beforeEach(function() {
      this.mod = new Graviton.MongoModifier();
    });

    it('should merge sets', function() {
      var expected;
      this.mod.set({
        foo: 'bar',
        baz: {
          zoo: 'kel'
        }
      });
      this.mod.set({
        pic: {
          fir: {
            ack: 'ile'
          }
        }
      });
      expected = {
        $set: {
          foo: 'bar',
          'baz.zoo': 'kel',
          'pic.fir.ack': 'ile'
        }
      };
      expect(this.mod.modObject()).toEqual(expected);
    });

    it('should not allow keys that contain another key', function() {
      this.mod.set({x: {y: 'z'}});
      var set = {x: 'a'};
      expect(() => this.mod.set(set)).toThrowError(Error);
    });
  });
});
