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
        case "start":
            Slack.newGame(channel);
            bot.reply(message, "Game created, say !join to join");
            break;
        case "check":
            console.log(Slack.checkState());
            break;
        default:
            Slack.getUserInfo(userId, function(data, response) {
            const user = (data.user) ? data.user.name : null
            if(user) {
                const responses = Game.processAction(user, channel, command, params);
                if(responses.publicMsg) bot.reply(message, responses.publicMsg);
            } else {
                reportError(bot, message.channel, "couldn't get a user from slack");
            }
        });
    }
});
