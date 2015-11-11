
var _klasses = [];

var init = function(klass) {
  allowAll(klass);
  _klasses.push(klass);
};

var CarModel = Graviton.Model.extend({
  initialize: function() {
    this.set('price', this.get('price') - 2);
  },
  belongsTo: {
    owner: {
      collectionName: 'rt-people',
      foreignKey: 'ownerId'
    }
  },
  belongsToMany: {
    drivers: {
      collectionName: 'rt-drivers',
      field: 'driverIds'
    }
  },
  hasOne: {
    manufacturer: {
      collectionName: 'rt-manufacturers',
      foreignKey: 'carId'
    }
  },
  hasMany: {
    wheels: {
      collectionName: 'rt-wheels',
      foreignKey: 'carId'
    }
  },
  embeds: {
    plate: {
      collectionName: 'rt-plates'
    }
  },
  embedsMany: {
    windows: {
      collectionName: 'rt-windows'
    }
  }
});

var Car = Graviton.define("rt-cars", {
  modelCls: CarModel
});
init(Car);

var Mfr = Graviton.define("rt-manufacturers", {});
init(Mfr);

var WheelModel = Graviton.Model.extend({
  defaults: {
    tread: 'new'
  },
  belongsTo: {
    car: {
      klass: 'rt-cars',
      field: 'carId'
    }
  },
  hasOne: {
    rim: {
      klass: 'rt-rims',
      foreignKey: 'wheelId'
    }
  }
});

var Wheel = Graviton.define("rt-wheels", {
  modelCls: WheelModel
});
init(Wheel);

var Rim = Graviton.define("rt-rims", {});
init(Rim);

var DriverModel = Graviton.Model.extend({
  hasMany: {
    cars: {
      klass: 'rt-cars',
      foreignKey: 'driverIds'
    }
  }
});

var Driver = Graviton.define("rt-drivers", {
  modelCls: DriverModel
});
init(Driver);

var Plate = Graviton.define("rt-plates", {
  persist: false // sends null as mongo collection name to Mongo.Collection
});

var Window = Graviton.define("rt-windows", {
  persist: false
});

var Person = Graviton.define("rt-people");
init(Person);

////////////// setup
var doc, c, w;
var setup = function() {
  if (Meteor.isServer) {
    _.each(_klasses, function(klass) {
      klass.remove({});
    });
  }

  doc = {color: 'red', speed: 'fast', price: 100, engine: {type: 'combustion', cylinders: 8}};
  doc._id = Car.insert(doc);

  c = Car.findOne(doc._id);

  c.manufacturer({name: "Audi", location: "Germany"});

  c.wheels.add({});
  c.wheels.add([{}, {tread: 'worn'}, {}]);

  w = Wheel.build({});
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
};
////////////////////

setup();



Tinytest.add('Relations - hasMany', function(test) {
  setup();
  test.equal(c.wheels._collection._name, 'rt-wheels');
  test.equal(c.wheels.find().count(), 4);
  test.equal(c.wheels.all().length, c.wheels.find().count());
  test.equal(c.wheels.find({tread: 'new'}).count(), 3);
  test.equal(c.drivers.findOne().cars.find().count(), 1);
});

Tinytest.add('Relations - hasOne', function(test) {
  setup();
  test.isTrue(c.manufacturer() instanceof Graviton.Model);
  var mfr = Mfr.findOne({carId: c._id});
  test.equal(mfr._id, c.manufacturer()._id);
});

Tinytest.add('Relations - belongsTo', function(test) {
  setup();
  test.equal(c.wheels.findOne().car()._id, c._id);
});

Tinytest.add('Relations - belongsToMany', function(test) {
  setup();
  test.equal(c.drivers.find().count(), 2);
  test.equal(_.isArray(c.get("driverIds")), true);
  
  var driver = c.drivers.findOne();
  c.drivers.remove(driver);
  test.equal(c.drivers.find().count(), 1);
  c.drivers.remove(c.drivers.findOne()._id);
  test.equal(c.drivers.find().count(), 0);

  c.drivers.toggle({name: "BAMF"});
  test.equal(c.drivers.find().count(), 1);
  c.drivers.toggle(c.drivers.findOne());
  test.equal(c.drivers.find().count(), 0);

  c.drivers.add([{name: "a"}, {name: "b"}, {name: "c"}]);
  var d = c.drivers.findOne();
  var cur = c.drivers.find({_id: {$ne: d._id}});
  test.equal(cur.count(), 2);
});

Tinytest.add('Relations - embeds', function(test) {
  setup();
  test.isTrue(c.plate() instanceof Graviton.Model);
  test.equal(c.plate().get("code"), "BASFACE");
});

Tinytest.add('Relations - embedsMany', function(test) {
  setup();
  test.isTrue(c.windows.at(0) instanceof Graviton.Model);
  test.equal(c.windows.all().length, 4);
  test.equal(c.windows.at(2).get("type"), "frontPassenger");
  test.equal(c.get("windows").length, 4);
  var w = c.windows.at(2);
  test.equal(c.windows.indexOf(w), 2);
  test.equal(c.windows.indexOf({}), -1);

  c.windows.remove(w);
  test.equal(c.windows.all().length, 3);
 });
