'use strict';

const _shuffle = require('shuffle-array');
const R = require('ramda');
const cards = require('./cards.json');
const _ = R.__;
const Writer = require('./writer');
const Righter = Writer.Righter;
const Left = Writer.Left;


// =============================================================================
// STUFF I WISH RAMDA HAD
// =============================================================================
const mapWhere = R.curry((pred, fn, list) =>
    R.map(x => pred(x) ? fn(x) : x, list));

// =============================================================================
// LENSES
// =============================================================================
const L = {}

L.discard = R.lensProp('discard');
L.deck = R.lensProp('deck');
L.hand = R.lensProp('hand');
L.players = R.lensProp('players');
L.first = R.lensIndex(0);
L.second = R.lensIndex(1);
// array -> lens player
L.find = R.curry((prop, name) =>
    R.lens(
        R.find(R.whereEq(R.objOf(prop, name))),
        R.curry((x, l) => mapWhere(R.whereEq(R.objOf(prop, name)), R.always(x), l))
    ));

L.player = name => R.compose(L.players, L.find('username', name));
L.game = L.find('channel');
L.value = L.find('value');
L.name = L.find('name');

L.playerHand = name => R.compose(L.players, L.player(name), L.hand);

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

const pubMessage = require('./messages').pubMessage;
const privMessage = require('./messages').privMessage;

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
    // TODO add shuffle
    // let deck = R.compose(burnCard, shuffle)(defaultDeck);
    let deck = R.compose(burnCard)(defaultDeck);

    let players = R.compose(
        R.map(R.merge(_, {
            stillInGame: true,
            isProtected: false,
            hand: [deck.shift()]
        }))
        // TODO: Add this back in after testing
        // shuffle
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

//+ getGame : channel -> Righter pubMessage gameState
const getGame = channel => {
    var game = R.find(R.whereEq({ channel: channel }), games);
    return game ?
        Righter.of(game) :
        Left.of(pubMessage('Game does not exist in this channel'));
}

//+ getPlayer : game -> username -> Righter pubMessage user
const getPlayer = R.curry((username, game) => {
    const user = R.find(R.whereEq({ username: username }), game.players);
    return user ?
        Righter.of(user) :
        Left(pubMessage(`@${username} is not in this game`))
});

//+ cardPred : cardState -> boolean
const cardPred = R.curry((val, card) => card.value == val || card.name == val);

//+ discardCard : gameState -> username -> cardValue -> gameState
const discardCard = R.curry((username, cardValue, game) => {
    const discardedCard = cards.find(cardPred(cardValue));

    const removeCard = R.reject(cardPred(cardValue));

    const playerTransform = R.over(L.hand, removeCard);

    const playerDiscard = game => [
        R.over(L.player(username), playerTransform, game),
        pubMessage(`${username} has discarded a ${discardedCard}`)
    ]

    return R.compose(
        playerDiscard,
        R.map(R.over(L.discard, R.prepend(discardedCard)))
    )(Righter.of(game))
});

//+ draw : gameState -> username -> [gameState, message]
const drawCard = R.curry((username, game) => {
    var topOfDeck = R.compose(L.deck, L.first);

    var firstCard = R.view(topOfDeck, game);

    const addCardToPlayer = R.over(L.hand, R.append(firstCard));

    return R.compose(
        R.pair(_, privMessage(username, 'You recived a ${cardToString(firstCard)}: ')),
        R.over(L.player(name), addCardToPlayer),
        R.over(L.deck, burnCard)
    )(game);
});

//+ userSort : [userState] -> [userState]
const userSort = R.sort((a, b) =>
    a.stillInGame === b.stillInGame ? 0 :
    a.stillInGame && !b.stillInGame ? -1 : 1);

//+ headToTail : list -> list
const headToTail = (list) => R.append(R.head(list), R.tail(list));

//+ stepUsers : gameState -> gameState
const stepUsers = R.over(L.players, R.compose(headToTail, R.sort(userSort)));

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
    // Righter err [gameState, messages] -> username -> Righter err [gameState, messages]
    look: function(gameState, user) {
        const message = privMessage(user.username, [
            handToString(user.hand),
            deckToString(gameState),
            discardToString(gameState)
        ].join('\n'));

        return Righter.tell(message);
    },

    // gameState -> pubMessage
    score: function(gameState) {
        return Righter.tell(pubMessage(gameState.players.map(playerToString).join('\n')));
    },

    // game -> pubMessage
    abort: function(game, username, channel) {
        games = R.filter(R.whereEq({ channel: channel }), games);
        return Righter.tell(pubMessage('Game disbanded.'));
    },

    // game -> pubMessage
    whosturn: function(game) {
        return Righter.tell(pubMessage(`It is ${getActivePlayer(game)}'s turn'`));
    },

    // game -> username -> pubMessage
    discard: function(game, player, channel, args) {
        const activePlayer = getActivePlayer(game);
        if (activePlayer !== player)
            return Left.of(pubMessage('It is not your turn yet'));

        const selectedCard = R.find(cardPred(args[0]), player.hand);
        if (!selectedCard)
            return Left.of(pubMessage('Please supply a card name or value to discard'));

        if (game.pendingAction)
            return Left.of(pubMessage('There is a pending card that needs to be acted on'));

        const stepGame = R.compose(
            stepUsers,
            discardCard(activePlayer.username, selectedCard.value)
        );

        games = R.over(L.game(game.channel), stepGame, games);



        return Righter.tell(messages);
    }
};

// =============================================================================
// EXPORTS
// =============================================================================
// + processAction = username -> channel -> command -> args -> { pubMessage, privMessage }
exports.processAction = R.curry(function(username, channel, command /*, ...args */) {
    const args = Array.prototype.slice.call(arguments, 3);
    const action = actions[command];

    const game = R.find(R.whereEq({ channel: channel }), games);
    if (!game) return Left.of([pubMessage('No game exists in this channel yet')]);
    if (!action) return Left.of([pubMessage('No action found, Boop!')]);

    const invokingUser = R.find(R.whereEq({ username: username }), game.players);
    if (!invokinguser) return Left.of([pubMessage('You are not a part of this game ${username}!')]);

    return action.apply(null, [game, invokingUser, channel, ...args]);
});

// _ -> Righter _ [_, message]
exports.help = function() {
    return Righter.tell(pubMessage(`https://github.com/tylerjromeo/love-letter-slackbot/blob/master/README.md`));
};

// username -> channel -> [username] -> Righter [err, messages] [gameState, messages]
exports.start = function(username, channel, usernames) {
    if (R.find(R.whereEq({ channel: channel }), games))
        return Left.of(pubMessage('Game already exists'))

    const newGame = setupGame(setupMatch(usernames, channel));
    games.push(newGame);

    const crntPlayer = getActivePlayer(newGame);
    const handString = handToString(crntPlayer.hand);

    return Righter.of(newGame, [
        pubMessage(`The game has started! @${crntPlayer.username}, you're up first.`),
        privMessage(crntPlayer.username, handString)
    ]);
};

// =============================================================================
// GAME STATE
// =============================================================================
let games = [];
