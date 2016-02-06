const R = require('ramda');

function Writer(value, state) {
    this.value = value;
    this.state = state;
};

Writer.prototype.of = function(value) {
    return new Writer(value, []);
};

Writer.of = function(value) {
    return new Writer(value, []);
};

Writer.prototype.map = function(fn) {
    var res = fn(this.value, this.state);
    return this.of(res[0], res[1]);
};

Writer.prototype.chain = function(fn) {
    return this.map(fn).merge();
};

Writer.prototype.ap = function(m) {
    return m.map(this.value);
};

Writer.prototype.merge = function() {
    return [this.value, this.state];
};

Writer.of(R.add).ap(Writer.of(1)).ap(Writer.of(2))
