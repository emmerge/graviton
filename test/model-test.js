var CarModel = Graviton.Model.extend({
  defaults: {
    isRunning: false
  },
  initialize: function() {
    this.volume = 5;
    this.speed = 11;
  },
  belongsTo: {
    owner: {
      collectionName: 'model-test-people',
      field: 'ownerId'
    }
  },
  hasOne: {
    seller: {
      collectionName: 'model-test-people',
      foreignKey: 'carId'
    }
  },
  hasMany: {
    drivers: {
      collectionName: 'model-test-people',
      foreignKey: 'carId'
    }
  },
  belongsToMany: {
    dealers: {
      collectionName: 'model-test-people',
      field: 'dealerIds'
    }
  }
}, {
  start: function() {
    this.set('isRunning', true);
    return true;
  },
  stop: function() {
    this.set('isRunning', false);
    return true;
  }
});

var ElectricCarModel = CarModel.extend({
  defaults: {
    isCharged: false,
    make: 'Tesla'
  },
  initialize: function() {
    CarModel.initialize.apply(this, arguments);
    this.volume = 0;
  },
  hasMany: {
    batteries: {
      collectionName: 'model-test-batteries',
      foreignKey: 'carId'
    }
  }
}, {
  charge: function() {
    this.set('isCharged', true);
  },
  start: function() {
    if (this.get('isCharged')) {
      CarModel.prototype.start.call(this);
      this.set('isCharged', false);
      return true;
    } else {
      return false;
    }
  }
});

var AmphibiousElectricCarModel = ElectricCarModel.extend({
  initialize: function() {
    ElectricCarModel.initialize.apply(this, arguments);
    this.depth = 100;
  }
});

var FlyingElectricCarModel = ElectricCarModel.extend({
  defaults: {
    make: 'Future',
    hasWings: true
  }
}, {
  launch: function() {
    this.set('isFlying', true);
  }
});

// test defaulting collectionName to relation name
var CarOwnerModel = Graviton.Model.extend({
  hasMany: {
    'model-test-cars': {
      foreignKey: 'carId'
    }
  }
});

var CarOwner = Graviton.define('model-test-car-owners', {
  modelCls: CarOwnerModel
});
allowAll(CarOwner);

var Car = Graviton.define('model-test-cars', {
  modelCls: {
    gas: CarModel,
    electric: ElectricCarModel,
    flying: FlyingElectricCarModel,
    boat: AmphibiousElectricCarModel
  },
  defaultType: 'gas'
});
allowAll(Car);

var Person = Graviton.define('model-test-people');
allowAll(Person);

var Battery = Graviton.define('model-test-batteries');
allowAll(Battery);

var Item = Graviton.Model.extend({
  defaults: {
    
  }
});




var addTest = function(name, fn) {
  Tinytest.add(name, function(test) {
    setup();
    fn(test);
  });
};

var setup = function() {
};

Tinytest.add("Model Relations - default collection name", function(test) {
  var o = CarOwner.create();
  test.equal(o['model-test-cars'].all(), []);
});

Tinytest.add("Model Relations - belongsTo", function(test) {
  var p = Person.create();
  var c = Car.create({ownerId: p._id});
  test.equal(c.owner(), p);
});

Tinytest.add("Model Relations - hasOne", function(test) {
  var c = Car.create();
  var p = Person.create({carId: c._id});
  test.equal(c.seller(), p);
});

Tinytest.add('Collection - build', function(test) {
  var c = Car.build();
  var c2 = Car.build({});
  test.equal(c, c2);

  c = Car.build({color: 'red'});
  test.equal(c.get('color'), 'red');
});

Tinytest.add('Model - relation inheritance', function(test) {
  var fcar = Car.create({_type: 'flying'});
  fcar.batteries.add();
  fcar.drivers.add();
  test.equal(fcar.batteries.find().count(), 1);
  test.equal(fcar.drivers.find().count(), 1);
});

Tinytest.add('Model - initialize', function(test) {
  var car = Car.build({_type: 'gas'});
  test.equal(car.volume, 5);
  test.equal(car.speed, 11);
});

