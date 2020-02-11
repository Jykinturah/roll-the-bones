"use strict";

const config = require("../config.json");
const Chance = require("chance");
const chance = new Chance();
const CRIT_MULT = 1;
const DELIM = config.delim;
const LOG_BOOL = false;

/** Modified code from https://github.com/dbkang/dice-expression-evaluator **/

const DiceObject = function(countIn, sidesIn, op) {
  this.count = countIn;
  this.sides = sidesIn;
  this.operator = op || "+";
  this.setCount = function(countIn) {
    this.count = countIn;
  };
};

const roll = function(dice) {
  let result = [];
  if(dice.operator === "-"){
    for (let i = 0; i < dice.count; i++)
      result = result.concat(-chance.natural({ min: 1, max: dice.sides }));
    return result.sort((a, b) => {
      return a - b;
    });
  }
  for (let i = 0; i < dice.count; i++)
    result = result.concat(chance.natural({ min: 1, max: dice.sides }));
  return result.sort((a, b) => {
    return b - a;
  });
};

const digitLengthMax = function(values) {
  let max = 0;
  for (let i = 0; i < values.length; i++) {
    let digitLength = values[i].toString().length;
    if (max < digitLength) max = digitLength;
  }
  return max;
};

const diceTokenizer = function(str,op) {
  let match = /^([1-9][0-9]*)?(d|D)(([1-9][0-9]*)|\%)/.exec(str);
  if (match === null) return new DiceObject(Number(str),1,op);
  let diceCount = Number(match[1]) || 1;
  let sideCount = match[3] === "%" ? 100 : Number(match[3]);
  return new DiceObject(diceCount, sideCount, op);
};

const diceExpMatcher = function(str) {
  let match = /^([1-9][0-9]*)?(d|D)(([1-9][0-9]*)|\%)/.exec(str);
  if (match === null) return null;
  return {
    tokens: [match[0]],
    rest: str.slice(match[0].length)
  };
};

const constValMatcher = function(str) {
  let match = /^[1-9][0-9]*/.exec(str);
  if (match === null) return null;
  return {
    tokens: [match[0]],
    rest: str.slice(match[0].length)
  };
};

const spaceMatcher = function(str) {
  let match = /^[ \t]*/.exec(str);
  return { tokens: [], rest: str.slice(match[0].length) };
};

const operatorMatcher = function(str) {
  let match = /^[+|-]/.exec(str);
  if (match === null) {
    return null;
  }
  return { tokens: [match[0]], rest: str.slice(1) };
};

const orCombinator = function(matcher1, matcher2) {
  return function(str) {
    return matcher1(str) || matcher2(str);
  };
};

const parseDiceExpression = function(exp) {
  let remaining = exp;
  let expOrSpace = orCombinator(operatorMatcher, spaceMatcher);
  let diceOrConstant = orCombinator(diceExpMatcher, constValMatcher);
  let matcherRotation = [
    spaceMatcher,
    expOrSpace,
    spaceMatcher,
    diceOrConstant,
    spaceMatcher,
    expOrSpace
  ];
  let i = 0;
  let tokens = [];
  while (remaining.length > 0) {
    let currentMatcher = matcherRotation[i];
    let matchResult = currentMatcher(remaining);
    if (matchResult) {
      tokens = tokens.concat(matchResult.tokens);
      remaining = matchResult.rest;
    } else {
      return null;
      // throw new Error(
      //   "Parse error @ position " +
      //     (exp.length - remaining.length) +
      //     " - '" +
      //     remaining.slice(Math.max(remaining.length, 10))
      // );
    }
    i = (i + 1) % matcherRotation.length;
  }
  if (tokens.length % 2 != 0) tokens = ["+"].concat(tokens);

  let diceTokens = [];

  for (let to = 0; to < tokens.length; to += 2){
    if(tokens[to] === "+"){
      diceTokens = diceTokens.concat(diceTokenizer(tokens[to+1]));
    } else {
      diceTokens = diceTokens.concat(diceTokenizer(tokens[to+1],"-"));
    }
  }

  if(LOG_BOOL) {
    console.log("parseDiceExpression\n--------------------\n");
    console.log(diceTokens);
    console.log("====================\n");
  }

  return diceTokens;
};

