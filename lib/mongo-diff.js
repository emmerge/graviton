var MongoDiff = function(lhs, rhs, prefilter) {
  this._lhs = lhs;
  this._rhs = rhs;
  this._deepDiffs = DeepDiff.diff(lhs, rhs, prefilter);
  this.operators = {};
  this.warnings = [];
  for (var i in this._deepDiffs) {
    this.addDeepDiff(this._deepDiffs[i]);
  }
};

MongoDiff.prototype.addOperator = function(operator, path, val) {
  var obj = this.operators[operator] = this.operators[operator] || {};
  obj[path] = val;
};

MongoDiff.prototype.addDeepDiff = function(diff) {
  var path = diff.path.join('.');
  switch (diff.kind) {
  case 'A':
    var set = this.operators.$set;
    if (!(set && set[path])) {
      this.addOperator("$set", path, Graviton.getProperty(this._rhs, path));
      this.warnings.push("Will replace entire array at: '"+path+"'. Individual updates should probably be done manually instead.");
    }
    break;
  case 'E':
  case 'N':
    this.addOperator("$set", path, diff.rhs);
    break;
  case 'D':
    this.addOperator("$unset", path, "");
    break;
  }
};

Graviton.mongoDiff = function(lhs, rhs, prefilter) {
  return new MongoDiff(lhs, rhs, prefilter);
};
