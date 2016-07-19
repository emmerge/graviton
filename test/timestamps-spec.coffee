
##############################################################
#                                                            #
#  Timestamp hooks should work on insert/upsert/update etc.  #
#                                                            #
##############################################################

describe 'Graviton - timestamps', ->

  # define
  HasTimestamps = Graviton.define 'has-timestamps',
    { modelCls: Graviton.Model, timestamps: true, timestampFormat: 'number'}

  # this doesn't seem to work??
  # HasTimestamps._ensureIndex({name: 1}, {unique: 1})

  # cleanup
  beforeEach -> HasTimestamps.remove {}

  it 'should get timestamps on create', ->
    record = HasTimestamps.create({name: 'create'})

    dbRecord = HasTimestamps.findOne(record._id)
    expect( dbRecord.get('name') ).to.equal 'create'
    expect( _.isNumber dbRecord.get('createdAt') ).to.equal true
    expect( _.isNumber dbRecord.get('updatedAt') ).to.equal true

  it 'should get timestamps on insert', ->
    recordId = HasTimestamps.insert({name: 'insert'})

    dbRecord = HasTimestamps.findOne(recordId)
    expect( dbRecord.get('name') ).to.equal 'insert'
    expect( _.isNumber dbRecord.get('createdAt') ).to.equal true
    expect( _.isNumber dbRecord.get('updatedAt') ).to.equal true

  it 'should get timestamps on update', ->
    # insert direct to not cause timestamps
    recordId = HasTimestamps.direct.insert({name: 'update soon'})
    # update normally to get an updated timestamp
    HasTimestamps.update(recordId, {$set: {name: 'update done'}})

    dbRecord = HasTimestamps.findOne(recordId)
    expect( dbRecord.get('name') ).to.equal 'update done'
    expect( dbRecord.get('createdAt') ).to.be.undefined
    expect( _.isNumber(dbRecord.get('updatedAt')) ).to.equal true

  it 'should get timestamps on set and save', ->

    # insert direct to not cause timestamps
    recordId = HasTimestamps.direct.insert name: 'set soon'
    # set/save normally to get an updated timestamp
    dbRecord = HasTimestamps.findOne recordId
    dbRecord.set name: 'set done'
    dbRecord.save()

    dbRecord = HasTimestamps.findOne recordId
    expect( dbRecord.get 'name' ).to.equal 'set done'
    expect( dbRecord.get 'createdAt' ).to.be.undefined
    expect( _.isNumber dbRecord.get 'updatedAt' ).to.equal true

  it 'should get timestamps on upsert [insert]', ->
    HasTimestamps.upsert(
      { name: 'upsert [insert]' },
      {
        $set: {setField: 'upsert [insert]'},
        $setOnInsert: {setOnInsertField: 'upsert [insert]'}
      }
    )

    dbRecord = HasTimestamps.findOne({name: 'upsert [insert]'})
    expect( dbRecord.get('setField') ).to.equal 'upsert [insert]'
    expect( dbRecord.get('setOnInsertField') ).to.equal 'upsert [insert]'
    expect( _.isNumber(dbRecord.get('createdAt')) ).to.equal true
    expect( _.isNumber(dbRecord.get('updatedAt')) ).to.equal true

  it 'should get timestamps on upsert [update]', ->
    # upsert direct to not cause timestamps on the "insert" upsert
    HasTimestamps.direct.upsert(
      { name: 'upsert [update]' },
      {
        $set: {setField: 'upsert [update soon]'},
        $setOnInsert: {setOnInsertField: 'upsert [update soon]'}
      }
    )

    # upsert normally to so we get an updated timestamp on the "update" upsert
    HasTimestamps.upsert(
      { name: 'upsert [update]' },
      {
        $set: {setField: 'upsert [update done]'},
        $setOnInsert: {setOnInsertField: 'upsert [update done]'}
      }
    )

    # make sure only one record was inserted
    expect( HasTimestamps.find({name: 'upsert [update]'}).count() ).to.equal 1

    dbRecord = HasTimestamps.findOne({name: 'upsert [update]'})
    # ensure the set field changed
    expect( dbRecord.get('setField') ).to.equal 'upsert [update done]'
    # ensure the set on insert field did not change
    expect( dbRecord.get('setOnInsertField') ).to.equal 'upsert [update soon]'
    expect( dbRecord.get('createdAt')).to.be.undefined
    expect( _.isNumber(dbRecord.get('updatedAt'))).to.equal true


##############################################################
#                                                            #
#  Timestamp hooks should work on insert/upsert/update etc.  #
#  even when other are hooks defined on the collection.      #
#                                                            #
##############################################################


