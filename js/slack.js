'use strict'

const R = require('ramda');
const _ = R.__;
const Either = require('data.either');
const Client = require('node-rest-client').Client;

const client = new Client();
const host = "https://slack.com/api/"
const token = "xoxp-2279670432-2729436195-20250368119-c192fdd196"
const getUrl = function(path, params) {
    return host + path + '?token=' + token + R.compose(R.map(function(s) {return '&'+s}), R.map(R.join('=')), R.toPairs, R.defaultTo({}))(params)
}

// =============================================================================
// GAME STATE
// =============================================================================
let games = [];

const defaultGameState = {
    channel: '',
    players: []
}

const defaultPlayerState = {
    id: '',
    handle: '',
    conversation: null //the bot's conversation object for sending dms
}


const pubMessage = require('./messages').pubMessage;
const privMessage = require('./messages').privMessage;

//gets an individual game from the state
const getGame = function(channel) {
    const game = R.find(R.propEq('channel', channel))(games);
    return (game) ? Either.Right(game) : Either.Left([pubMessage("Game not found")]);
}

//gets an individual game from the state
const getGameIndex = function(channel) {
    const gameIndex = R.findIndex(R.propEq('channel', channel))(games);
    return (gameIndex > -1) ? Either.Right(gameIndex) : Either.Left([pubMessage("Game not found")]);
}

//makes sure game is ok to start
const checkGame = function(game) {
    return R.propSatisfies(function(x) { x.length >= 2 && x.length <= 4}, 'players', game);
}

//checks if a game is maxed out on players
const gameFull = function(game) {
    return R.propSatisfies(function(x) { x.length >= 4}, 'players', game);
}

const getUser = function(channel, handle) {
    return getGame(channel).chain(function(game) {
        const player = R.find(R.propEq('handle', handle))(game.players);
        return (player) ? Either.Right(player) : Either.Left([pubMessage("Player not found")]);
    });
}

//takes in a slack user id, and a callback function(data, response)
const getUserInfoFromSlack = function(userId, callback) {
    client.get(getUrl('users.info', {user: userId}), callback);
}

exports.checkState = function() {
    return games;
}

exports.newGame = function(channel) {
    games = R.append(R.merge(defaultGameState, {channel: channel}))(games)
}

exports.endGame = function(channel) {
    games = R.reject(R.propEq('channel', channel))(games)
}

//TODO: KEVIN HALP. THIS FUNCTION IS OUT OF CONTROL. NEEDS MONADS DEPERATELY.
exports.addPlayer = function(bot, channel, message) {
    return getGameIndex(channel).map(function(gameIndex) {
        getUserInfoFromSlack(message.user, function(data, response) {
            const user = (data.user) ? data.user.name : null
            if(user) {
                bot.startPrivateConversation(message, function(err, conversation) {
                    if(err) {
                        bot.say({channel: channel, text: "couldn't start a dm"});
                    } else {
                        const game = games[gameIndex];
                        games = R.adjust(R.merge(_, { players: R.append(R.merge(defaultPlayerState, { id: message.user, handle: user, conversation: conversation }), game.players) }), gameIndex, games);
                        exports.sendDm(channel, user, "you're in!");
                    }
                });
            } else {
                bot.say({channel: channel, text: "couldn't find user"});
            }
        });
        return "Adding User..."
    });
}

exports.sendDm = function(channel, handle, message) {
    return getUser(channel, handle).bimap(function(error) {
        return error;
    },
    function(user) {
        user.conversation.say(message);
        return "Dm sent";
    })
}

exports.getHandle = function(channel, userId) {
    return getGame(channel).chain(function(game) {
        const player = R.find(R.propEq('id', userId))(game.players);
        return (player) ? Either.Right(player.handle) : Either.Left([pubMessage("Player not found")]);
    });
}