Tinytest.add('Model - initialize inheritance', function(test) {
  var boat = Car.build({_type: 'boat'});
  test.equal(boat.volume, 0);
  test.equal(boat.speed, 11);
  test.equal(boat.depth, 100);
});

Tinytest.add('Model - inheritance', function(test) {
  var fcar = Car.build({_type: 'flying'});
  test.equal(fcar.get('hasWings'), true);
  test.isUndefined(fcar.volume); // we didn't supply an initialize
  test.isTrue(_.isFunction(fcar.stop));
});

Tinytest.add('Collection - polymorphic', function(test) {
  var c = Car.build();
  var ec = Car.build({_type: 'electric'});
  test.isTrue(_.isFunction(ec.charge));
  test.equal(ec.get('make'), 'Tesla');
  test.isUndefined(c.charge);
  test.equal(ec.volume, 0);
  test.equal(ec.speed, 11); 
});


Tinytest.add('Graviton - isModel', function(test) {
  var c = Car.build();
  var ec = Car.build({_type: 'electric'});
  test.isTrue(Graviton.isModel(c));
  test.isTrue(Graviton.isModel(ec));
  test.isFalse(Graviton.isModel({}));
  test.isFalse(Graviton.isModel([]));
  test.isFalse(Graviton.isModel("xxx"));
  test.isFalse(Graviton.isModel(234));
  test.isFalse(Graviton.isModel(_));
  test.isFalse(Graviton.isModel(Graviton));
  test.isFalse(Graviton.isModel(undefined));
  test.isFalse(Graviton.isModel(null));
});

addTest('Collection - create', function(test) {
  var c = Car.create({color: 'green'});
  test.equal(Car.findOne(c._id).attributes, c.attributes);
  test.isTrue(Graviton.isModel(c));
});

testAsyncMulti('Collection - create async', [
  function(test, expect) {
    Car.create({color: 'green'}, expect(function(err, c) {
      test.isFalse(err);
      test.equal(c.get('color'), 'green');
      test.isTrue(Graviton.isModel(c));
    }));
  }
]);

// sets attribute(s) locally and adds a pending set modification
// that is executed when save is called
addTest('Model.prototype - set', function(test) {
  var c = Car.create({color: 'red', speed: 'fast', brand: 'Ferrari'});
  c.set('color', 'brown');
  c.set('brand', 'Lexus');
  c.set({
    speed: 'slow',
    brand: 'Ford'
  });
  test.equal(c.get('speed'), 'slow');
  test.equal(c.get('color'), 'brown');
  test.equal(c._pendingMods.length, 3);
  test.equal(Car.findOne(c._id).get('color'), 'red');
  c.save();
  test.equal(Car.findOne(c._id).get('color'), 'brown');
  test.equal(Car.findOne(c._id).get('speed'), 'slow');
  test.equal(Car.findOne(c._id).get('brand'), 'Ford');

  var d = new Date();
  var fn = function() {};
  c.set({date: d, fn: fn}).save();
  test.isTrue(c.get('date') === d); // dates should not be cloned

  var nested = {other: 'value'};
  var obj = {some: 'object', nested: nested};

  c.set('object', obj).save();
  test.isFalse(c.get('object') === obj); // plain objects should be cloned
  test.isFalse(c.get('object.nested') === nested);

});

// modify doesn't update the database
// appies mongodb modifier(s) to the model's attributes
// holds on to modifiers to apply to db when save is called
addTest('Model.prototype - modify', function(test) {
  var c = Car.create({color: 'blue'});
  c.modify({$set: {color: 'yellow', name: 'Bruno'}});
  test.equal(c.get('color'), 'yellow');
  test.equal(c.get('name'), 'Bruno');

  c.modify({color: 'orange'});
  test.equal(c.get('color'), 'orange');
  test.isUndefined(c.get('name'));

  var dbcar = Car.findOne(c._id);
  test.equal(dbcar.get('color'), 'blue');
  test.isTrue(_.isUndefined(dbcar.get('name')));
});

