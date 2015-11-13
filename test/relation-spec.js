/**
 * For relations on Car
 *
 * belongsTo            (field)
 * car.personId
 * Person.findOne({_id: car.personId})
 *
 * belongsToMany        (field[]) - array on this side
 * car.personIds[]
 * Person.find({_id: {$in: car.personIds}})
 *
 * hasOne               (foreignKey) - same as hasMany but does findOne
 * person.carId
 * Person.findOne({carId: car._id})
 *
 * hasMany              (foreignKey)
 * person.carId
 * Person.find({carId: car._id})
 *
 * hasAndBelongsToMany  (foreignKey[]) - array on other side
 * person.carIds[]
 * Person.find({carId: car._id})
 *
 * manyToMany           (field[], foreignKey[]) - array on both sides
 * car.companies[], person.companies[]
 * Person.find({companies: {$in: car.companies}})
 */

describe('Graviton.Relation', function() {

  beforeEach(function() {
    resetDB();
  });

  // field
  describe('BelongsTo', function() {
    it('should do a findOne', function() {
      var p = Person.create();
      var c = Car.create({ownerId: p._id});
      expect(c.owner()).toEqual(p);
    });
  });

  describe('HasOne', function() {

  });

  // foreignKey
  describe('HasMany', function() {
    it('should support create', function() {
      var c = Car.create();
      c.drivers.add({name: "Mario"});
      var driver = Person.findOne({carId: c._id, name: "Mario"});
      expect(driver.attributes).toEqual(c.drivers.findOne({name: "Mario"}).attributes);
    });

    it('should allow multiple definitions', function() {
      var c = Car.create();
      c.fans.add({name: 'Bill'});
      c.fans.add({name: 'Bob'});
      expect(c.fans.find().count()).toEqual(2);
    });
  });

  // array on both sides
  describe('ManyToMany', function() {
    beforeEach(function() {
      this.bug = Car.create({make: 'vw'});
      this.civic = Car.create({make: 'honda'});
      this.frank = this.bug.mechanics.add({name: 'Frank'}, 1);
      this.bev = this.civic.mechanics.add({name: 'Bev'}, 2);
    });

    it ('should support add', function() {
      this.civic.mechanics.add(this.frank, 2);
      this.bug.mechanics.add(this.bev, 1);
      expect(this.bug.mechanics.find().count()).toEqual(2);
      expect(this.bug.get('numbers')).toEqual([1]);
      expect(this.civic.get('numbers')).toEqual([2]);
      expect(Person.find({numbers: 1}).count()).toEqual(2);
      expect(Person.find({numbers: 2}).count()).toEqual(2);
    });
  });

  describe('Embedded', function() {
    beforeEach(function() {
      this.car = Car.create({
        passengers: [{name: 'Luigi'}, {name: 'Yoshi'}],
        bestFriend: {_type: 'electric', make: 'Nissan'}
      });
    });

    it('should embed arrays of objects', function() {
      var passengers = this.car.passengers.get();
      expect(passengers[0] instanceof PersonModel).toBe(true);
      expect(passengers[0].get('name')).toBe('Luigi');
    });

    it('should be able to fetch a single model from an array', function() {
      var person = this.car.passengers.get(1);
      expect(person.get('name')).toBe('Yoshi');
    });

    it('should support single items', function() {
      var friend = this.car.bestFriend.get();
      expect(friend instanceof ElectricCarModel).toBe(true);
      expect(friend.get('make')).toBe('Nissan');
    });
  });
});
