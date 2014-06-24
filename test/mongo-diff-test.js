var lhs = {
  name: 'my object',
  description: 'it\'s an object!',
  details: {
    it: 'has',
    an: 'array',
    with: ['a', 'few', 'elements'],
    array: ['inside', {another: ['array']}]
  }
};

var rhs = {
  name: 'updated object',
  description: 'it\'s an object!',
  details: {
    it: 'has',
    an: 'array',
    with: ['a', 'few', 'more', 'elements', { than: 'before' }],
    array: ['inside', {another: ['array', 'should not be tested']}]
  }
};


var expected = {
  $set: {
    name: 'updated object',
    'details.with': ['a', 'few', 'more', 'elements', { than: 'before' }],
    'details.array': ['inside', {another: ['array', 'should not be tested']}]
  }
};

var mongoDiff = Graviton.mongoDiff(lhs, rhs);


Tinytest.add('mongo diff', function(test) {
  test.isTrue(_.isEqual(mongoDiff.operators, expected));
  test.equal(mongoDiff.warnings.length, 2);
});