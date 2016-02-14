jest.autoMockOff();

const R = require('ramda');
const Game = require('../js/game');
const players = ['Tyler', 'Kevin', 'Morgan', 'Trevor'];
const channel = 'testChannel';
const pubMessage = require('../js/messages').pubMessage;
const privMessage = require('../js/messages').privMessage;

describe('start', function() {
    const startGame = Game.start(players[0], channel, players);
    it('returns a game object when starting', function() {
        const game = startGame.value;
        expect(game.channel).toBe(channel);
        expect(game.players.length).toBe(players.length);
        R.forEach((player) => expect(R.map((p) => p.username, game.players).toContain(player)));
        expect(game.discard.length).toBe(0);
        expect(game.pendingAction).toBeNull();
        //TODO: deck
    });

    it('has correct messages when starting', function() {
        const log = startGame.log;
        expect(log).toEqual([
            pubMessage(`The game has started! @${players[0]}, you\'re up first.`),
            privMessage(players[0],'your hand is:'),
            privMessage(players[0],'(1) Guard: Name a non-Guard card and choose another player. If that player has that card, he or she is out of the round.')
        ])
    });
});
