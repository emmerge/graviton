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

/* jshint -W083 */
resetDB = function() {
  for (let name of Object.keys(Graviton._collections)) {
    let col = Graviton._collections[name];
    if (Meteor.isServer) {
      col.remove({});
    } else {
      col.find({}, {transform: null}).forEach((doc) => {
        col.remove({_id: doc._id});
      });
    }
  }
};