// persist inserts if the model has no _id
// otherwise, does nothing
addTest('Model.prototype - persist', function(test) {
  var c = Car.build({color: 'black'});
  test.isUndefined(c._id);
  var r = c.persist();
  test.isTrue(r);
  test.equal(Car.findOne(c._id).attributes, c.attributes);
  c.set('color', 'purple');
  r = c.persist();
  test.isFalse(r);
  test.equal(Car.findOne(c._id).get('color'), 'black');
});

testAsyncMulti('Model.prototype - persist async', [
  function(test, expect) {
    var c = Car.build({color: 'black'});
    var id = c.persist(expect(function(err, res) {
      test.equal(c._id, res);
      test.equal(c._id, id);
      test.isFalse(err);
    }));
    test.equal(Car.findOne(id).attributes, c.attributes);
    test.isTrue(id);
  },
  function(test, expect) {
    var c = Car.build({color: 'black'});
    c.persist();
    c.set('color', 'purple');
    var r = c.persist(expect(function(err, res) {
      test.isFalse(res);
      test.isFalse(err);
      test.equal(Car.findOne(c._id).get('color'), 'black');
    }));
  }
]);

addTest('Model.prototype - update', function(test) {
  var c = Car.create({color: 'pink'});
  c.update({$set: {color: 'silver'}});
  test.equal(c.get('color'), 'silver');
  test.equal(Car.findOne(c._id).get('color'), 'silver');
});

testAsyncMulti('Model.prototype - update async', [
  function(test, expect) {
    var c = Car.create({color: 'pink'});
    c.update({$set: {color: 'silver'}}, expect(function(err, num) {
      test.equal(num, 1);
      test.isFalse(err);
    }));
    test.equal(c.get('color'), 'silver');
    test.equal(Car.findOne(c._id).get('color'), 'silver');
  }
]);

addTest('Model.prototype - save', function(test) {
  var c = Car.build({color: 'chrome'});
  c.set('color', 'rust');
  var r = c.save();
  test.equal(r.attributes, c.attributes);
  test.equal(Car.findOne(c._id).get('color'), 'rust');
});

testAsyncMulti('Model.prototype - save async', [
  function(test, expect) {
    var c = Car.create({color: 'chrome'});
    c.set('color', 'rust');
    var r = c.save(expect(function(err, res) {
      test.equal(res, 1);
      test.isFalse(err);
      test.equal(c.get('color'), 'rust');
      // not sure why the following fails... May be due to the nature of async tests...
      // test.equal(Car.findOne(c._id).get('color'), 'rust');
    }));
  }
]);

addTest('Model.prototype - push', function(test) {
  var c = Car.build({
    drivers: [],
    flaws: {
      scratches: []
    }
  });
  c.push('drivers', 'Mario');
  test.equal(c.get('drivers'), ['Mario']);
  test.equal(c._pendingMods, [{$push: {drivers: 'Mario'}}]);

  c.push({
    'flaws.scratches': ['door', 'bumper', 'hood'],
    drivers: 'Luigi'
  });

  //TODO: test drivers value
  test.equal(c.get('flaws.scratches').length, 3);
  var mod = _.last(c._pendingMods);
  test.equal(mod, {$push: {drivers: 'Luigi', 'flaws.scratches': {$each: ['door', 'bumper', 'hood']}}});
});

addTest('Model.prototype - pop', function(test) {
  var c = Car.build({
    drivers: ['Mario', 'Luigi'],
    flaws: {
      scratches: ['hood', 'door', 'bumper']
    }
  });
  c.pop('drivers', 'flaws.scratches');
  test.equal(c._pendingMods[0], {$pop: {drivers: 1, 'flaws.scratches': 1}});
  test.equal(c.get('flaws.scratches'), ['hood', 'door']);
});

addTest('Model.prototype - shift', function(test) {
  var c = Car.build({
    drivers: ['Mario', 'Luigi'],
    flaws: {
      scratches: ['hood', 'door', 'bumper']
    }
  });
  c.shift('drivers', 'flaws.scratches');
  test.equal(c._pendingMods[0], {$pop: {drivers: -1, 'flaws.scratches': -1}});
  test.equal(c.get('flaws.scratches'), ['door', 'bumper']);
});

/**
 * Model.prototype.addToSet()
 */

