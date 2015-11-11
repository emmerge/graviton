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
      expect(driver.attributes).toEqual(c.drivers.findOne({name: "Mario"}).attributes);
    });

    it('should allow multiple definitions', function() {
      var c = Car.create();
      c.fans.create({name: 'Bill'});
      c.fans.create({name: 'Bob'});
      expect(c.fans.find().count()).toEqual(2);
    });
  });

});
