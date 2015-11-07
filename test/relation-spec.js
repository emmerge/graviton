class ThingModel extends Graviton.Model {}
ThingModel.relations({
  belongsTo: {
    related: {
      collectionName: 'relation-test-foreign',
      field: 'otherId'
    }
  },
  hasMany: {
    widgets: {
      collectionName: 'relation-test-foreign',
      foreignKey: 'thingId'
    }
  }
});
var BaseCol = Graviton.define('relation-test-base');
var ForeignCol = Graviton.define('relation-test-foreign');
allowAll(BaseCol); allowAll(ForeignCol);

describe('Graviton.Relation', function() {
  describe('BelongsTo', function() {
    beforeEach(function() {
      resetDB();
      this.model = new ThingModel(BaseCol, {otherId: '123'});
      ForeignCol.insert({_id: '123'});
    });

    it('should do a findOne', function() {
      var relatedModel = this.model.related();
      expect(relatedModel._id).toEqual('123');
    });
  });

  describe('HasMany', function() {
    beforeEach(function() {
      resetDB();
      this.model = new ThingModel(BaseCol, {_id: '123'});
      ForeignCol.insert({thingId: '123'});
      ForeignCol.insert({thingId: '123'});
    });

    it('should find related documents', function() {
      var relation = this.model.widgets;
      console.log(relation);
      expect(relation.find().count()).toEqual(2);
    });
  });
});
