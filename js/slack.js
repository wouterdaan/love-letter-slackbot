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

exports.getUserInfo = function(userId) {
    client.get(getUrl('users.info', {user: userId}), function (data, response) {
        console.log(data)
    });
}

exports.getUserInfo('U02MFCU5R');
