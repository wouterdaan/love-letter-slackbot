# Love Letter Bot

`npm run dev` spins up a dev server that restarts when you save

`npm start` spins up a normal server

## Commands

+ indicates that the result will show the whole channel, and - indicates that it will be private

| Command              | example                                    | effect                                                                                                                                                           |
|:---------------------|:-------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| !start <player list> | `!start tyler kevin.welcher trevor.senior` | Begins a game with the listed players                                                                                                                            |
| !abort               | `!about`                                   | Ends the current game immediately                                                                                                                                |
| !score               | `!score`                                   | +Prints the scoreboard of the current game to the channel                                                                                                        |
| !look                | `!look`                                    | -Shows the top card of the discard pile, how many cards are left in the deck, and the card(s) you are holding                                                    |
| !whosturn            | `!whosturn`                                | +Prints the player whos turn it is to the channel (pings them)                                                                                                   |
| !discard <card>      | `!discard 3` or `!discard Baron`           | +Discards the given card from your hand, and performs its action if applicable                                                                                   |
| !action <arguments>  | `!action tyler` or `!action tyler Priest`  | +As a response, make decisions on how to use a card. Arguments are variable length, but will always go in the order name, card. Where card can be number or name |