describe 'Graviton - timestamps w/ other hooks', ->
  # define
  HasTimestampsAndHooks = Graviton.define 'has-timestamps-and-hooks', {
    modelCls: Graviton.Model,
    timestamps: true,
    timestampFormat: 'number'
  }
  HasTimestampsAndHooks.before.insert (userId, doc) ->
    doc.insertHook = 'happened'
  HasTimestampsAndHooks.before.upsert (userId, selector, modifier) ->
    Graviton.setProperty(modifier, '$set.upsertHook', 'happened')
    Graviton.setProperty(modifier, '$setOnInsert.upsertInsertHook', 'happened')
  HasTimestampsAndHooks.before.update (userId, doc, fieldNames, modifier) ->
    Graviton.setProperty(modifier, '$set.updateHook', 'happened')

  # this doesn't seem to work??
  # HasTimestampsAndHooks._ensureIndex({name: 1}, {unique: 1})

  # cleanup
  beforeEach -> HasTimestampsAndHooks.remove({})

  it 'Graviton - timestamps - with other hooks - insert', ->
    recordId = HasTimestampsAndHooks.insert({name: 'insert'})

    dbRecord = HasTimestampsAndHooks.findOne(recordId)

    expect( dbRecord.get('name') ).to.equal 'insert'

    expect( dbRecord.get('insertHook') ).to.equal 'happened'
    expect( dbRecord.get('upsertHook') ).to.be.undefined
    expect( dbRecord.get('upsertInsertHook') ).to.be.undefined
    expect( dbRecord.get('updateHook') ).to.be.undefined

    expect( _.isNumber(dbRecord.get('createdAt')) ).to.equal true
    expect( _.isNumber(dbRecord.get('updatedAt')) ).to.equal true

  it 'Graviton - timestamps - with other hooks - update', ->
    # insert direct to not cause timestamps
    recordId = HasTimestampsAndHooks.direct.insert({name: 'update soon'})

    # update normally to get an updated timestamp
    HasTimestampsAndHooks.update(recordId, {$set: {name: 'update done'}})

    dbRecord = HasTimestampsAndHooks.findOne(recordId)

    expect( dbRecord.get('name') ).to.equal 'update done'

    expect( dbRecord.get('insertHook') ).to.be.undefined
    expect( dbRecord.get('upsertHook') ).to.be.undefined
    expect( dbRecord.get('upsertInsertHook') ).to.be.undefined
    expect( dbRecord.get('updateHook') ).to.equal 'happened'

    expect( dbRecord.get('createdAt') ).to.be.undefined
    expect( _.isNumber(dbRecord.get('updatedAt')) ).to.equal true

  it 'Graviton - timestamps - with other hooks - upsert [insert]', ->
    HasTimestampsAndHooks.upsert(
      { name: 'upsert [insert]' },
      {
        $set: {setField: 'upsert [insert]'},
        $setOnInsert: {setOnInsertField: 'upsert [insert]'}
      }
    )

    dbRecord = HasTimestampsAndHooks.findOne({ name: 'upsert [insert]' })

    expect( dbRecord.get('name') ).to.equal 'upsert [insert]'
    expect( dbRecord.get('setField') ).to.equal 'upsert [insert]'
    expect( dbRecord.get('setOnInsertField') ).to.equal 'upsert [insert]'

    expect( dbRecord.get('insertHook') ).to.be.undefined
    expect( dbRecord.get('upsertHook') ).to.equal 'happened'
    expect( dbRecord.get('upsertInsertHook') ).to.equal 'happened'
    expect( dbRecord.get('updateHook') ).to.be.undefined

    expect( _.isNumber(dbRecord.get('createdAt')) ).to.equal true
    expect( _.isNumber(dbRecord.get('updatedAt')) ).to.equal true

  it 'Graviton - timestamps - with other hooks - upsert [update]', ->
    # upsert direct to not cause timestamps on the "insert" upsert
    HasTimestampsAndHooks.direct.upsert(
      { name: 'upsert [update]' },
      {
        $set: {setField: 'upsert [update soon]'},
        $setOnInsert: {setOnInsertField: 'upsert [update soon]'}
      }
    )

    # upsert normally to so we get an updated timestamp on the "update" upsert
    HasTimestampsAndHooks.upsert(
      { name: 'upsert [update]' },
      {
        $set: {setField: 'upsert [update done]'},
        $setOnInsert: {setOnInsertField: 'upsert [update done]'}
      }
    )

    # make sure only one record was inserted
    expect( HasTimestampsAndHooks.find({name: 'upsert [update]'}).count() ).to.equal 1

    dbRecord = HasTimestampsAndHooks.findOne({name: 'upsert [update]'})

    # ensure the set field changed
    expect( dbRecord.get('setField') ).to.equal 'upsert [update done]'
    # ensure the set on insert field did not change
    expect( dbRecord.get('setOnInsertField') ).to.equal 'upsert [update soon]'

    expect( dbRecord.get('insertHook') ).to.be.undefined
    expect( dbRecord.get('upsertHook') ).to.equal 'happened'
    expect( dbRecord.get('upsertInsertHook') ).to.be.undefined
    expect( dbRecord.get('updateHook') ).to.be.undefined

    expect( dbRecord.get('createdAt') ).to.be.undefined
    expect( _.isNumber(dbRecord.get('updatedAt')) ).to.equal true
