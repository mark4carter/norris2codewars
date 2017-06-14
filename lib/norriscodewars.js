var fs = require('fs');
var CodeWars = require('codewars-client');
var Bot = require('slackbots');
var Q = require("q");



//----------------------------------------------------------
//!
//!   NorrisCodeWars (extends codewars)
//!
//----------------------------------------------------------

var NorrisCodeWars = CodeWars();



// Holds the currentmessage being processed
NorrisCodeWars.currentMessage = '';


/**
 * Function used to add a Bot the newly created CodeWars Object
 * @param {object} settings
 * @private
 */
NorrisCodeWars.syncBot = function(codewarsBot) {
    this.bot = codewarsBot;
}


/**
 * @Override
 * Checks to see if a challenge has already started
 *    Sets state to "dismissal"
 * @param {} 
 * @returns {promise}
 */
NorrisCodeWars.checkCurrentChallenge = function(){
    var df = Q.defer();
    var self = this;

    var channel = this.bot._getChannelById(this.currentMessage.channel);
    var currentChallenge = this.paths.currentChallenge;

    if (fs.existsSync(currentChallenge)){

        self.codeWarsState = 'dismissal';
        console.log("state in currentChallenge " + self.codeWarsState);

         self.bot.postMessageToChannel(channel.name, 
             "Hmmm, your current challenge will be dismissed. Continue? [y/N]", {as_user: true});

        df.reject();


    } else {
        df.resolve();
    }

    return df.promise;
}


/**
 * @Override
 * Prints to Slack if solution is incorrect
 * @param {data object} 
 */
NorrisCodeWars.logAttempt = function(data){

    var self = this;
 
    var channel = this.bot._getChannelById(this.currentMessage.channel);
    var user = this.bot._getUserById(this.currentMessage.user);

    if (data.valid){

         self.bot.postMessageToChannel(channel.name, 
             "Well done, @" + user.name + " ! Solution is correct. :)", {as_user: true});
    } else {


        var parsedReason = data.output.toString().replace(/<div[^>]*>/g, ' ').replace(/<\/div>/g, '\n').replace(/\\/g, '');

         self.bot.postMessageToChannel(channel.name, 
             "Nope. Your solution is incorrect. :( \n\n" + 
             "```## Stack trace\n" + data.reason +"```", {as_user: true});
         self.bot.postMessageToChannel(channel.name,
            "```" + parsedReason + "```", {as_user: true})
    }

    this.logTestData(data);

    if (data.valid) {
         self.bot.postMessageToChannel(channel.name, 
             "You can still make some final changes, before submitting with: `codewars submit`", 
             {as_user: true});
    } else {
        log('')
    }
}

/**
 * @Override
 * Prints to Slack solution detials
 * @param {data object} 
 */
NorrisCodeWars.logTestData = function(data){
    var self = this;
 
    var channel = this.bot._getChannelById(this.currentMessage.channel);

      var buff = data.summary.passed.toString() + " passed" + ', ' +
        data.summary.failed.toString() + " failed" + ', ' +
        data.summary.errors.toString() + " errors" + " in " +
        data.wall_time.toString() + 'ms';



    self.bot.postMessageToChannel(channel.name, 
        buff, {as_user: true});
}


module.exports = NorrisCodeWars;