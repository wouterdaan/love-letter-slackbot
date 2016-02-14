'use strict';

var R = require('ramda');

// =======================
// Left
// =======================
function Left(value) {
    this.value = value;
    this.log = [value];
};
Left.of = function(value) { return new Left(value); };
Left.prototype.of = function(value) { return new Left(value); };

Left.prototype.map = function(fn) { return this; };

Left.prototype.ap = function(m) { return this; };

Left.prototype.chain = function(fn) { return this; };
Left.prototype.tell = function(fn) { return this; };
Left.prototype.bimap = function(fn, _) { return Left.of(fn(this.value, this.log)); };


// =======================
// Righter
// =======================
function Righter(value, log) {
    this.value = value;
    this.log = log;
};


Righter.of = function(value, log) {
    return new Righter(value, log || []);
};
Righter.prototype.of = function(value, log) {
    return new Righter(value, log || []);
};


Righter.prototype.map = function(fn) {
    return this.chain(x => {
        var res = fn(this.value);
        var nextValue = res.value;
        var nextLog = res.log ? R.flatten(this.log.concat(res.log)) : this.log;

        return this.of(nextValue, nextLog);
    });
};


Righter.prototype.ap = function(m) {
    return m.map(this.value);
};


Righter.prototype.chain = function(fn) {
    var res = fn(this.value);
    var nextValue = res.value;
    var nextLog = res.log ? R.flatten(this.log.concat(res.log)) : this.log;

    return res instanceof Righter ? this.of(nextValue, nextLog) : res;
};

Righter.tell = function(msg) {
    return Righter.of(null).tell(msg);
};

Righter.prototype.tell = function(msg) {
    return Righter.of(this.value, this.log.concat(msg));
};

Righter.prototype.bimap = function(_, fn) {
    return Righter.of(fn(this.value, this.log));
};


exports.Left = Left;
exports.Righter = Righter;
exports.of = Righter.of;
