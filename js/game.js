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

// + processAction = username -> command -> args -> { publicMsg, privatemsg }
exports.processAction = R.curry(function(username, command, args) {
    return {
        publicMsg: 'Boop',
        privateMsg: ''
    };
});
