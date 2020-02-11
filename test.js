"use strict";

const Chance = require("chance");
const chance = new Chance();
const Promise = require("bluebird");
const replies = require("./replies.json");
const config = require("./config.json");
const dice = require("./functions/diceFunctions.js");

const randomDice = function(){
	let dice = [4,6,8,10,12,20,100];
	let rolls = [0,0,0,0,0,0,0];
	for(let i = 0; i < 5; i++) rolls[i] = Math.round(Math.random()*20);
	rolls[5] = Math.round(Math.random()*5);
	rolls[6] = Math.round(Math.random()*2);

	let str = "";

	for(let x = 0; x < rolls.length; x++){
		if(rolls[x] > 0) str += rolls[x] + "d" + dice[x] + " ";
	}

	return str;
}

//for (let x = 0; x < 10; x++) {
//console.log( dice.rollDiceString("10d20 + 23 + 1D4 - 6 -5d4+10d6-5D20	+ d2+7 - 8 +9-5d6 -2d10 + 4d10-3d12") );
//console.log( dice.rollDiceString("1d20 + 5"));
////}
