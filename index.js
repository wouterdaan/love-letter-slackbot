'use strict';

const R = require('ramda');
const Botkit = require('botkit');
const Game = require('./js/game');
const Slack = require('./js/slack');

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

const sendMessage = function(bot, channel, slackMessage, message) {
    if(message.username) {
        Slack.sendDm(bot, channel, message.username, slackMessage, message.msg);
    } else {
        bot.say({ channel: channel, text: message.msg });
    }
}

const sendMessages = R.curry(function(bot, channel, slackMessage, messages) {
    console.log("MESSAGES HERE")
    console.log(messages);
    R.forEach(function(m) { sendMessage(bot, channel, slackMessage, m) }, messages);
})

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

    const send = sendMessages(bot, channel, message);
    const sendRighter = righter => sendMessages(bot, channel, message, righter.log);

    switch(command) {
        case 'start':
            Slack.newGame(channel).bimap(send, send);
            break;
        case 'join':
            Slack.addPlayer(bot, channel, message, function(result) { result.bimap(send, send) });
            break;
        case 'begin':
            if(Slack.okToStartGame(channel)) {
                Slack.getHandles(channel)
                    .map(function(handles) {
                        return Game.start(R.head(handles), channel, handles);
                    })
                    .bimap(send, sendRighter);
            } else {
                bot.reply(message, 'Game must have 2-4 players');
            }
            break;
        case 'help':
            sendRighter(Game.help());
            break;
        default:
            Slack.getHandle(channel, userId)
                .chain(function(handle) {
                    return Game.processAction(handle, channel, command, params);
                })
                .bimap(send, sendRighter);
    }
});
