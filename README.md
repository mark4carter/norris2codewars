# norris2codewars

Install with `npm install`

API Key must be provided to run:

On Linu and Mac OSX
Run with `BOT_API_KEY=your_api_key node bin/bot.js`

On Windows
Run with `set BOT_API_KEY=your_api_key & node bin/bot.js`


## Create a Bot on your channel and get token

1. Go to :: https://yourorganization.slack.com/services/new/bot
2. After successfully adding, copy the API Token

Details: https://scotch.io/tutorials/building-a-slack-bot-with-node-js-and-chuck-norris-super-powers#toc-create-a-new-bot-on-your-slack-organization



## When running set up CodeWars API Token

1.  Get your Codewars API Token: https://www.codewars.com/users/edit
2.  When running in slack type `codewars setup --token your_token` to setup
3.  This is saved in .config file