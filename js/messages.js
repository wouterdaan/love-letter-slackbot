'use strict'

const R = require('ramda');
//+ genMessage : string -> ?[username, msg] -> Message
const genMessage = (username, msg) => {
    return {
        username: username,
        msg: msg
    };
};
exports.pubMessage = msg => genMessage(null, msg);
exports.privMessage = R.curry((username, msg) => genMessage(username, msg));
