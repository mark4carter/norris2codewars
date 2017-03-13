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


var NorrisCodeWars = CodeWars();

NorrisCodeWars.currentMessage = '';

NorrisCodeWars.checkCurrentChallenge = function(){
    var df = Q.defer();
    //var self = this;

    //console.log(this);
    //console.log(~~~~~ + this);


    var channel = new NorrisBot()._getChannelById(this.currentMessage.channel);
    var currentChallenge = this.paths.currentChallenge;

    if (fs.existsSync(currentChallenge)){


        self.codeWarsState = 'dismissal';

         self.postMessageToChannel(channel.name, 
             "Current challenge will be dismissed. Continue? [y/N]", {as_user: true});

        df.reject();


    } else {
        df.resolve();
    }

    return df.promise;
}


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
    this.cwars = this._getCodeWars();
    this.challenge = '';
    this.codeWarsState = 'starting';
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

    var msgArray = originalMessage.text.split(" ");
    var codewarsCall = msgArray[0];
    var codewarsFunction = msgArray[1];

    switch (codewarsFunction){
      case 'setup':
        setup();
        break;

      case 'test':
        this._testCodeWars(originalMessage);
        break;

      case 'train':
        this._trainCodewars(originalMessage);
        break;

      case 'verify':
        verify();
        break;

      case 'submit':
        submit();
        break;

      case 'print':
        this._printCodeWars(originalMessage);
        break;

      case 'yes':
        this._trainCodewarsYes(originalMessage);
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

    var channel = self._getChannelById(originalMessage.channel);
    this.cwars.test().then(function() {

        console.log(self.cwars.fetch());

        self.postMessageToChannel(channel.name, "'Success = ready to rumble!!!", {as_user: true});
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

    this.cwars.currentMessage = originalMessage;

    this.cwars.fetch().then(function(data){
        if (!data) return;

        console.log("in fetch")
        var channel = self._getChannelById(originalMessage.channel);

        self.challenge = require('codewars-client/challenge')(data.raw.toString('utf-8'));

        self.postMessageToChannel(channel.name, self.challenge.toString() + 
            "\n\n Take this challenge [y/N]", {as_user: true});

    }).fail("responseError");
}

/**
 * Register and begine current challenge
 * @param {object} message
 * @private
 */
NorrisBot.prototype._trainCodewarsYes = function(originalMessage) {
    var self = this;

    var channel = this._getChannelById(originalMessage.channel); 
    var currentChallenge = this.paths.currentChallenge;

    if (self.codeWarsState == 'dismissal') {
        fs.unlink(currentChallenge);
        self.postMessageToChannel(channel.name, "Ok, hold on as you get you a new challenge", {as_user: true});

    } else if (self.challenge) {
        console.log("in self");
        self.cwars.train(self.challenge).
            then(function(data){
                console.log("in first then");
                var challenge = require('codewars-client/challenge')(data.raw.toString('utf-8'));
                self.cwars.save(challenge)
            }, "Error").then(function(){
                console.log("in second then");
                self.postMessageToChannel(channel.name, self.challenge.acceptedMessage(), {as_user: true});
            });
    } else {
        console.log("false")
        this.postMessageToChannel(channel.name, "Please use `codewars train` first.", {as_user: true});  
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
            console.log(err.message);
        })
}

/**
 * Replyes to a message with a random Joke
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
NorrisBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

NorrisBot.prototype._getCodeWars = function() {
    //var cw = CodeWars();


    return NorrisCodeWars;
}

module.exports = NorrisBot;


153