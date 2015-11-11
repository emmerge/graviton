class CarModel extends Graviton.Model {
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
this.CarModel = CarModel;

ElectricCarModel = CarModel.extend({
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

AmphibiousElectricCarModel = ElectricCarModel.extend({
  initialize: function() {
    ElectricCarModel.initialize.apply(this, arguments);
    this.depth = 100;
  }
});

FlyingElectricCarModel = ElectricCarModel.extend({
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
CarOwnerModel = Graviton.Model.extend({
  hasMany: {
    'model-test-cars': {
      foreignKey: 'carId'
    }
  }
});

CarOwner = Graviton.define('model-test-car-owners', {
  modelCls: CarOwnerModel
});
allowAll(CarOwner);

Car = Graviton.define('model-test-cars', {
  modelCls: {
    gas: CarModel,
    electric: ElectricCarModel,
    flying: FlyingElectricCarModel,
    boat: AmphibiousElectricCarModel
  },
  defaultType: 'gas'
});
allowAll(Car);

Person = Graviton.define('model-test-people');
allowAll(Person);

Battery = Graviton.define('model-test-batteries');
allowAll(Battery);

