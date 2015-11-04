class CarModel extends Graviton.NModel {
  start () {
    this.set('isRunning', true);
    return true;
  }

  stop () {
    this.set('isRunning', false);
    return true;
  }
}
CarModel
.relations({
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
})
.defaults({
  isRunning: false
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

describe('Graviton', () => {

  it('should support class syntax', () => {

    let thing = new CarModel();

    expect(thing).to.be.an.instanceof(CarModel);
  });
});
