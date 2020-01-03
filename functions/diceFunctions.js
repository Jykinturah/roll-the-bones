const config = require("../config.json");
const Chance = require("chance");
const chance = new Chance();
const CRIT_MULT = config.crit;

/** Modified code from https://github.com/dbkang/dice-expression-evaluator **/

const DiceObject = function (countIn, sidesIn){
  this.count = countIn;
  this.sides = sidesIn;
  this.setCount = function(countIn){
    this.count = countIn;
  };
}

const roll = function (dice){
  let result = [];
  for(let i = 0; i < dice.count; i++)
    result = result.concat(chance.natural({ min: 1, max: dice.sides }));
  return result.sort((a,b) => {return b - a;});
}

const diceExpMatcher = function (str) {
  let match = /^([1-9][0-9]*)?(d|D)(([1-9][0-9]*)|\%)/.exec(str);
  if (match === null) return null;
  let diceCount = Number(match[1]) || 1;
  let sideCount = (match[3] === "%") ? 100 : Number(match[3]);
  return {tokens: [new DiceObject(diceCount, sideCount)], rest: str.slice(match[0].length)};
}

const spaceMatcher = function (str) {
  let match = /^[ ]*/.exec(str);
  return {tokens: [], rest: str.slice(match[0].length)};
}

const operatorMatcher = function (str) {
  let match = /^[+|-]/.exec(str);
  if (match === null) {
    return null;
  }
  return {tokens: [], rest: str.slice(1)};
}

const orCombinator = function (matcher1, matcher2) {
  return function (str) {
    return matcher1(str) || matcher2(str);
  };
}

const parseDiceExpression = function (exp) {
  let remaining = exp;
  let expOrSpace = orCombinator(operatorMatcher, spaceMatcher);
  let matcherRotation = [spaceMatcher, diceExpMatcher, spaceMatcher, expOrSpace];
  let i = 0;
  let tokens = [];
  while (remaining.length > 0) {
    let currentMatcher = matcherRotation[i];
    let matchResult = currentMatcher(remaining);
    if (matchResult) {
      tokens = tokens.concat(matchResult.tokens);
      remaining = matchResult.rest;
    } else {
      throw new Error("Parse error @ position " + (exp.length - remaining.length) + " - '" +
                      remaining.slice(Math.max(remaining.length, 10)));
    }
    i = (i + 1) % matcherRotation.length;
  }
  return tokens;
}

const sortCollapseDice = function (uncolDie){
  uncolDie.sort((a,b)=>{return b.sides - a.sides;});
  let currentDice = new DiceObject(0,uncolDie[0].sides);
  let dice = [];
  // sorted
  for(let i = 0; i < uncolDie.length; i++){
    if(uncolDie[i].sides == currentDice.sides){
      currentDice.setCount(currentDice.count + uncolDie[i].count);
    }else{
      dice = dice.concat(currentDice);
      currentDice = new DiceObject(uncolDie[i].count,uncolDie[i].sides);
    }
  }
  if(currentDice) dice = dice.concat(currentDice);
  return dice;
}

const rollResultToString = function (rollResult) {
  let str = "Result: ";

  /* Process Totals */
  if(rollResult.diceTotals.length == 1) {
    str += rollResult.diceTotals.length[0] + "\n";
  } else {
    for(let i = 0; i < rollResult.diceTotals.length - 1; i++){
      str += rollResult.diceTotals[i] + " + ";
    }
    str += rollResult.diceTotals[rollResult.diceTotals.length - 1] + " = " + rollResult.finalResult + "\n";
  }

  let diceTypes = Object.keys(rollResult.rolls);
  let pad = getPad(diceTypes);

  for(let i = 0; i < diceTypes.length; i++){
    str += "`D" + diceTypes[i] + "`";
    for(let j = 0; j < rollResult.rolls[diceTypes[i]].length; j++){

    }
    str += "\n";
  }

  return str;
}

const rollDiceString = function (exp){
  let dice = null;
  try{
    dice = parseDiceExpression(exp);
    dice = sortCollapseDice(dice);
    
    for(let i = 0; i < dice.length; i++){
      if(dice.count > 500) return "";
      if(dice.sides > 1000) return "";
    }

    let max = 0;
    let maxCrit = false;

    let rollResult = {
      finalResult: 0,
      diceTotals: [],
      rolls: {}
    };

    for(let i = 0; i < dice.length; i++){
      let diceTotal = 0;
      let diceMax = dice[i].sides;
      let rolls = roll(dice[i]);
      let crit = [];
      for(let j = 0; j < rolls.length; j++) {
        if(rolls[j] == diceMax) crit[j] = true; 
        else crit[j] = false;
        if( max < (crit[j] ? rolls[j] * CRIT_MULT : rolls[j])){
          max = (crit[j] ? rolls[j] * CRIT_MULT : rolls[j]);
          maxCrit = crit[j];
        }
      }

      rollResult.rolls[diceMax] = [];

      for(let k = 0; k < rolls.length;k++){
        rollResult.rolls[diceMax].push(rolls[k]);
        diceTotal += rolls[k];
      }

      rollResult.diceTotals.push(diceTotal);
      rollResult.finalResult += diceTotal;
    }

    return rollResultToString(rollResult);
  } catch(err) {
    return "";
  }
}

module.exports = {
  DiceObject: DiceObject,
  roll: roll,
  diceExpMatcher: diceExpMatcher,
  spaceMatcher: spaceMatcher,
  operatorMatcher: operatorMatcher,
  orCombinator: orCombinator,
  parseDiceExpression: parseDiceExpression,
  sortCollapseDice: sortCollapseDice,
  rollDiceString: rollDiceString
}