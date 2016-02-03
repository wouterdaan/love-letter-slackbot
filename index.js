'use strict';

const R = require('ramda');
const Botkit = require('botkit');
const Game = require('./js/game');

const controller = Botkit.slackbot();
const bot = controller.spawn({
  token: "xoxb-20222523825-CKevtcZa4uer4hCOtdEb7iKB"
})
bot.startRTM(function(err,bot,payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
});

controller.hears(["^!.+"], ["ambient"], function(bot, message) {
    const channel = message.channel;
    const user = message.user;
    const split = message.text.split(/\s+/);
    const command = R.head(split).substring(1);
    const params = R.drop(1, split);

    const responses = Game.processAction(user, command, params);
    if(responses.publicMsg) bot.reply(message, responses.publicMsg);
});


require('./js/game');
