
import {expect} from 'meteor/practicalmeteor:chai';

/*jshint -W030*/ // allows .true and .false without ()

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
      expect(_.isEqual(collapsed, expected)).to.equal(true);
    });
  });

  describe('keysConflict', function() {
    var conflict = Graviton.MongoModifier.keysConflict;

    it('should return true if one key contains another', function() {
      expect(conflict('a', 'a')).to.be.false; // same
      expect(conflict('a.b.c', 'a.b.d')).to.be.false; // same length
      expect(conflict('a.b.c.d', 'a.b.d.f.g')).to.be.false; // different length
      expect(conflict('a.b.d.f.g', 'a.b.c.d')).to.be.false;
      expect(conflict('a.b', 'a.b.d')).to.be.true;
      expect(conflict('a.b.c', 'a.b')).to.be.true;
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
      expect(this.mod.modObject()).to.deep.equal(expected);
    });

    describe('set', function() {
      it('should prevent multiple calls that conflict', function() {
        this.mod.set({x: {y: 'z', m: 'n'}});
        var set = {x: 'a'};
        expect(() => this.mod.set(set)).to.throw(Error);

        set = {x: {y: 'r'}};
        expect(() => this.mod.set(set)).not.to.throw(Error);
      });

      it('should allow overlapping keys that make sense', function() {
        this.mod.set({x: {y: 'z'}});
        var set = {x: 'a'};
        expect(() => this.mod.set(set)).to.throw(Error);
      });
    });

    describe('addToSet', function() {
      it('should behave as expected', function() {
        this.mod.addToSet({'some.field': 'GOT', 'blue.blog': {free: 'RIT'}});
        this.mod.addToSet('some.field', 'SUP');
        expect(this.mod.modObject().$addToSet).to.deep.equal({'some.field': 'SUP', 'blue.blog': {free: 'RIT'}});
      });
    });

  });
});

describe('Graviton.MongoQuery', function() {
  beforeEach(function() {
    var col = new Mongo.Collection(null);
    this.shapeQuery = new Graviton.MongoQuery(col, {shape: {$in: ['flat', 'round']}});
    this.sizeQuery = new Graviton.MongoQuery(col, {size: 'large'});
  });

  it('should be add-able', function() {
    var newQuery = this.shapeQuery.and(this.sizeQuery);
    expect(newQuery.selector).to.deep.equal({shape: {$in: ['flat', 'round']}, size: 'large'});
  });

  it('should be or-able', function() {
    var newQuery = this.shapeQuery.or(this.sizeQuery);
    expect(newQuery.selector).to.deep.equal({$or: [{shape: {$in: ['flat', 'round']}}, {size: 'large'}]});
  });

  describe('mergeUpdate', function() {
    it('should handle $addToSet properly', function() {
      var op = {'source.drawing': {personId: 'abc', profession: 'painter'}};
      this.shapeQuery.mergeUpdate({$addToSet: op});
      expect(this.shapeQuery.$addToSet).to.deep.equal(op);
    });
  });
});
