'use strict';

const _shuffle = require('shuffle-array');
const R = require('ramda');
const cards = require('./cards.json');
const _ = R.__;


// =============================================================================
// GAME STATE
// =============================================================================
let games = [];


// =============================================================================
// DEFAULT STATES
// =============================================================================
const defaultDeck = R.reduce((memo, card) => {
    return memo.concat(R.repeat(card, card.count));
}, [], cards);

const defaultPlayerState = {
    slackUserObject: {},
    username: '',
    gamesWon: 0,
    stillInGame: true,
    isProtected: false,
    hand: [],
};

// genUser = userState -> userState
const genUser = R.merge(defaultPlayerState);

const defaultGameState = {
    channel: '',
    players: [],
    deck: R.clone(defaultDeck),
    discard: [],
    pendingAction: null
};

// genGame = gameState -> gameState
const genGame = R.merge(defaultGameState);

//+ genMessage : string -> ?[username, msg] -> Message
const genMessage = (pub, priv) => {
    let message = {
        pubMessage: pub,
        privMessage: []
    };

    if (priv) message.privMessage = [priv];

    return message;
};
const pubMessage = msg => genMessage(msg);
const privMessage = (username, msg) => genMessage('', [username, msg]);

// =============================================================================
// FUNCTIONS
// =============================================================================
//+ setupMatch : [username] -> channel ->  gameState
const setupMatch = R.curry(function(usernames, channel) {
    return genGame({
        channel: channel,
        players: usernames.map(genUser)
    });
});

//+ setupGame : gameState -> gameState
const setupGame = R.curry(function(gameState) {
    let deck = R.compose(burnCard, shuffle)(defaultDeck);

    let players = R.compose(
        R.map(R.merge(_, {
            stillInGame: true,
            isProtected: false,
            hand: [deck.shift()]
        })),
        shuffle
    )(gameState.players)

    return R.merge(
        gameState,
        {
            deck: deck,
            players: players,
            discard: [],
            pendingAction: null
        }
    );
});

//+ burnCard : [cards] -> [cards]
const burnCard = R.tail;

//+ shuffle : [cards] -> [cards]
const shuffle = R.compose(_shuffle, R.clone);

//+ isGameOver : gameState -> boolean
const isGameOver = function(gameState) {
    const deck = gameState.deck;
    const players = gameState.players;
    const activePlayers = filterActivePlayers(players);

    return !deck.length || activePlayers.length === 1;
};

//+ isMatchOver : gameState -> boolean
const isMatchOver = function(gameState) {
    const players = gameState.players;
    const numPlayers = players.length;
    const maxPoints = R.pluck('gamesWon').reduce(Math.max, 0);

    return (numPlayers === 2 && maxPoints === 7) ||
             (numPlayers === 3 && maxPoints === 5) ||
             (numPlayers === 4 && maxPoints === 4);
};

//+ filterActivePlayers : [players] -> [players]
const filterActivePlayers = R.filter(R.whereEq({ stillInGame: true }));

//+ activePlayer : gameState -> player
const activePlayer = R.compose(R.head, filterActivePlayers, R.prop('players'));

//+ getGame : channel -> gameState
const getGame = channel => R.find(R.whereEq({ channel: channel }), games);

//+ getUser : gameState -> username -> user
const getUser = R.curry((gameState, username) => {
    return R.find(R.whereEq({ username: username }), gameState.players);
});

//+ isInvalidUser : username -> channel -> undefined || pubMessage
const isInvalidUser = R.curry((username, channel) => {
    const game = getGame(channel);
    if (!game) return pubMessage('No active game in this channel');

    const user = getUser(game, username);
    if (!user) return pubMessage('You are not part of the game in this channel');
});

// =============================================================================
// TO STRINGS
// =============================================================================
const cardToString = c => `(${c.value}) ${c.name}: ${c.description}`;

const discardToString = g => `The last discarded card was ${cardToString(R.head(g.discard))}`;

const handToString = hand => {
    return `
        Your hand is:
        ${hand.map(cardToString).join('\n')}
    `;
};

const deckToString = g => `There are ${g.deck.length} cards left`;

const playerToString = p => '';

const gameToString = g => '';


// =============================================================================
// ACTIONS
// =============================================================================
const actions = {
    help: function() {
        return pubMessage(`Loooool, help?`);
    },

    start: function(username, channel, usernames) {
        const activeGame = getGame(channel);
        if (activeGame)
            return pubMessage('A game already exists in this channel');

        const newGame = setupGame(setupMatch(usernames, channel));

        games.push(newGame);

        const crntPlayer = activePlayer(newGame);
        const handString = handToString(crntPlayer.hand);

        return genMessage(
            `The game has started! @${crntPlayer.username}, your up first.`,
            [crntPlayer.username, `Your hand is ${handString}`]
        )
    },

    look: function(username, channel) {
        const game = getGame(channel);

        if (!game)
            return pubMessage('No game found for this channel');

        if (isInvalidUser(username, channel))
            return isInvalidUser(username, channel);

        const user = getUser(game, username);

        let res = [
            handString(user.hand),
            deckToString(game),
            discardToString(game)
        ].join('\n');

        return privMessage(username, res);
    },

};

// =============================================================================
// EXPORTS
// =============================================================================
// + processAction = username -> command -> args -> { pubMessage, privMessage }
exports.processAction = R.curry(function(username, command, args) {
    var action = actions[command];

    var res = action ? action.apply(null, args || []) :
                       pubMessage('No action found, Boop!');

    console.log(res);

    return res;
});

exports.start = actions.start;
