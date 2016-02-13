
////////////////////////////////////////////////////////////////
//                                                            //
//  Timestamp hooks should work on insert/upsert/update etc.  //
//                                                            //
////////////////////////////////////////////////////////////////

// define
var HasTimestamps = Graviton.define('has-timestamps', {
  modelCls: Graviton.Model,
  timestamps: true
});

// cleanup
HasTimestamps.remove({});

// this doesn't seem to work??
// HasTimestamps._ensureIndex({name: 1}, {unique: 1});

Tinytest.add('Graviton - timestamps - create', function(test) {
  var record = HasTimestamps.create({name: 'create'});

  var dbRecord = HasTimestamps.findOne(record._id);
  test.equal(dbRecord.get('name'), 'create');
  test.isTrue(_.isNumber(dbRecord.get('createdAt')));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - insert', function(test) {
  var recordId = HasTimestamps.insert({name: 'insert'});

  var dbRecord = HasTimestamps.findOne(recordId);
  test.equal(dbRecord.get('name'), 'insert');
  test.isTrue(_.isNumber(dbRecord.get('createdAt')));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - update', function(test) {
  // insert direct to not cause timestamps
  var recordId = HasTimestamps.direct.insert({name: 'update soon'});
  // update normally to get an updated timestamp
  HasTimestamps.update(recordId, {$set: {name: 'update done'}});

  var dbRecord = HasTimestamps.findOne(recordId);
  test.equal(dbRecord.get('name'), 'update done');
  test.isUndefined(dbRecord.get('createdAt'));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - set & save', function(test) {
  // insert direct to not cause timestamps
  var recordId = HasTimestamps.direct.insert({name: 'set soon'});
  // set/save normally to get an updated timestamp
  var dbRecord = HasTimestamps.findOne(recordId);
  dbRecord.set({name: 'set done'});
  dbRecord.save();

  dbRecord = HasTimestamps.findOne(recordId);
  test.equal(dbRecord.get('name'), 'set done');
  test.isUndefined(dbRecord.get('createdAt'));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - upsert [insert]', function(test) {
  HasTimestamps.upsert(
    { name: 'upsert [insert]' },
    {
      $set: {setField: 'upsert [insert]'},
      $setOnInsert: {setOnInsertField: 'upsert [insert]'}
    }
  );

  var dbRecord = HasTimestamps.findOne({name: 'upsert [insert]'});
  test.equal(dbRecord.get('setField'), 'upsert [insert]');
  test.equal(dbRecord.get('setOnInsertField'), 'upsert [insert]');
  test.isTrue(_.isNumber(dbRecord.get('createdAt')));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - upsert [update]', function(test) {
  // upsert direct to not cause timestamps on the "insert" upsert
  HasTimestamps.direct.upsert(
    { name: 'upsert [update]' },
    {
      $set: {setField: 'upsert [update soon]'},
      $setOnInsert: {setOnInsertField: 'upsert [update soon]'}
    }
  );

  // upsert normally to so we get an updated timestamp on the "update" upsert
  HasTimestamps.upsert(
    { name: 'upsert [update]' },
    {
      $set: {setField: 'upsert [update done]'},
      $setOnInsert: {setOnInsertField: 'upsert [update done]'}
    }
  );

  // make sure only one record was inserted
  test.equal(HasTimestamps.find({name: 'upsert [update]'}).count(), 1);

  var dbRecord = HasTimestamps.findOne({name: 'upsert [update]'});
  // ensure the set field changed
  test.equal(dbRecord.get('setField'), 'upsert [update done]');
  // ensure the set on insert field did not change
  test.equal(dbRecord.get('setOnInsertField'), 'upsert [update soon]');
  test.isUndefined(dbRecord.get('createdAt'));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});


////////////////////////////////////////////////////////////////
//                                                            //
//  Timestamp hooks should work on insert/upsert/update etc.  //
//  even when other are hooks defined on the collection.      //
//                                                            //
////////////////////////////////////////////////////////////////

// define
var HasTimestampsAndHooks = Graviton.define('has-timestamps-and-hooks', {
  modelCls: Graviton.Model,
  timestamps: true
});

