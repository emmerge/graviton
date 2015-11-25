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

  describe('keysConflict', function() {
    var conflict = Graviton.MongoModifier.keysConflict;

    it('should return true if one key contains another', function() {
      expect(conflict('a', 'a')).toBe(false); // same
      expect(conflict('a.b.c', 'a.b.d')).toBe(false); // same length
      expect(conflict('a.b.c.d', 'a.b.d.f.g')).toBe(false); // different length
      expect(conflict('a.b.d.f.g', 'a.b.c.d')).toBe(false);
      expect(conflict('a.b', 'a.b.d')).toBe(true);
      expect(conflict('a.b.c', 'a.b')).toBe(true);
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

    describe('set', function() {
      it('should prevent multiple calls that conflict', function() {
        this.mod.set({x: {y: 'z', m: 'n'}});
        var set = {x: 'a'};
        expect(() => this.mod.set(set)).toThrowError(Error);

        set = {x: {y: 'r'}};
        expect(() => this.mod.set(set)).not.toThrowError();
      });

      it('should allow overlapping keys that make sense', function() {
        this.mod.set({x: {y: 'z'}});
        var set = {x: 'a'};
        expect(() => this.mod.set(set)).toThrowError(Error);
      });
    });

  });
});
