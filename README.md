# Love Letter Bot

Slackbt to moderate playing [Love Letter](https://boardgamegeek.com/boardgame/129622/love-letter) in slack. The [rules](http://www.alderac.com/tempest/files/2012/09/Love_Letter_Rules_Final.pdf) are available online

## Dev instructions

`npm run dev` spins up a dev server that restarts when you save

`npm start` spins up a normal server

## Commands

+ indicates that the result will show the whole channel, and - indicates that it will be private

| Command             | example                                   | effect                                                                                                                                                           |
|:--------------------|:------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| !start              | `!start`                                  | Begins a game and waits for players to join                                                                                                                      |
| !join               | `!join`                                   | Joins the game that is starting                                                                                                                                  |
| !begin              | `!begin`                                  | If there are enough players, starts the game                                                                                                                     |
| !abort              | `!about`                                  | Ends the current game immediately                                                                                                                                |
| !score              | `!score`                                  | +Prints the scoreboard of the current game to the channel                                                                                                        |
| !look               | `!look`                                   | -Shows the top card of the discard pile, how many cards are left in the deck, and the card(s) you are holding                                                    |
| !whosturn           | `!whosturn`                               | +Prints the player whos turn it is to the channel (pings them)                                                                                                   |
| !discard <card>     | `!discard 3` or `!discard Baron`          | +Discards the given card from your hand, and performs its action if applicable                                                                                   |
| !action <arguments> | `!action tyler` or `!action tyler Priest` | +As a response, make decisions on how to use a card. Arguments are variable length, but will always go in the order name, card. Where card can be number or name |
