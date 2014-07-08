var CarModel = Graviton.Model.extend({
  defaults: {
    isRunning: false
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

var ElectricCarModel = Graviton.Model.extend({
  defaults: {
    isCharged: false
  },
  initialize: function() {
    this.volume = 0;
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

var Car = Graviton.define('model-server-cars', {
  modelCls: {
    gas: CarModel,
    electric: ElectricCarModel
  },
  defaults: {
    _type: 'gas'
  }
});
allowAll(Car);

var addTest = function(name, fn) {
  Tinytest.add(name, function(test) {
    setup();
    fn(test);
  });
};

var setup = function() {
};

Tinytest.add('Collection - build', function(test) {
  var c = Car.build();
  var c2 = Car.build({});
  test.equal(c, c2);

  c = Car.build({color: 'red'});
  test.equal(c.get('color'), 'red');
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
    var c = Car.build({color: 'chrome'});
    c.set('color', 'rust');
    var r = c.save(expect(function(err, res) {
      // test.equal(res, 1);
      // test.isFalse(err);
    }));
  }
]);
