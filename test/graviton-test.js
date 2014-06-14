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

Car = Graviton.Car = Graviton.define("cars", {
  initialize: function() {
    this.set('price', this.get('price') - 2);
  },
  hasMany: {
    wheels: {
      klass: 'wheels',
      foreignKey: 'carId'
    }
  },
  hasOne: {
    manufacturer: {
      klass: 'manufacturers',
      foreignKey: 'carId'
    }
  },
  belongsToMany: {
    drivers: {
      klass: 'drivers',
      field: 'driverIds'
    }
  },
  embeds: {
    plate: {
      klass: 'plates'
    }
  },
  embedsMany: {
    windows: {
      klass: 'windows'
    }
  }
});
init(Car);

Mfr = Graviton.define("manufacturers", {});
init(Mfr);

Wheel = Graviton.define("wheels", {
  defaults: {
    tread: 'new'
  },
  belongsTo: {
    car: {
      klass: 'cars',
      field: 'carId'
    }
  },
  hasOne: {
    rim: {
      klass: 'rims',
      foreignKey: 'wheelId'
    }
  }
});
init(Wheel);

Rim = Graviton.define("rims", {});
init(Rim);

Driver = Graviton.define("drivers", {
  hasMany: {
    cars: {
      klass: 'cars',
      foreignKey: 'driverIds'
    }
  }
});
init(Driver);

Plate = Graviton.define("plates", {
  persist: false // sends null as mongo collection name to Meteor.Collection
});

Window = Graviton.define("windows", {
  persist: false
});


var doc = {color: 'red', speed: 'fast', price: 100, engine: {type: 'combustion', cylinders: 8}};
doc._id = Car.insert(doc);

var c = Car.findOne(doc._id);
if (Meteor.isClient) window.c = c;

c.manufacturer({name: "Audi", location: "Germany"});

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
  test.equal(c._collection._name, 'cars');
  test.equal(doc.color, c.attributes.color);
  test.equal(doc.engine.type.cylinders, c.get('engine.type.cylinders'));
});

Tinytest.add('Model - defaults', function(test) {
  test.equal(w.get("tread"), "new");
});

Tinytest.add('Model - save', function(test) {
  test.equal(_.isString(w._id), true);
  var flat = Wheel.findOne({isFlat: true});
  test.equal((flat instanceof Graviton.Model), true);
});

Tinytest.add('Relations - hasMany', function(test) {
  test.equal(c.wheels._collection._name, 'wheels');
  test.equal(c.wheels.find().count(), 4);
  test.equal(c.wheels.all().length, c.wheels.find().count());
  test.equal(c.wheels.find({tread: 'new'}).count(), 3);
  test.equal(Driver.findOne().cars.findOne()._id, c._id);
});

Tinytest.add('Relations - hasOne', function(test) {
  test.isTrue(c.manufacturer() instanceof Graviton.Model);
  var mfr = Mfr.findOne();
  test.equal(mfr._id, c.manufacturer()._id);
});

Tinytest.add('Relations - belongsTo', function(test) {
  test.equal(c.wheels.findOne().car()._id, c._id);
});

Tinytest.add('Relations - belongsToMany', function(test) {
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
  test.isTrue(c.plate() instanceof Graviton.Model);
  test.equal(c.plate().get("code"), "BASFACE");
});

Tinytest.add('Relations - embedsMany', function(test) {
  test.isTrue(c.windows.at(0) instanceof Graviton.Model);
  test.equal(c.windows.all().length, 4);
  test.equal(c.windows.at(2).get("type"), "frontPassenger");
  test.equal(c.get("windows").length, 4);
 });
