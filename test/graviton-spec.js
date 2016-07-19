var TestCol = Graviton.define('graviton-test');

import {expect} from 'meteor/practicalmeteor:chai';

describe('Graviton', function() {
  describe('getCollection', function() {
    it('should find collections with various args', function() {
      expect(Graviton.getCollection('graviton-test')).to.equal(TestCol);
      expect(Graviton.getCollection({collectionName: 'graviton-test'})).to.equal(TestCol);
      expect(Graviton.getCollection({collection: 'graviton-test'})).to.equal(TestCol);
      expect(Graviton.getCollection({klass: 'graviton-test'})).to.equal(TestCol);
    });
  });

  describe('defined collections', function() {
    describe('build', function() {
      it('should not return a model with _id = undefined', function() {
        var car = Car.build({});
        expect(car.hasOwnProperty('_id')).to.be.false;
      });
    });
  });

  describe('isModel', function() {
    it('should determine if an object in an instance of Graviton.Model', function() {
      var c = Car.build();
      var ec = Car.build({_type: 'electric'});
      expect(Graviton.isModel(c)).to.be.true;
      expect(Graviton.isModel(ec)).to.be.true;
      expect(Graviton.isModel({})).to.be.false;
      expect(Graviton.isModel([])).to.be.false;
      expect(Graviton.isModel("xxx")).to.be.false;
      expect(Graviton.isModel(234)).to.be.false;
      expect(Graviton.isModel(_)).to.be.false;
      expect(Graviton.isModel(Graviton)).to.be.false;
      expect(Graviton.isModel(Graviton.Model)).to.be.false;
      expect(Graviton.isModel(undefined)).to.be.false;
      expect(Graviton.isModel(null)).to.be.false;
    });
  });
});
