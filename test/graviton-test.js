var init = function(klass) {
  allowAll(klass);
  if (Meteor.isServer) {
    klass.remove({});
  }
};

var allowAll = function(klass) {
  klass.allow({
    insert: function(userId, model) {
      return true;
    },
    update: function (userId, doc, fields, modifier) {
      return true;
    },
    remove: function (userId, doc) {
      return true;
    }
  });
};

Car = Model.Car = Model.define("cars", {
  initialize: function() {
    this.set('price', this.get('price') - 2);
  },
  hasMany: {
    wheels: {
      klass: 'Wheel',
      foreignKey: 'carId'
    }
  },
  belongsToMany: {
    drivers: {
      klass: 'Driver',
      field: 'driverIds',
      cls: Driver
    }
  },
  embeds: {
    plate: {
      klass: 'Plate'
    }
  },
  embedsMany: {
    windows: {
      klass: 'Window'
    }
  }
});
init(Car);

Wheel = Model.Wheel = Model.define("wheels", {
  defaults: {
    tread: 'new'
  },
  belongsTo: {
    car: {
      klass: 'Car',
      field: 'carId'
    }
  }
});
init(Wheel);

Driver = Model.Driver = Model.define("drivers", {
  hasMany: {
    cars: {
      klass: 'Car',
      foreignKey: 'driverIds'
    }
  }
});
init(Driver);

Plate = Model.Plate = Model.define(null, {

});

Window = Model.Window = Model.define(null, {

});


var doc = {color: 'red', speed: 'fast', price: 100, engine: {type: 'combustion', cylinders: 8}};
doc._id = Car.insert(doc);

var c = Car.findOne(doc._id);
if (Meteor.isClient) window.c = c;

c.wheels.add({});
c.wheels.add([{}, {tread: 'worn'}, {}]);

var w = Wheel.build({});
w.save();

w.set("isFlat", true);
w.save();

c.drivers.add({name: "Mario"});
c.drivers.add({name: "Dale"});

c.set("plate", {code: "BASFACE"});

c.windows.add([
  {type: "windshield"},
  {type: "frontDriver"},
  {type: "frontPassenger"},
  {type: "rear"}
]);







Tinytest.add('Model - initialize', function(test) {
  test.equal(c.get('price'), 98);
  test.equal(c._klass._name, 'cars');
  test.equal(doc.color, c.attributes.color);
  test.equal(doc.engine.type.cylinders, c.get('engine.type.cylinders'));
});

Tinytest.add('Model - defaults', function(test) {
  test.equal(w.get("tread"), "new");
});

Tinytest.add('Model - save', function(test) {
  test.equal(_.isString(w._id), true);
  var flat = Wheel.findOne({isFlat: true});
  test.equal((flat instanceof Model), true);
});

Tinytest.add('Relations - hasMany', function(test) {
  test.equal(c.wheels.klass()._name, 'wheels');
  test.equal(c.wheels.find().count(), 4);
  test.equal(c.wheels.all().length, c.wheels.find().count());
  test.equal(c.wheels.find({tread: 'new'}).count(), 3);
  test.equal(Driver.findOne().cars.findOne()._id, c._id);
});

Tinytest.add('Relations - belongsTo', function(test) {
  test.equal(c.wheels.findOne().car()._id, c._id);
});

Tinytest.add('Relations - belongsToMany', function(test) {
  test.equal(c.drivers.find().count(), 2);
  test.equal(_.isArray(c.get("driverIds")), true);
});

Tinytest.add('Relations - embeds', function(test) {
  test.isTrue(c.plate() instanceof Model);
  test.equal(c.plate().get("code"), "BASFACE");
});

Tinytest.add('Relations - embedsMany', function(test) {
  test.isTrue(c.windows.at(0) instanceof Model);
  test.equal(c.windows.all().length, 4);
  test.equal(c.windows.at(2).get("type"), "frontPassenger");
  test.equal(c.get("windows").length, 4);
 }); 