/**
 * quick test to make sure async.series and parallel work as we expect
 */
Tinytest.addAsync("packages - async - series()", function(test, next) {
  var foo = '';
  var f1 = function(cb) {
    Meteor.setTimeout(function() {
      foo += 'First';
      cb();
    }, 500);
  };
  var f2 = function(cb) {
    Meteor.setTimeout(function(){
      foo += 'Second';
      cb();
    }, 1);
  };
  var done = function() {
    test.equal(foo, 'FirstSecond'); next();
  };

  async.series([f1, f2], done);
});

Tinytest.addAsync("packages - async - parallel()", function(test, next) {
  var foo = '';
  var f1 = function(cb) {
    Meteor.setTimeout(function() {
      foo += 'First';
      cb();
    }, 500);
  };
  var f2 = function(cb) {
    Meteor.setTimeout(function(){
      foo += 'Second';
      cb();
    }, 1);
  };
  var done = function() {
    test.equal(foo, 'SecondFirst'); next();
  };

  async.parallel([f1, f2], done);
});