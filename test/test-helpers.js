allowAll = function(klass) {
  if (Meteor.isServer) {
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
  }
};