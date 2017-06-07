'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var NorrisBot = require('./norrisbot');
var CodeWars = require('codewars-client');
var Q = require("q");
var NorrisCodeWars = require('./norriscodewars');


/**
 * CodeWars Bot adds codewars functionlity to an existing NorrisBot
 *    
 *
 * @param {object} settings
 * @constructor
 *
 *  @author Mark Carter <mark4carter@gmail.com>
 *
 */
class CodeWarsBot extends NorrisBot {


    constructor(settings) {
        super(settings);
    }

};







// //----------------------------------------------------------
// //!
// //!   NorrisBot functions
// //!
// //----------------------------------------------------------




/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
CodeWarsBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
    this.cwars = this._getCodeWars(this.settings);

    var self = this;

    try {
      var data = fs.readFileSync(self.cwars.paths.settingsJSON, {encoding: "utf-8"});

      var token = JSON.parse(data).token;

      if (!token) throw "Token not found, run 'codewars setup' first."
      var language = JSON.parse(data).language.toLowerCase();

      if (!language) throw "Language not found, run 'codewars setup' first."
      if (!/ruby|javascript/.test(language)) throw language + " is unsupported. Ruby and JS only."

      var strategy  = JSON.parse(data).strategy.toLowerCase();


      this.cwars.codeWarsState = 'starting';
    }
    catch (e) {

      self.postMessageToChannel(self.channels[0].name, 'Unable to read settings please run ' +
        '`codewars setup` before codewars can run correctly',
        {as_user: true});

      console.log(e);

      this.cwars.codeWarsState = 'init'
    }
    

};

// /**
//  * On message callback, called when a message (of any type) is detected with the real time messaging API
//  * @param {object} message
//  * @private
//  */
CodeWarsBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromNorrisBot(message)) {
            this._processReply(message);
    }
};

/**
 * On procesing of messeage, determines to reach out to Chuck Norris or Codewars
 * @param {object} message
 * @private
 */``
CodeWarsBot.prototype._processReply = function(message) {
    if (this._isMentioningChuckNorris(message)){
        this._replyWithRandomJoke(message);
    } else if (this._isCodeWars(message)) {

        this._processCodeWars(message);

    }
};


//----------------------------------------------------------
//!
//!   NorrisBot functions -- Codewars Specific
//!
//----------------------------------------------------------


/**
 * Util function to check if a given real time message is mentioning Codewars
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isCodeWars = function(message) {    
    return message.text.toLowerCase().indexOf('codewars') > -1;
}


/**
 * Determine which codewars method to run
 * @param {object} message
 * @private
 */
NorrisBot.prototype._processCodeWars = function(originalMessage) {
    var self = this;    
    var channel = self.cwars.bot._getChannelById(originalMessage.channel);

    if (self.cwars.codeWarsState == "init" && 
          originalMessage.text.indexOf("codewars setup") != 0 &&
          originalMessage.text.indexOf("codewars help") != 0) {
      self.cwars.bot.postMessageToChannel(channel.name, 'Unable to read settings please run ' +
        '`codewars setup` before codewars can run correctly',
        {as_user: true});
      return;
    }

    var downloadArray = originalMessage.text.split("|");

    if (downloadArray.length > 2 && downloadArray[2].toLowerCase().indexOf('codewars verify') > -1) {

        this._processFileShare(originalMessage);
        return;
    }

    var msgArray = originalMessage.text.split(" ");
    var codewarsCall = msgArray[0];
    var codewarsFunction = msgArray[1];
    //split used for verify function, to allow newline after 'verify' keyword
    codewarsFunction = codewarsFunction.split("\n")[0];

    switch (codewarsFunction){
      case 'setup':
        this._codewarsSetup(originalMessage);
        break;

      case 'test':
        this._testCodeWars(originalMessage);
        break;

      case 'train':
        this._trainCodewars(originalMessage);
        break;

      case 'verify':
        this._codeWarsVerify(originalMessage);
        break;

      case 'submit':
        this._submitCodeWars(originalMessage);
        break;

      case 'print':
        this._printCodeWars(originalMessage);
        break;

      case 'yes':
        this._trainCodewarsYes(originalMessage);
        break;

      case 'no':
        this._codewarsNo(originalMessage);
        break;

      case 'debug':
        this.debugger(originalMessage);
        break;

      case 'help':
        this._codewarsHelp(originalMessage);
        break;

      default:
        this._codewarsUnknown(originalMessage); 
    }
}