const sortCollapseDice = function(uncolDie) {
  uncolDie.sort((a, b) => {
    return b.sides - a.sides;
  });

  let currentPosDice = new DiceObject(0, uncolDie[0].sides);
  let currentNegDice = new DiceObject(0, uncolDie[0].sides,"-");
  let dice = [];

  // sorted

  // sort-aggregate all positives
  for (let i = 0; i < uncolDie.length; i++) {
    if (uncolDie[i].sides === 1) continue;
    if (uncolDie[i].sides == currentPosDice.sides) {
      if ( uncolDie[i].operator === "+" ) {
        currentPosDice.setCount(currentPosDice.count + uncolDie[i].count);
      } else {
        currentNegDice.setCount(currentNegDice.count + uncolDie[i].count);
      }
    } else {
      dice = dice.concat(currentPosDice);
      dice = dice.concat(currentNegDice);
      if (uncolDie[i].operator === "+" ) {
        currentPosDice = new DiceObject(uncolDie[i].count, uncolDie[i].sides);
        currentNegDice = new DiceObject(0, uncolDie[i].sides,"-");
      } else {
        currentPosDice = new DiceObject(0, uncolDie[i].sides);
        currentNegDice = new DiceObject(uncolDie[i].count, uncolDie[i].sides,"-");
      }
    }
  }

  // clean up loop results
  dice = dice.concat(currentPosDice);
  dice = dice.concat(currentNegDice);
  // currentDice = new DiceObject(0, uncolDie[0].sides, "-");

  // gather all positive constants together
  for (let c = 0; c < uncolDie.length; c++){
    if ( uncolDie[c].sides === 1 && uncolDie[c].operator === "+" )
      dice = dice.concat(uncolDie[c]);
  }

  // // sort-aggregate all negatives
  // for (let j = 0; j < uncolDie.length; j++) {
  //   if (uncolDie[j].sides === 1) continue;
  //   if (uncolDie[j].sides == currentDice.sides && uncolDie[j].operator === currentDice.operator ) {
  //     currentDice.setCount(currentDice.count + uncolDie[j].count);
  //   } else if ( uncolDie[j].operator === currentDice.operator ) {
  //     dice = dice.concat(currentDice);
  //     currentDice = new DiceObject(uncolDie[j].count, uncolDie[j].sides, "-");
  //   }
  // }

  // dice = dice.concat(currentDice);
  
  // sort-aggregate all negatives
  for (let m = 0; m < uncolDie.length; m++){
    if ( uncolDie[m].sides === 1 && uncolDie[m].operator === "-" )
      dice = dice.concat(uncolDie[m]);
  }

  // remove junk dice objects
  dice = dice.filter(value => value.count != 0);

  if(LOG_BOOL) {
    console.log("sortCollapseDice\n--------------------\n");
    console.log(dice);
    console.log("====================\n");
  }
  return dice;
};

const rollResultToString = function(rollResult) {
  let str = "Result: ";
  let diceTypes = Object.keys(rollResult.diceTotals);
  let digitLength = digitLengthMax(diceTypes);

  /* Process Totals */
  if (diceTypes.length == 1) {
    let valMax = diceTypes[0] * rollResult.rolls[diceTypes[0]].length;
    if (valMax == rollResult.diceTotals[diceTypes[0]]) {
      str += "**" + rollResult.diceTotals[diceTypes[0]] + "**";
    } else {
      str += rollResult.diceTotals[diceTypes[0]];
    }
    if (rollResult.constants.length > 0)
      str += " + " + (rollResult.finalResult - rollResult.diceTotals[diceTypes[0]]) + " = " + rollResult.finalResult + "\n";
    else str += "\n";
  } else {
    let absMax = 0;
    let diceTotalFinal = 0;

    for (let i = diceTypes.length - 1; i > 0; i--) {
      let ri = diceTypes.length - (i + 1);

      let valMax = diceTypes[ri] * rollResult.rolls[diceTypes[ri]].length;
      diceTotalFinal += rollResult.diceTotals[diceTypes[ri]];
      absMax += valMax;

      if (valMax == rollResult.diceTotals[diceTypes[ri]]) {
        str += "**" + rollResult.diceTotals[diceTypes[ri]] + "** + ";
      } else {
        str += rollResult.diceTotals[diceTypes[ri]] + " + ";
      }
    }

    let valMax = diceTypes[diceTypes.length - 1] * rollResult.rolls[diceTypes[diceTypes.length - 1]].length;
    diceTotalFinal += rollResult.diceTotals[diceTypes[diceTypes.length - 1]];
    absMax += valMax;

    if (valMax == rollResult.diceTotals[diceTypes[diceTypes.length - 1]]) {
      str += "**" + rollResult.diceTotals[diceTypes[diceTypes.length - 1]] + "**";
    } else {
      str += rollResult.diceTotals[diceTypes[diceTypes.length - 1]];
    }

    if (rollResult.constants.length > 0) 
      str += " + " + (rollResult.finalResult - diceTotalFinal);

    if (absMax == rollResult.finalResult) {
      str += " = **" + rollResult.finalResult + "**\n";
    } else {
      str += " = " + rollResult.finalResult + "\n";
    }
  }

  /* Process Individual Rolls by Dice */
  for (let i = 0; i < diceTypes.length; i++) {
    let diceTypeStr = diceTypes[i].toString();
    if (diceTypeStr.length < digitLength) {
      for (let s = 0; s <= digitLength - diceTypeStr.length; s++) {
        diceTypeStr += " ";
      }
    }
    str += "`D" + diceTypeStr + "` [";
    for (let j = 0; j < rollResult.rolls[diceTypes[i]].length - 1; j++) {
      let val = rollResult.rolls[diceTypes[i]][j];
      if (val == diceTypes[i]) {
        str += "**" + val + "**" + DELIM;
      } else {
        str += val + DELIM;
      }
    }
    let val =
      rollResult.rolls[diceTypes[i]][rollResult.rolls[diceTypes[i]].length - 1];
    if (val == diceTypes[i]) {
      str += "**" + val + "**]";
    } else {
      str += val + "]";
    }
    str += "\n";
  }

  return str;
};

