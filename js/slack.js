'use strict'

const R = require('ramda');
const _ = R.__;

const Client = require('node-rest-client').Client;

const client = new Client();
const host = "https://slack.com/api/"
const token = "xoxp-2279670432-2729436195-20250368119-c192fdd196"
const getUrl = function(path, params) {
    return host + path + '?token=' + token + R.compose(R.map(function(s) {return '&'+s}), R.map(R.join('=')), R.toPairs, R.defaultTo({}))(params)
}

//takes in a slack user id, and a callback function(data, response)
exports.getUserInfo = function(userId, callback) {
    client.get(getUrl('users.info', {user: userId}), callback);
}

exports.getUserInfo('U02MFCU5R', function(data, response) {
    console.log(data);
});
