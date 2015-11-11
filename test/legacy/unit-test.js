
var doMongoSanitizeTest = function(test, str, expected) {
  var result = Graviton.mongoSanitize(str);
  test.equal(result, expected, 'forward mongo sanitize');
  var reverseResult = Graviton.reverseMongoSanitize(result);
  test.equal(reverseResult, str, 'reverse mongo sanitize');
};

Tinytest.add('Graviton - mongoSanitize basic', function(test) {
  var str = 'foo@bar.com';
  var expected = 'foo@@bar@com';
  doMongoSanitizeTest(test, str, expected);
});
Tinytest.add('Graviton - mongoSanitize starts & ends with .', function(test) {
  var str = '.foo@bar.com.';
  var expected = '@foo@@bar@com@';
  doMongoSanitizeTest(test, str, expected);
});
Tinytest.add('Graviton - mongoSanitize starts & ends with @', function(test) {
  var str = '@foo@bar.com@';
  var expected = '@@foo@@bar@com@@';
  doMongoSanitizeTest(test, str, expected);
});
Tinytest.add('Graviton - mongoSanitize starts $', function(test) {
  var str = '$foo@bar.com@';
  var expected = '#foo@@bar@com@@';
  doMongoSanitizeTest(test, str, expected);
});
Tinytest.add('Graviton - mongoSanitize starts #', function(test) {
  var str = '#foo@bar.com@';
  var expected = '##foo@@bar@com@@';
  doMongoSanitizeTest(test, str, expected);
});

// TODO: add tests when mongo sanitize is refactored.
// '$#foo' vs '#foo'
// 'foo@.bar' vs 'foo.@bar'
// 'foo..bar' vs 'foo@bar'
