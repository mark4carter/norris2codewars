# norris2codewars

norris2codewars allows you to play codewars from Slack and compete to see how can solve the code first!

Credits:

- <https://scotch.io/tutorials/building-a-slack-bot-with-node-js-and-chuck-norris-super-powers>
- <https://www.npmjs.com/package/codewars-client>


### Install with `npm install`

### What you need to run

  1.  Slack API Key
  2.  Codewars API Key
  3.  Any amount of skill

### Starting the bot server

On Linux and Mac OSX
Run with `BOT_API_KEY=your_api_key node bin/bot.js`

On Windows
Run with `set BOT_API_KEY=your_api_key & node bin/bot.js`

### Obtaining a Slack API Key

1. Go to :: <https://yourorganization.slack.com/services/new/bot>
2. After successfully adding, copy the API Token

Details: <https://scotch.io/tutorials/building-a-slack-bot-with-node-js-and-chuck-norris-super-powers#toc-create-a-new-bot-on-your-slack-organization>

### Setting up CodeWars API Token

1.  Get your Codewars API Token: <https://www.codewars.com/users/edit>
2.  When running in slack type `codewars setup --token your_token` to setup
3.  This is saved in .config file

## Norris2codewars Slack Flow

1.  Within Slack type: `codewars train`
2.  If you like what you see type: `codewars yes` 
    -   Otherwise type `codewars train` for differnt kata
3.  Use `codewars print` to show instructions again
4.  Submit a snippet with the title `codewars verify` to verify a submission
5.  Use `codewars submit` to submit a successful solution

### Verify an answer (in-depth)

![Alt text](/relative/path/to/img.jpg?raw=true "Optional Title")


## Commands


| Command          | T
| ---------------- | -------------
| `codewars setup` | Content column 2
| `codewars train` | Content cell 2
| `codewars print` | Content column 2
| `codewars verify` | Content column 2
| `codewars submit` | Content column 2
| `codewars help` | Content column 2



