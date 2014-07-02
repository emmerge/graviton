graviton
========

Relations and models for Meteor collections.

Allows you to:

* Define relationships between collections.
* Traverse and retrieve related models.
* Tansform your mongo docs into models with instance properties and functions.
* Use other mrt packages to handle validation (meteor-simple-schema) hooks (meteor-collection-hooks) and relational pub/sub (reactive-relations).
 
Similar to minimongoid but instead of extending a model class with coffeescript, use Model.define to create a Meteor.Collection with a transform option that converts all documents into your models wih your custom properties and methods for accessing related models.

The raw document is stored in model.attributes and the un-transformed model can be accessed via model.plain()

# Example

coming soon



