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

Car = Model.define("cars", {
  initialize: function() {
    this.set('price', this.get('price') - 2);
  },
  hasMany: {
    wheels: {
      klass: 'wheels',
      foreignKey: 'carId'
    }
  }
});
allowAll(Car);

Wheel = Model.define("wheels", {
  defaults: {
    tread: 'new'
  },
  belongsTo: {
    car: {
      klass: 'cars',
      field: 'carId'
    }
  }
});
allowAll(Wheel);



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
  test.equal(c.wheels.findOne()._id, c.wheels.findOne()._id);
});

Tinytest.add('Relations - belongsTo', function(test) {
  test.equal(c.wheels.findOne().car()._id, c._id);
});

