'use strict'

const R = require('ramda');
const _ = R.__;
const Either = require('data.either');
const Client = require('node-rest-client').Client;

const client = new Client();
const host = 'https://slack.com/api/'
const token = 'xoxp-2279670432-2729436195-20250368119-c192fdd196'
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
    handle: ''
}


const pubMessage = require('./messages').pubMessage;
const privMessage = require('./messages').privMessage;

//gets an individual game from the state
const getGame = function(channel) {
    const game = R.find(R.propEq('channel', channel))(games);
    return (game) ? Either.Right(game) : Either.Left([pubMessage('Game not found')]);
}

//gets an individual game from the state
const getGameIndex = function(channel) {
    const gameIndex = R.findIndex(R.propEq('channel', channel))(games);
    return (gameIndex > -1) ? Either.Right(gameIndex) : Either.Left([pubMessage('Game not found')]);
}

//makes sure game is ok to start
const isValid = function(game) {
    return R.propSatisfies(x => (x.length >= 2 && x.length <= 4), 'players', game);
}

const hasPlayer = function(userId, game) {
    return R.any(R.propEq('id', userId))(game.players);
}

//checks if a game is maxed out on players
const gameFull = function(game) {
    return R.propSatisfies(x => (x.length >= 4), 'players', game);
}

const getUser = function(channel, handle) {
    return getGame(channel).chain(function(game) {
        const player = R.find(R.propEq('handle', handle))(game.players);
        return (player) ? Either.Right(player) : Either.Left([pubMessage('Player not found')]);
    });
}

//takes in a slack user id, and a callback function(data, response)
const getUserInfoFromSlack = function(userId, callback) {
    client.get(getUrl('users.info', {user: userId}), callback);
}

exports.newGame = function(channel) {
    //if get game gives us something, then the game already exists so we shoudl fail
    if(getGame(channel).isRight) {
        return Either.Left([pubMessage('Game already exists in this channel!')]);
    } else {
        games = R.append(R.merge(defaultGameState, {channel: channel}))(games)
        return Either.Right([pubMessage('Game created, say !join to join')]);
    }
}

exports.endGame = function(channel) {
    games = R.reject(R.propEq('channel', channel))(games)
}

exports.okToStartGame = function(channel) {
    return getGame(channel).bimap(function(error) {
        return false;
    },
    function(game) {
        return isValid(game);
    }).merge();
}

// + processAction = slackbot -> channel -> slackMessage -> callback (function(response:Either)) -> null
exports.addPlayer = function(bot, channel, message, callback) {
    getGameIndex(channel).bimap(function(error) {
            callback(Either.Left(error));
        },
        function(gameIndex) {
            const game = games[gameIndex];
            if(gameFull(game)) {
                callback(Either.Left([pubMessage('Sorry, Game is full')]))
            } else if(hasPlayer(message.user, game)) {
                callback(Either.Left([pubMessage('You are already in the game')]))
            } else {
                getUserInfoFromSlack(message.user, function(data, response) {
                    const user = (data.user) ? data.user.name : null
                    if(user) {
                        games = R.adjust(R.merge(_, { players: R.append(R.merge(defaultPlayerState, { id: message.user, handle: user }), game.players) }), gameIndex, games);
                        callback(Either.Right([privMessage(user, "You're in!")]));
                    } else {
                        callback(Either.Left([pubMessage("Couldn't find user " + user)]));
                    }
                });
            }
        }
    );
}

exports.sendDm = function(bot, channel, handle, slackMessage, message) {
    return getUser(channel, handle).bimap(function(error) {
        return error;
    },
    function(user) {
        bot.startPrivateConversation(slackMessage, function(err, conversation) {
            if(err) {
                console.log(err);
                bot.say({channel: channel, text: "Couldn't start a dm with " + user.handle});
            } else {
                conversation.say(message);
            }
        });
    })
}

exports.getHandle = function(channel, userId) {
    return getGame(channel).chain(function(game) {
        const player = R.find(R.propEq('id', userId))(game.players);
        return (player) ? Either.Right(player.handle) : Either.Left([pubMessage('Player not found')]);
    });
}

exports.getHandles = function(channel) {
    return getGame(channel).map(R.compose(R.map(R.prop('handle')), R.prop('players')));
}
