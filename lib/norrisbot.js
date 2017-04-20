'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var CodeWars = require('codewars-client');
var Q = require("q");


/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "norrisbot")
 *      dbPath : the path to access the database (will default to "data/norrisbot.db")
 *
 * @param {object} settings
 * @constructor
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 */
class NorrisBot extends Bot {


    constructor(settings) {
        super(settings);
        this.settings = settings;
        this.settings.name = this.settings.name || 'norris-bot';
        this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'norrisbot.db');

        this.user = null;
        this.db = null;
    }

};






//----------------------------------------------------------
//!
//!   NorrisCodeWars (extends codewars)
//!
//----------------------------------------------------------

var NorrisCodeWars = CodeWars();

NorrisCodeWars.addBot = function(settings) {
    this.bot = new Bot(settings);
}

NorrisCodeWars.currentMessage = '';


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

    if (data.valid){
         self.bot.postMessageToChannel(channel.name, 
             "Well done! Solution is correct. :)", {as_user: true});
    } else {
         self.bot.postMessageToChannel(channel.name, 
             "Nope. Your solution is incorrect. :( \n\n" + 
             "```## Stack trace\n" + data.reason +"```", {as_user: true});
         self.bot.postMessageToChannel(channel.name,
            data.output.toString(), {as_user: true})
    }

    this.logTestData(data);

    // if (data.valid) {
    //     log('\n')
    //     log(msee.parse("You can still make some final changes, before submitting with:\n" +
    //       "```\ncodewars submit```"))
    // } else {
    //     log('')
    // }
}

/**
 * @Override
 * Prints to Slack solution detials
 * @param {data object} 
 */
NorrisCodeWars.logTestData = function(data){
    var self = this;
 
    var channel = this.bot._getChannelById(this.currentMessage.channel);

    // console.log(data);

      var buff = data.summary.passed.toString() + " passed" + ', ' +
        data.summary.failed.toString() + " failed" + ', ' +
        data.summary.errors.toString() + " errors" + " in " +
        data.wall_time.toString() + 'ms';



    self.bot.postMessageToChannel(channel.name, 
        buff, {as_user: true});
}











//----------------------------------------------------------
//!
//!   NorrisBot functions
//!
//----------------------------------------------------------

/**
 * Run the bot
 * @public
 */
NorrisBot.prototype.run = function () {

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
NorrisBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
    this.cwars = this._getCodeWars(this.settings);
    this.challenge = '';
    this.cwars.codeWarsState = 'starting';
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
NorrisBot.prototype._onMessage = function (message) {
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
 */
NorrisBot.prototype._processReply = function(message) {
    if (this._isMentioningChuckNorris(message)){
        this._replyWithRandomJoke(message);
    } else if (this._isCodeWars(message)) {
        this._processCodeWars(message);
    }
};

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

      case 'debug':
        this.debugger(originalMessage);
        break;
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

    self.postMessageToChannel(channel.name, "Let's find you a challenge", {as_user: true});

    this.cwars.fetch().then(function(data){
        if (!data) return;

        console.log("in fetch")
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
                console.log("in first then");
                var challenge = require('codewars-client/challenge')(data.raw.toString('utf-8'));
                self.cwars.save(challenge)
            }, "Error").then(function(){
                console.log("in second then");
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


        //    https://files.slack.com/files-pri/T0QM54669-F4W0WFFC2/test.js

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

                    // Data reception is done, do whatever with it!
                    // console.log(body);

                    // callback({
                    //     email: parsesed.email,
                    //     password: parsed.pass
                    // });
                });
            });

        }

        getTestPersonaLoginCredentials();

    }
}

/**
 * Prints current challenge
 * @param {object} message
 * @private
 */
NorrisBot.prototype._printCodeWars = function(originalMessage) {
    console.log(">>>>>>>> starting print codewars")
    var self = this;
    var channel = this._getChannelById(originalMessage.channel);

    self.cwars.getCurrentChallenge().
        then(function(challenge) {

                console.log(">>>>>>>>>>>>>> in getCurrentChallenge")
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
    // console.log(msgArray);

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


          // console.log('## Kata completed')
          // console.log('See more solutions here: http://www.codewars.com/kata/' +
          //     self.cwars.challenge.slug +
          //     '/solutions/' + self.cwars.challenge.language)
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
 * Replies to a message with a random Joke
 * @param {object} originalMessage
 * @private
 */
NorrisBot.prototype._replyWithRandomJoke = function (originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessageToChannel(channel.name, record.joke, {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
};

/**
 * Loads the user object representing the bot
 * @private
 */
NorrisBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.settings.name;
    })[0];
};

/**
 * Open connection to the db
 * @private
 */
NorrisBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

/**
 * Check if the first time the bot is run. It's used to send a welcome message into the channel
 * @private
 */
NorrisBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

/**
 * Sends a welcome message in the channel
 * @private
 */
NorrisBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi guys, roundhouse-kick anyone?' +
        '\n I can tell jokes, but very honest ones. Just say `Chuck Norris` or `' + this.name + '` to invoke me!',
        {as_user: true});
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChatMessage = function (message) {
    console.log(message);
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};

/**
 * Util function to check if a given real time message is mentioning Chuck Norris or the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isMentioningChuckNorris = function (message) {
    return message.text.toLowerCase().indexOf('chuck norris') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Util function to check if a given real time message has ben sent by the norrisbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
NorrisBot.prototype._isFromNorrisBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
Bot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

NorrisBot.prototype._getCodeWars = function(settings) {
    //var cw = CodeWars();

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

        //    https://files.slack.com/files-pri/T0QM54669-F4W0WFFC2/test.js

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
        console.log(err);
    }) 
}

module.exports = NorrisBot;


153




/*

[ ] Codewars setup -- send log messages to slack

[ ] Work on codewars submission

[ ] Message if `codewars` input is not understood

[ ] Implement timeout / error resolving
.fail is important here


*/