/**
 * Tests connection to CodeWars API
 * @param {object} message
 * @private
 */
NorrisBot.prototype._testCodeWars = function(originalMessage) {

    var self = this;

    var channel = self.cwars.bot._getChannelById(originalMessage.channel);
    this.cwars.currentMessage = originalMessage;

    self.cwars.bot.postMessageToChannel(channel.name, "'Testing connection ... ", {as_user: true});

    this.cwars.test().then(function() {

        self.cwars.bot.postMessageToChannel(channel.name, "'Success = ready to rumble!!!", {as_user: true});
    }, "Big Error");    
}


/**
 * Determine which codewars method to run
 * @param {object} message
 * @private
 */
NorrisBot.prototype._trainCodewars = function(originalMessage) {
    var self = this;

    console.log("in Train Code Wars");

    var channel = self.cwars.bot._getChannelById(originalMessage.channel);
    this.cwars.currentMessage = originalMessage;

    self.postMessageToChannel(channel.name, "Great! Let's find a challenge", {as_user: true});

    this.cwars.fetch().then(function(data){
        if (!data) return;

        var channel = self._getChannelById(originalMessage.channel);

        self.challenge = require('codewars-client/challenge')(data.raw.toString('utf-8'));

        self.postMessageToChannel(channel.name, self.challenge.toString() + 
            "\n\n *Take this challenge [`codewars yes`/ `codewars no`]", {as_user: true});

    }).fail("responseError")
    .catch(function (error) {
        console.log(error);
    });
}

/**
 * Register and begin current challenge
 * @param {object} message
 * @private
 */
NorrisBot.prototype._trainCodewarsYes = function(originalMessage) {
    var self = this;

    var channel = this._getChannelById(originalMessage.channel); 
    var currentChallenge = this.cwars.paths.currentChallenge;

    if (self.cwars.codeWarsState == 'dismissal') {
        fs.unlink(currentChallenge);
        self.postMessageToChannel(channel.name, "Ok, hold on as we get you a new challenge", {as_user: true});
        self._trainCodewars(originalMessage);
        self.cwars.codeWarsState = '';
    } else if (self.challenge) {
        console.log("in self");
        self.cwars.train(self.challenge).
            then(function(data){
                var challenge = require('codewars-client/challenge')(data.raw.toString('utf-8'));
                self.cwars.save(challenge)
            }, "Error").then(function(){
                self.cwars.bot.postMessageToChannel(channel.name, self.challenge.acceptedMessage(), {as_user: true});
                self.challenge = '';
            }).
              fail(function(err){
                  console.log(err)
              })
    } else {
        this.postMessageToChannel(channel.name, "Please use `codewars train` first.", {as_user: true});  
    }

}
/**
 * Register and begin current challenge
 * @param {object} message
 * @private
 */
NorrisBot.prototype._codewarsNo = function(originalMessage) {
    var self = this;

    var channel = this._getChannelById(originalMessage.channel); 
    var currentChallenge = this.cwars.paths.currentChallenge;

    if (self.cwars.codeWarsState == 'dismissal') {
        self.postMessageToChannel(channel.name, "Ok, we will keep the current challenge. Type `codewars print` to review", {as_user: true});
        self.cwars.codeWarsState = '';
    } else if (self.challenge) {        
        this.postMessageToChannel(channel.name, "Use `codewars train` to switch to a new challenge.", {as_user: true});  
    } else {
        this.postMessageToChannel(channel.name, "Please use `codewars train` first.", {as_user: true});  
    }

}