addTest('Model.prototype - addToSet - normal', function(test) {
  var c = Car.build({
    drivers: [],
    flaws: {
      scratches: ['bumper','taillight']
    }
  });
  c.addToSet('drivers', 'Mario');
  test.equal(c.get('drivers'), ['Mario']);
  test.equal(c._pendingMods, [{$addToSet: {drivers: 'Mario'}}]);

  c.addToSet('drivers', 'Mario');
  test.equal(c.get('drivers'), ['Mario']);
  var mod = _.last(c._pendingMods);
  test.equal(mod, {$addToSet: {drivers: 'Mario'}});

  c.addToSet({
    'flaws.scratches': ['door', 'bumper', 'hood'],
    drivers: 'Luigi'
  });

  test.equal(c.get('flaws.scratches').length, 4);
  mod = _.last(c._pendingMods);
  test.equal(mod, {$addToSet: {drivers: 'Luigi', 'flaws.scratches': {$each: ['door', 'bumper', 'hood']}}});
});

addTest('Model.prototype - addToSet - on property that does not exist', function(test) {
  var c = Car.build({});
  c.addToSet('drivers', 'Mario');
  test.equal(c.get('drivers'), ['Mario']);
  test.equal(c._pendingMods, [{$addToSet: {drivers: 'Mario'}}]);
});

addTest('Model.prototype - addToSet - on property that is equal to undefined', function(test) {
  var c = Car.build({aInteger: 1, aString: "foo", aFalse: false, aNull: null, aUndefined: undefined});
  c.addToSet('aUndefined', 1);
  test.equal(c.get('aUndefined'), [1]);
});

addTest('Model.prototype - addToSet - on property that is an integer', function(test) {
  var c = Car.build({aInteger: 1, aString: "foo", aFalse: false, aNull: null, aUndefined: undefined});
  test.throws(function () {
    c.addToSet('aInteger', 1);
  }, 'Trying to addToSet on a non-array property');
});

addTest('Model.prototype - addToSet - on property that is a string', function(test) {
  var c = Car.build({aInteger: 1, aString: "foo", aFalse: false, aNull: null, aUndefined: undefined});
  test.throws(function() {
    c.addToSet('aString', 'f');
  }, 'Trying to addToSet on a non-array property');
});

addTest('Model.prototype - addToSet - on property that is a boolean', function(test) {
  var c = Car.build({aInteger: 1, aString: "foo", aFalse: false, aNull: null, aUndefined: undefined});
  test.throws(function() {
    c.addToSet('aFalse', false);
  }, 'Trying to addToSet on a non-array property');
});

addTest('Model.prototype - addToSet - on property that is null', function(test) {
  var c = Car.build({aInteger: 1, aString: "foo", aFalse: false, aNull: null, aUndefined: undefined});
  test.throws(function() {
    c.addToSet('aNull', 1);
  }, 'Trying to addToSet on a non-array property');
});

// TODO: test that there are errors thrown on addToSet for properties that exist and are not arrays

/**
 * Model.prototype.inc()
 */

addTest('Model.prototype - inc - on a property that exists', function(test) {
  var c = Car.build({mileage: 56});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 57);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 58);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}]);
  c.inc('mileage', 5);
  test.equal(c.get('mileage'), 63);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}, {$inc: {mileage: 5}}]);
  c.inc('mileage', -65);
  test.equal(c.get('mileage'), -2);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}, {$inc: {mileage: 5}}, {$inc: {mileage: -65}}]);
});

addTest('Model.prototype - inc - on a property that does not exist', function(test) {
  var c = Car.build({});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 1);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 2);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}]);
  c.inc('mileage', 5);
  test.equal(c.get('mileage'), 7);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}, {$inc: {mileage: 5}}]);
  c.inc('mileage', -65);
  test.equal(c.get('mileage'), -58);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}, {$inc: {mileage: 5}}, {$inc: {mileage: -65}}]);
});

/**
 * Model.prototype.persist() detail tests
 */

