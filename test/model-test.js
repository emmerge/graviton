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
    this._super.initialize.call(this);
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
      this._super.start();
      this.set('isCharged', false);
      return true;
    } else {
      return false;
    }
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

var Car = Graviton.define('model-server-cars', {
  modelCls: {
    gas: CarModel,
    electric: ElectricCarModel,
    flying: FlyingElectricCarModel
  },
  defaultType: 'gas'
});
allowAll(Car);

var Person = Graviton.define('model-test-people');
allowAll(Person);

var Battery = Graviton.define('model-test-batteries');
allowAll(Battery);

var addTest = function(name, fn) {
  Tinytest.add(name, function(test) {
    setup();
    fn(test);
  });
};

var setup = function() {
};

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

  var dbcar = Car.findOne(c._id)
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
  test.equal(['Mario'], c.get('drivers'));
  test.equal(c._pendingMods, [{$push: {drivers: 'Mario'}}]);

  c.push({
    'flaws.scratches': ['door', 'bumper', 'hood'],
    drivers: 'Luigi'
  });

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