/**
 *
 * Debugger used to test various features from Slack
 * @param {object} originalMessage 
 *
 */
NorrisBot.prototype.debugger = function(originalMessage) {
        var argument = originalMessage.text.split(" ")[2];
        var channel = this._getChannelById(originalMessage.channel);

        var self = this;

    switch(argument) {
        case "this":
            console.log(this);
            this.postMessageToChannel(channel.name, this, {as_user: true});
        case "download":
        var https = require('https');

        function getTestPersonaLoginCredentials(callback) {

            return https.get({
                host: 'files.slack.com',
                path: '/files-pri/T0QM54669-F4W0WFFC2/test.js',
                headers: {
                    "Authorization": "Bearer " + self.token
                }
            }, function(response) {
                // Continuously update stream with data
                var body = '';
                response.on('data', function(d) {
                    body += d;
                });
                response.on('end', function() {

                });
            });

        }

        getTestPersonaLoginCredentials();

        case "sender":
            var members = self.cwars.bot._getUserById(originalMessage.user);
    }
}

/**
 * Prints current challenge
 * @param {object} message
 * @private
 */
NorrisBot.prototype._printCodeWars = function(originalMessage) {
    var self = this;
    var channel = this._getChannelById(originalMessage.channel);

    self.cwars.getCurrentChallenge().
        then(function(challenge) {
                self.postMessageToChannel(channel.name, 
                    challenge.toString() +
                    "----" +
                    challenge.instructions(),
                    {as_user: true});

        }).fail(function(err){
            if (err.message == 'no current challenge - run `codewars train` first'){       
                self.postMessageToChannel(channel.name, err.message, {as_user: true});
            }
            console.log(err.message);
        })
}

/**
 * Sends uploaded solution file to CodeWars API
 * @param {object} message
 * 
 */
NorrisBot.prototype._codeWarsVerify = function(originalMessage) {
    var msgArray = originalMessage.text.split("verify")[1];

    var self = this;
    var channel = this._getChannelById(originalMessage.channel);    
    this.cwars.currentMessage = originalMessage;   

    self.postMessageToChannel(channel.name, "```"+msgArray+"```", {as_user: true});

    this.cwars.attempt(msgArray).
        then(function(response){
          var body = JSON.parse(response.raw.toString('utf-8'));
          if (body.success){
            var poll = function(){
              self.cwars.poll(body.dmid).then(function(response){
                var body = JSON.parse(response.raw.toString('utf-8'));
                if (!body.success) setTimeout(poll, 1000);
                else  {
                    self.cwars.logAttempt(body);
                }
              }).
              fail(function(err) {
                console.log(err);
              })
            }
            poll()
          } else {
            log('Error: ' + body.reason);
          }
        }).
        fail(function(err){
          console.log(err)
        })
        .catch(function (error) {
            console.log(error);
        })
}

/**
 * Function used to submit code to Codwars API, successes only
 * @param {object} message
 * @private
 */
NorrisBot.prototype._submitCodeWars = function(originalMessage) {

    var self = this;
    var channel = this._getChannelById(originalMessage.channel);    
    this.cwars.currentMessage = originalMessage;

    self.cwars.finalize().then(function(response) {
        var body = JSON.parse(response.raw.toString('utf-8'));

        if (body.success){

            self.postMessageToChannel(channel.name, '## Kata completed', {as_user: true});

            self.postMessageToChannel(channel.name, 'See more solutions here: http://www.codewars.com/kata/' +
                          self.cwars.challenge.slug +
                          '/solutions/' + self.cwars.challenge.language, {as_user: true});

          self.cwars.done();


      } else {
        self.postMessageToChannel(channel.name, body.message, {as_user: true});
      }

      
    })
    .fail(function(err) {
        console.log(err);
    })
    .catch(function(err) {
        console.log(error);
    });
}

/**
 * Process an unknown command
 * @param {object} message
 * @private
 */
