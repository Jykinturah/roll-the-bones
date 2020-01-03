'use strict';

const Discord = require("discord.js");
const Promise = require("bluebird");
const replies = require("./replies.json");
const config = require("./config.json");
const dice = require("./functions/diceFunctions.js");

/* randomize relpies using list */
function reply(author) {
    return replies[Math.floor(Math.random() * replies.length)].replace("{usr}", author);
}

/* make client obj  */
const client = new Discord.Client();

/* client state on 'ready', do init stuff */
client.on('ready',() => {
  console.log("Harmony Core online.");
  client.user.setActivity("queries...",{type:"LISTENING"}).catch(err=>{throw err;});
  console.log("https://discordapp.com/oauth2/authorize?client_id="+client.user.id+"&scope=bot");
});

/* client recieve message processing */
client.on('message', async message => {
  if (message.isMentioned(client.user)){
    return message.channel.send(reply(message.author)).catch(err => {
      console.log(err);
    });
  }
  if(message.author.bot) return;
  if(message.content.indexOf(config.prefix)!==0) return;
  if(message.content.toLowerCase().startsWith(config.prefix + "roll")){
    return message.channel.send(message.author + " " + dice.rollDiceString(message.content.substring(5))).catch(err => {
      console.log(err);
    });;
  }
})

client.login(config.clientId);
