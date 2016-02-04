'use strict';

const _shuffle = require('shuffle-array');
const R = require('ramda');
const cards = require('./cards.json');
const _ = R.__;
const Either = require('data.either');



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
const genMessage = (username, msg) => {
    return {
        username: username,
        msg: msg
    };
};
const pubMessage = msg => genMessage(null, msg);
const privMessage = R.curry((username, msg) => genMessage(username, msg));

// =============================================================================
// FUNCTIONS
// =============================================================================
//+ setupMatch : [username] -> channel ->  gameState
const setupMatch = R.curry(function(usernames, channel) {
    return genGame({
        channel: channel,
        players: usernames.map(u => genUser({ username: u }))
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

//+ isGameOver : game -> boolean
const isGameOver = function(game) {
    return !game.deck.length ||
            getActivePlayers(game.players).length === 1;
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

//+ getActivePlayers : gameState -> player
const getActivePlayers = R.compose(
    R.filter(R.whereEq({ stillInGame: true })),
    R.prop('players')
);

//+ getActivePlayer : gameState -> player
const getActivePlayer = R.compose(R.head, getActivePlayers);

//+ getGame : channel -> Either pubMessage gameState
const getGame = channel => {
    var game = R.find(R.whereEq({ channel: channel }), games);
    return game ?
        Either.Right(game) :
        Either.Left(pubMessage('Game does not exist in this channel'));
}

//+ getPlayer : game -> username -> Either pubMessage user
const getPlayer = R.curry((username, game) => {
    var user = R.find(R.whereEq({ username: username }), game.players);
    return user ?
        Either.Right(user) :
        Either.Left(pubMessage(`@${username} is not in this game`))
});

// =============================================================================
// TO STRINGS
// =============================================================================
const cardToString = c => `(${c.value}) ${c.name}: ${c.description}`;

const discardToString = g =>
    g.discard.length ?
        `The last discarded card was ${cardToString(R.head(g.discard))}` :
        `There are no cards in the discard pile`


const handToString = hand => {
    return `
        Your hand is:
        ${hand.map(cardToString).join('\n')}
    `;
};

const deckToString = g => `There are ${g.deck.length} cards left in the deck`;

const playerToString = p => `${p.username}: ${p.gamesWon}`;

const gameToString = g => '';

// =============================================================================
// ACTIONS
// =============================================================================
const actions = {
    // _ -> Either _ pubMessage
    help: function() {
        return pubMessage(`Loooool, help?`);
    },

    // This needs to be global and not an action
    // Either err game -> username -> channel -> usernames -> Either err [message]
    start: function(game, username, channel, usernames) {
        return game
            .bimap(
                R.always(true),
                R.always(pubMessage('A game already exists in this channel'))
            )
            .swap()
            .chain(() => {
                const newGame = setupGame(setupMatch(usernames, channel));
                games.push(newGame);

                const crntPlayer = getActivePlayer(newGame);
                const handString = handToString(crntPlayer.hand);

                return Either.Right([
                    pubMessage(`The game has started! @${crntPlayer.username}, your up first.`),
                    privMessage(crntPlayer.username, `Your hand is ${handString}`)
                ])
            });
    },

    // Either err game -> username -> Either err privMessage
    look: function(game, username) {
        const user = game.chain(getPlayer(username));

        return R.sequence(Either.Right, [
            user.map(R.compose(handToString, R.prop('hand'))),
            game.map(deckToString),
            game.map(discardToString)
        ]).map(R.compose(privMessage(username), R.join('\n')));
    },

    // Either err game -> pubMessage
    score: R.map(R.compose(pubMessage, R.join('\n'), R.map(playerToString), R.prop('players'))),

    // Either err game -> pubMessage
    abort: function(game, username, channel) {
        return game.map(function(_) {
            games = R.filter(R.whereEq({ channel: channel }), games);
            return pubMessage('Game disbanded.');
        });
    },

    // Either err game -> pubMessage
    whosturn: R.map(function(game) {
        const player = getActivePlayer(game);
        return pubMessage(`It is ${player.username}'s turn'`);
    }),

    // Either err game -> username -> pubMessage
    discard: function(game, username) {
        const user = game.chain(getPlayer(username));
        const activeUser = game.map()
        return game;
    }
};

// =============================================================================
// EXPORTS
// =============================================================================
// + processAction = username -> channel -> command -> args -> { pubMessage, privMessage }
exports.processAction = R.curry(function(username, channel, command, args) {
    const action = actions[command];
    const _args = [getGame(channel), username, channel, ...(args || [])];

    const res = action ? action.apply(null, _args) :
                         pubMessage('No action found, Boop!');

    console.log(res);

    return res;
});

exports.start = actions.start;


// =============================================================================
// GAME STATE
// =============================================================================
let games = [];

games.push(setupGame(setupMatch([
    'tyler',
    'kevinwelcher'
], 'C0L6FJ4F3')))
