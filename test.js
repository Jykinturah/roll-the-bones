'use strict';

const Chance = require("chance");
const chance = new Chance();
const Promise = require("bluebird");
const replies = require("./replies.json");
const config = require("./config.json");
const dice = require("./functions/diceFunctions.js");

/*

  DiceObject (countIn, sidesIn)
  roll (dice)
  diceExpMatcher (str)
  spaceMatcher (str)
  operatorMatcher (str)
  orCombinator (matcher1, matcher2) 
  parseDiceExpression (exp)
  sortCollapseDice (uncolDie)
  rollDiceString (exp)

*/

var c = dice.rollDiceString("1d4 20d6 5d20");

console.log(c);