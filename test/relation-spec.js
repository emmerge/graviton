// class ThingModel extends Graviton.Model {}
// ThingModel.relations({
//   belongsTo: {
//     related: {
//       collectionName: 'relation-test-foreign',
//       field: 'otherId'
//     }
//   },
//   hasMany: {
//     widgets: {
//       collectionName: 'relation-test-foreign',
//       foreignKey: 'thingId'
//     }
//   }
// });
// var BaseCol = Graviton.define('relation-test-base');
// var ForeignCol = Graviton.define('relation-test-foreign');
// allowAll(BaseCol); allowAll(ForeignCol);

describe('Graviton.Relation', function() {

  beforeEach(function() {
    resetDB();
  });

  describe('BelongsTo', function() {

    it('should do a findOne', function() {
      var p = Person.create();
      var c = Car.create({ownerId: p._id});
      expect(c.owner()).toEqual(p);
    });

  });

  describe('HasMany', function() {
    it('should support create', function() {
      var c = Car.create();
      c.drivers.create({name: "Mario"});
      var driver = Person.findOne({carId: c._id, name: "Mario"});
      console.log(driver, c.attributes, Person.findOne().attributes);
      expect(driver.attributes).toEqual(c.drivers.findOne({name: "Mario"}).attributes);
    });
  });
});
