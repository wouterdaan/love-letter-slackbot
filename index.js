'use strict';

const R = require('ramda');
const Botkit = require('botkit');
const Game = require('./js/game');
const Slack = require('./js/slack')

const controller = Botkit.slackbot();
const bot = controller.spawn({
  token: "xoxb-20222523825-CKevtcZa4uer4hCOtdEb7iKB"
});

const reportError = function(bot, channel, errorMessage) {
    bot.say({channel: channel, text: "Something didn't work, try that command again?"});
    if(errorMessage) bot.say({channel: channel, text: "Error: " + errorMessage});
}

const sayPublic = function(bot, message) {
    return function(text) {
        bot.reply(message, text);
    }
}

const sendMessage = function(bot, channel, message) {
    if(message.username) {
        Slack.sendDm(channel, message.user, message.msg);
    } else {
        bot.say({ channel: channel, text: message.msg });
    }
}

const sendMessages = function(bot, channel, messages) {
    R.forEach(function(m) { sendMessage(bot, channel, m) }, messages);
}

bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
});

controller.hears(["^!.+"], ["ambient"], function(bot, message) {
    const channel = message.channel;
    const userId = message.user;
    const split = message.text.split(/\s+/);
    const command = R.head(split).substring(1);
    const params = R.drop(1, split);

    switch(command) {
        case 'start':
            Slack.newGame(channel);
            bot.reply(message, 'Game created, say !join to join');
            break;
        case 'check':
            console.log(Slack.checkState());
            break;
        case 'join':
            bot.reply(message, Slack.addPlayer(bot, channel, message).merge());
            break;
        case 'begin':
            Slack.getHandles(channel).chain(function(handles) {
                return Game.processAction(R.head(handles), channel, command, handles);
            }).bimap(R.curry(sendMessages)(bot, channel), R.curry(sendMessages)(bot, channel));
        default:
            Slack.getHandle(channel, userId).chain(function(handle) {
                return Game.processAction(handle, channel, 'start', params);
            }).bimap(R.curry(sendMessages)(bot, channel), R.curry(sendMessages)(bot, channel));
    }
});
