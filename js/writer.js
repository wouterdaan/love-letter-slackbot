'use strict';

var R = require('ramda');

// =======================
// Left
// =======================
function Left(value) { this.value = value; };
Left.of = function(value) { return new Left(value); };
Left.prototype.of = function(value) { return new Left(value); };

Left.prototype.map = function(fn) { return this; };

Left.prototype.ap = function(m) { return this; };

Left.prototype.chain = function(fn) { return this; };


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
    return this.chain(x => this.of(fn(x)[0], fn(x)[1]));
};


Righter.prototype.ap = function(m) {
    return m.map(this.value);
};


Righter.prototype.chain = function(fn) {
    var res = fn(this.value);
    return res instanceof Righter ?
            this.of(res.value, R.flatten(this.log.concat(res.log))) :
            res;
};


exports.Left = Left;
exports.Righet = Righter;
exports.of = Righter.of;
