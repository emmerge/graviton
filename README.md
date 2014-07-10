graviton
========

Relations and models for Meteor collections.

Allows you to:

* Define relationships between collections.
* Traverse and retrieve related models.
* Tansform your mongo docs into models with attributes and methods.
* Use other mrt packages to handle validation (meteor-simple-schema) hooks (meteor-collection-hooks) and relational pub/sub (reactive-relations).
 
Collections defined with Graviton automatically convert retreieved objects into models. You specify the type(s) when define the collection. Passing {transform: null} to find() etc. will bypass model transformation. The raw document is stored in model.attributes. Use built-in transformation methods like set, push, pop to make changes to your model locally. Call model.save() to persist changes to the database. All methods work on both server and client.

# API Docs

## Meteor.Collection.prototype
The following are added to all your meteor collections:
* `all()` alias to find().fetch()
* `build()` returns a new local Gravition.Model based on your collection definition. Does not save to db.
* `create()` calls build() to generate a Model then inserts it into the db.

## Graviton
* `define(collectionName, options)` Use to define your collections. Returns a Meteor.Collection instantiated with a transform function based on the options passed.
  Options:
    * `persist` passing false will define a local collection. default=true
    * 

# Example

coming soon