NorrisBot.prototype._codewarsUnknown = function(originalMessage) {
    var self = this;
    var channel = this._getChannelById(originalMessage.channel);

    self.postMessageToChannel(channel.name, 
        "`" + originalMessage.text + "` is not a codewars function.  Please use `codewars help` for a list of available functions.",
        {as_user: true});
}


/**
 * Function used to print instructions how to use CodeWars bot
 * @param {object} message
 * @private
 */
NorrisBot.prototype._codewarsHelp = function(originalMessage) {
    var self = this;
    var channel = this._getChannelById(originalMessage.channel);


    var usagePath = __dirname.split("/lib")[0];

    var fullPath = usagePath + '/node_modules/codewars-client/bin/usage.txt';

    fs.readFile(fullPath, {encoding: "utf-8"}, function(err, raw){
      if (err) throw err;

      //console.log(raw);
      //var data = JSON.parse(raw)._data;


    self.postMessageToChannel(channel.name, 
        "```" + raw + "```",
        {as_user: true});

    })

}


/**
 * Function used to get the Codewars object
 * @param {object} message
 * @returns {codewars object}
 * @private
 */
NorrisBot.prototype._getCodeWars = function(settings) {

    var settings = this.settings;
    settings.name = "CodeWars Bot";
    NorrisCodeWars.addBot(settings);

    return NorrisCodeWars;
}

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._processFileShare = function (message) {

    var self = this;
    var messageLink = message.file.url_private;

    if (message.subtype == "file_share") {


        var https = require('https');

        function sendForVerification(callback) {

            return https.get({
                host: 'files.slack.com',
                path: messageLink,
                headers: {
                    "Authorization": "Bearer " + self.token
                }
            }, function(response) {
                // Continuously update stream with data
                var body = '';
                response.on('data', function(d) {
                    body += d;
                });
                response.on('end', function() {

                    
                    message.text = "codewars verify " + body; 

                    self._codeWarsVerify(message);
                });
            });
        }

        sendForVerification();
    }
};


/**
 * Function used to set
 *  - token
 *  - language
 *  - strategy
 * @param {object} message
 * @returns {codewars object}
 * @private
 */
NorrisBot.prototype._codewarsSetup = function(message) {

    var self = this;

    var channel = this._getChannelById(message.channel);

    var argv = require('minimist') (
        message.text.split(" "),
        {
            alias: { h: 'help', t: 'token', l: 'language', s: 'strategy' }            
        }
    )

    argv.language = (argv.language || "javascript").toLowerCase();
    argv.strategy = (argv.strategy || "kyu_8_workout").toLowerCase();

    if (!argv.token) {
    self.postMessageToChannel(channel.name,
        "`Setup failed, missing required argument: --token` \n " +
        "Read your API access token here: https://www.codewars.com/users/edit" + 
        "\nUsage: " + 
        "codewars setup --token <token>\n",
        {as_user: true});

    return;
    }

    if (!/javascript|ruby/.test(argv.language)){
    self.postMessageToChannel(channel.name, 
        "Setup failed, unsupported language: `" + argv.language.toString() + "`",
        {as_user: true});
    return;
    }

    self.cwars.setup({
    language: argv.language,
    token: argv.token,
    strategy: argv.strategy
    }).then(function(){
        self.postMessageToChannel(channel.name, 
            "All done. Settings saved!",
            {as_user: true});
        console.log("All done. Settings saved in ~/.config/codewars/settings.json");
    }).catch(function(err) {
        self.postMessageToChannel(channel.name, 
            "Testing failed, there seems to be an issue",
            {as_user: true});
        console.log(err);
    }) 
}






//----------------------------------------------------------
//!
//!   Bot Override Functions
//!
//----------------------------------------------------------


/**
 * Util function to get the user object given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
Bot.prototype._getUserById = function (userId) {
    return this.users.filter(function (item) {
        return item.id == userId;
    })[0];
};



module.exports = CodeWarsBot;