const rollDiceString = function(exp) {
  let dice = null;
  try {
    dice = parseDiceExpression(exp);
    if(dice == null) return "Rolling in... me bones... (No dice found)";
    if(dice.length === 1 && dice[0].count ===1) {
      // In the future may handle these differently
      console.log("A single! D" + dice[0].sides);
    }
    dice = sortCollapseDice(dice);

    for (let i = 0; i < dice.length; i++) {
      if (dice[i].count > 500) return "Too many bones.... (ERR 500C)";
      if (dice[i].sides > 1000) return "My sides... (ERR 1kS)";
    }

    let max = 0;
    let maxCrit = false;

    let rollResult = {
      finalResult: 0,
      diceTotals: {},
      rolls: {},
      constants: []
    };

    if(LOG_BOOL) {
      console.log("rollDiceString\n--------------------\n");
    }

    for (let i = 0; i < dice.length; i++) {
      if(dice[i].sides != 1){
        if(dice[i].operator === "+"){
          let diceTotal = 0;
          // let diceMax = dice[i].operator === "+" ? dice[i].sides : -dice[i].sides) ;
          let diceMax = dice[i].sides;
          let rolls = roll(dice[i]);
          let crit = [];
          for (let j = 0; j < rolls.length; j++) {
            if (rolls[j] == diceMax) crit[j] = true;
            else crit[j] = false;
            if (max < (crit[j] ? rolls[j] * CRIT_MULT : rolls[j])) {
              max = crit[j] ? rolls[j] * CRIT_MULT : rolls[j];
              maxCrit = crit[j];
            } 
          }

          if(LOG_BOOL) {
            console.log("- - - - - - - - - - -");
            console.log("diceMax");
            console.log(diceMax);
            console.log("rolls");
            console.log(rolls);
            console.log("crit");
            console.log(crit);
            console.log("maxCrit");
            console.log(maxCrit);
          }

          rollResult.rolls[diceMax] = [];

          for (let k = 0; k < rolls.length; k++) {
            rollResult.rolls[diceMax].push(rolls[k]);
            diceTotal += rolls[k];
          }

          rollResult.diceTotals[diceMax] = diceTotal;
          rollResult.finalResult += diceTotal;
        } else {
          let diceTotal = 0;
          let diceMax = dice[i].sides;
          let rolls = roll(dice[i]);
          let crit = [];
          for (let j = 0; j < rolls.length; j++) {
            if (rolls[j] == -diceMax) crit[j] = true;
            else crit[j] = false;
          }

          if(!rollResult.rolls[diceMax]) rollResult.rolls[diceMax] = [];

          for (let k = 0; k < rolls.length; k++) {
            rollResult.rolls[diceMax].push(rolls[k]);
            diceTotal += rolls[k];
          }

          if(!rollResult.diceTotals[diceMax]) rollResult.diceTotals[diceMax] = 0;
          rollResult.diceTotals[diceMax] += diceTotal;
          rollResult.finalResult += diceTotal;
        }
      } else {
        let constVal = (dice[i].operator === "+" ? dice[i].count : -dice[i].count);
        rollResult.constants.push(constVal);
        rollResult.finalResult += constVal;
        if(LOG_BOOL) {
          console.log("- - - - - - - - - - -");
          console.log("constVal");
          console.log(constVal);
        }
      }
    }

    if(LOG_BOOL) {
      /* let rollResult = {
      finalResult: 0,
      diceTotals: [],
      rolls: {},
      constants: []
    }; */
      console.log("====================\n");
      console.log("rollResult.finalResult");
      console.log(rollResult.finalResult);
      console.log("rollResult.diceTotals");
      console.log(rollResult.diceTotals);
      console.log("rollResult.rolls");
      console.log(rollResult.rolls);
      console.log("rollResult.constants");
      console.log(rollResult.constants);
      console.log("====================\n");
    }

    return rollResultToString(rollResult);
  } catch (err) {
    console.log(err);
    return "Oh... a bug in me bones... (ERR)" ;
  }
};

module.exports = {
  rollDiceString: rollDiceString
};