HasTimestampsAndHooks.before.insert(function(userId, doc) {
  doc.insertHook = 'happened';
});
HasTimestampsAndHooks.before.upsert(function(userId, selector, modifier) {
  Graviton.setProperty(modifier, '$set.upsertHook', 'happened');
  Graviton.setProperty(modifier, '$setOnInsert.upsertInsertHook', 'happened');
});
HasTimestampsAndHooks.before.update(function(userId, doc, fieldNames, modifier) {
  Graviton.setProperty(modifier, '$set.updateHook', 'happened');
});

// cleanup
HasTimestampsAndHooks.remove({});

Tinytest.add('Graviton - timestamps - with other hooks - insert', function(test) {
  var recordId = HasTimestampsAndHooks.insert({name: 'insert'});

  var dbRecord = HasTimestampsAndHooks.findOne(recordId);

  test.equal(dbRecord.get('name'), 'insert');

  test.equal(dbRecord.get('insertHook'), 'happened');
  test.isUndefined(dbRecord.get('upsertHook'));
  test.isUndefined(dbRecord.get('upsertInsertHook'));
  test.isUndefined(dbRecord.get('updateHook'));

  test.isTrue(_.isNumber(dbRecord.get('createdAt')));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - with other hooks - update', function(test) {
  // insert direct to not cause timestamps
  var recordId = HasTimestampsAndHooks.direct.insert({name: 'update soon'});

  // update normally to get an updated timestamp
  HasTimestampsAndHooks.update(recordId, {$set: {name: 'update done'}});

  var dbRecord = HasTimestampsAndHooks.findOne(recordId);

  test.equal(dbRecord.get('name'), 'update done');

  test.isUndefined(dbRecord.get('insertHook'));
  test.isUndefined(dbRecord.get('upsertHook'));
  test.isUndefined(dbRecord.get('upsertInsertHook'));
  test.equal(dbRecord.get('updateHook'), 'happened');

  test.isUndefined(dbRecord.get('createdAt'));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - with other hooks - upsert [insert]', function(test) {
  HasTimestampsAndHooks.upsert(
    { name: 'upsert [insert]' },
    {
      $set: {setField: 'upsert [insert]'},
      $setOnInsert: {setOnInsertField: 'upsert [insert]'}
    }
  );

  var dbRecord = HasTimestampsAndHooks.findOne({ name: 'upsert [insert]' });

  test.equal(dbRecord.get('name'), 'upsert [insert]');
  test.equal(dbRecord.get('setField'), 'upsert [insert]');
  test.equal(dbRecord.get('setOnInsertField'), 'upsert [insert]');

  test.isUndefined(dbRecord.get('insertHook'));
  test.equal(dbRecord.get('upsertHook'), 'happened');
  test.equal(dbRecord.get('upsertInsertHook'), 'happened');
  test.isUndefined(dbRecord.get('updateHook'));

  test.isTrue(_.isNumber(dbRecord.get('createdAt')));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});

Tinytest.add('Graviton - timestamps - with other hooks - upsert [update]', function(test) {
  // upsert direct to not cause timestamps on the "insert" upsert
  HasTimestampsAndHooks.direct.upsert(
    { name: 'upsert [update]' },
    {
      $set: {setField: 'upsert [update soon]'},
      $setOnInsert: {setOnInsertField: 'upsert [update soon]'}
    }
  );

  // upsert normally to so we get an updated timestamp on the "update" upsert
  HasTimestampsAndHooks.upsert(
    { name: 'upsert [update]' },
    {
      $set: {setField: 'upsert [update done]'},
      $setOnInsert: {setOnInsertField: 'upsert [update done]'}
    }
  );

  // make sure only one record was inserted
  test.equal(HasTimestampsAndHooks.find({name: 'upsert [update]'}).count(), 1);

  var dbRecord = HasTimestampsAndHooks.findOne({name: 'upsert [update]'});

  // ensure the set field changed
  test.equal(dbRecord.get('setField'), 'upsert [update done]');
  // ensure the set on insert field did not change
  test.equal(dbRecord.get('setOnInsertField'), 'upsert [update soon]');

  test.isUndefined(dbRecord.get('insertHook'));
  test.equal(dbRecord.get('upsertHook'), 'happened');
  test.isUndefined(dbRecord.get('upsertInsertHook'));
  test.isUndefined(dbRecord.get('updateHook'));

  test.isUndefined(dbRecord.get('createdAt'));
  test.isTrue(_.isNumber(dbRecord.get('updatedAt')));
});