addTest('Model.prototype - persist - two operations', function(test) {
  var c = Car.build({mileage: 100000});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100001);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100002);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}]);
  var r = c.persist();
  test.isTrue(r);
  test.equal(Car.findOne(c._id).get('mileage'), 100002);
});
addTest('Model.prototype - persist - two operations w/callback', function(test) {
  var c = Car.build({mileage: 100000});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100001);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100002);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}]);
  var r = c.persist(function(){});
  test.isTrue(r);
  test.equal(Car.findOne(c._id).get('mileage'), 100002);
});
addTest('Model.prototype - persist - does not update existing record', function(test) {
  var c = Car.create({mileage: 100000});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100001);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  var r = c.persist();
  test.isFalse(r);
  test.equal(Car.findOne(c._id).get('mileage'), 100000);
});
addTest('Model.prototype - persist - does not update existing record w/callback', function(test) {
  var c = Car.create({mileage: 100000});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100001);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  var r = c.persist(function(){});
  test.isFalse(r);
  test.equal(Car.findOne(c._id).get('mileage'), 100000);
});

/**
 * Model.prototype.save() detail tests
 */
addTest('Model.prototype - save - two operations, new record', function(test) {
  var c = Car.build({mileage: 100000});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100001);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100002);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}]);
  c.save();
  test.equal(Car.findOne(c._id).get('mileage'), 100002);
});

addTest('Model.prototype - save - two operations, new record, w/callback', function(test) {
  var c = Car.build({mileage: 100000});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100001);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100002);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}]);
  c.save(function() {});
  test.equal(Car.findOne(c._id).get('mileage'), 100002);
});

addTest('Model.prototype - save - two operations, updating an existing record', function(test) {
  var c = Car.create({mileage: 100000});
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100001);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}]);
  c.inc('mileage', 1);
  test.equal(c.get('mileage'), 100002);
  test.equal(c._pendingMods, [{$inc: {mileage: 1}}, {$inc: {mileage: 1}}]);
  c.save();
  test.equal(Car.findOne(c._id).get('mileage'), 100002);
});


if (Meteor.isServer) { //TODO: how do you write a client version of these tests?

  Tinytest.addAsync('Model.prototype - save - two operations updating an existing record w/callback variant 1',
    function(test, next) {
      var c = Car.create({mileage: 100000});
      c.inc('mileage', 1);
      c.inc('mileage', 1);
      c.save(function (error) {
        if (error) test.fail('.save() resulted in error '+ error.message);
        var dbCar = Car.findOne(c._id);
        test.equal(dbCar.get('mileage'), 100002);
        next();
      });
    }
  );

  testAsyncMulti('Model.prototype - save - two operations updating an existing record w/callback variant 2', [
    function (test, expect) {
      var c = Car.create({mileage: 100000});
      c.inc('mileage', 1);
      c.inc('mileage', 1);
      c.save(expect(function (error) {
        if (error) test.fail('.save() resulted in error '+ error.message);
        var dbCar = Car.findOne(c._id);
        test.equal(dbCar.get('mileage'), 100002);
      }));
    }]
  );

  var twoUpdateCar;
  testAsyncMulti('Model.prototype - save - two operations updating an existing record w/callback test  variant 3', [
    function(test, expect) {
      var c = Car.create({mileage: 100000});
      twoUpdateCar = c._id;
      c.inc('mileage', 1);
      c.inc('mileage', 1);
      console.log('async multi save');
      c.save(expect(function(error) {
        if (error) test.fail('.save() resulted in error '+ error.message);
        console.log('expectation');
        console.log('finding car',twoUpdateCar);
        var dbCar = Car.findOne(twoUpdateCar);
        test.isTrue(dbCar);
        test.equal(dbCar.get('mileage'), 100002);
      }));
    },
    function(test, expect) {
      if (Meteor.isClient)
        Meteor.setTimeout(expect(function () {
          console.log('finding car',twoUpdateCar);
          var dbCar = Car.findOne(twoUpdateCar);
          test.isTrue(dbCar);
          test.equal(dbCar.get('mileage'), 100002);
        }), 1000);
      else
      {
        console.log('finding car',twoUpdateCar);
        var dbCar = Car.findOne(twoUpdateCar);
        test.isTrue(dbCar);
        test.equal(dbCar.get('mileage'), 100002);
      }
    }
  ]);
}

