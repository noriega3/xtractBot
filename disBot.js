const DiscordBot = require("discord.js")
const path = require('path')
const fs = require('fs')
const config = require("./config.json");
const _ = require('lodash')

const defaultMessage = {
    "embed":{
        "fields": []
    }
}
// Load up the discord.js library

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new DiscordBot.Client();
const newPodcastPath = 'podcast-test.wav';
let voiceChannel
let textChannel
let _writeStreams = new Map();
let streamMessage
let streamChannel
let hasMessage = false
let lastMessage
// Here we load the config.json file that contains our token and our prefix values.
// config.token contains the bot's token
// config.prefix contains the message prefix.



client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

// make a new stream for each time someone starts to talk
function generateOutputFile(channel, member) {
    // use IDs instead of username cause some people have stupid emojis in their name
    const fileName = `./recordings/${channel.id}-${member.id}-${Date.now()}.pcm`;
    return fs.createWriteStream(fileName);
}

function startPodcast(){

    textChannel.send('podBot testing audio.')

    return voiceChannel.join()
        .then(connection => {
            connection.on('speaking', (user, speaking) => {
                const receiver = connection.createReceiver();
                if(speaking){
                    textChannel.send(`I'm listening to ${user}`);
                    // this creates a 16-bit signed PCM, stereo 48KHz PCM stream.
                    const audioStream = receiver.createPCMStream(user);
                    // create an output stream so we can dump our data in a file
                    const outputStream = generateOutputFile(voiceChannel, user);
                    // pipe our audio data into the file stream
                    audioStream.pipe(outputStream);
                    outputStream.on("data", console.log);
                    // when the stream ends (the user stopped talking) tell the user
                    audioStream.on('end', () => {
                        textChannel.sendMessage(`I'm no longer listening to ${user}`);
                    });
                }
            })
        }).catch(console.log);
}

client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if(message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if(message.content.indexOf(config.discord.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.discord.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Let's go with a few common example commands! Feel free to delete or change those.

    if(command === "testaudio") {
        return startPodcast ()
    }
    if(command === 'podout') {
        message.channel.send('podBot out.')
        console.log('leave')
        voiceChannel.leave()
        return client.destroy()
    }

    if(command === "ping") {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }

    if(command === "say") {
        // makes the bot say something and delete the message. As an example, it's open to anyone to use.
        // To get the "message" itself we join the `args` back into a string with spaces:
        const sayMessage = args.join(" ");
        // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
        message.delete().catch(O_o=>{});
        // And we get the bot to say the thing:
        message.channel.send(sayMessage);
    }

    if(command === "kick") {
        // This command must be limited to mods and admins. In this example we just hardcode the role names.
        // Please read on Array.some() to understand this bit:
        // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
        if(!message.member.roles.some(r=>["Administrator", "Moderator"].includes(r.name)) )
            return message.reply("Sorry, you don't have permissions to use this!");

        // Let's first check if we have a member and if we can kick them!
        // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
        // We can also support getting the member by ID, which would be args[0]
        let member = message.mentions.members.first() || message.guild.members.get(args[0]);
        if(!member)
            return message.reply("Please mention a valid member of this server");
        if(!member.kickable)
            return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

        // slice(1) removes the first part, which here should be the user mention or ID
        // join(' ') takes all the various parts to make it a single string.
        let reason = args.slice(1).join(' ');
        if(!reason) reason = "No reason provided";

        // Now, time for a swift kick in the nuts!
        await member.kick(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
        message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

    }

    if(command === "ban") {
        // Most of this command is identical to kick, except that here we'll only let admins do it.
        // In the real world mods could ban too, but this is just an example, right? ;)
        if(!message.member.roles.some(r=>["Administrator"].includes(r.name)) )
            return message.reply("Sorry, you don't have permissions to use this!");

        let member = message.mentions.members.first();
        if(!member)
            return message.reply("Please mention a valid member of this server");
        if(!member.bannable)
            return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

        let reason = args.slice(1).join(' ');
        if(!reason) reason = "No reason provided";

        await member.ban(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
        message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
    }

    if(command === "purge") {
        // This command removes all messages from all users in the channel, up to 100.

        // get the delete count, as an actual number.
        const deleteCount = parseInt(args[0], 10);

        // Ooooh nice, combined conditions. <3
        if(!deleteCount || deleteCount < 2 || deleteCount > 100)
            return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

        // So we get our messages, and delete them. Simple enough, right?
        const fetched = await message.channel.fetchMessages({count: deleteCount});
        message.channel.bulkDelete(fetched)
            .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
    }
});


module.exports = {
    start: () => {
       return client
            .login(config.discord.token)
            .then((token) => {
                // This event will run if the bot starts, and logs in, successfully.
                console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
                // Example of changing the bot's playing game to something useful. `client.user` is what the
                // docs refer to as the "ClientUser".
                client.user.setActivity(`Serving ${client.guilds.size} servers`);
                client.user.sweepMessages();
                voiceChannel = client.channels.get(config.discord.podcast.voiceChannel)
                textChannel = client.channels.get(config.discord.podcast.textChannel)
                streamChannel = client.channels.get(config.discord.streamChannel)
                streamMessage = streamChannel.send('Starting Up')

                console.log('finished with client login and setup')

                return streamMessage
            })
    },
    updateStreams(userData){

    },
    clearMessages: async (channelId="streams-and-deals") => {
        console.log('clering messages')

        const channel = await streamChannel.message
        if (!channel || !channel.fetchMessages) return
        const fetched = await channel.fetchMessages({count: 50})
        return channel.bulkDelete(fetched)
            .tap(console.log)
            .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
    },
    updateStreams: function(users){
        fs.createWriteStream(fileName);

    },

    setStreamMessage: async function(users){
        /*
        "embed":{
        "fields": [
            {
                "name": "🤔",
                "value": "some of these properties have certain limits..."
            },
            {
                "name": "😱",
                "value": "try exceeding some of them!"
            },
            {
                "name": "🙄",
                "value": "an informative error should show up, and this view will remain as-is until all issues are fixed"
            },
            {
                "name": "<:thonkang:219069250692841473>",
                "value": "these last two",
                "inline": true
            },
            {
                "name": "<:thonkang:219069250692841473>",
                "value": "are inline fields",
                "inline": true
            }
        ]
    }
         */
        _.each(config.twitch.trackChannels, (twitchId) => {
            defaultMessage.embed.fields.push({
                "name": `twitch.tv/${twitchId}`,
                "value": "Offline"
            })
        })

        console.log(users)
        let found
        _.each(users, (user, i) => {
            found = _.find(defaultMessage.embed.fields, {'name': `twitch.tv/${config.twitch.trackChannels[i]}`})
            console.log('user value', user)
            found.value = user.type
        })

        console.log('message', defaultMessage)
        console.log(defaultMessage.embed.fields)

        return await streamChannel.send(defaultMessage).then(msg => {
                console.log(`New message content: ${msg}`, msg)
                lastMessage = msg
                return msg
            }).return(users)
            .tapCatch(console.error)
            .catchReturn(users)
        },
    writeStreamMessage: async function(message = defaultMessage){
        hasMessage = true
        if(lastMessage && hasMessage)
            return await lastMessage.edit(message).then(msg => console.log(`edited message content: ${msg}`)).catch(console.error);

        else
            return await streamChannel.send(message).then(msg => {
                console.log(`New message content: ${msg}`, msg)
                lastMessage = msg
                return msg
                })
            .catch(console.error);
    },
    destroy: () =>{
        console.log('signit called disbot')
    }
}
/*
{
  "embeds": [
    {
      "title": "gavinxi title here",
      "description": "Playing something",
      "url": "https://discordapp.com",
      "color": 8311585,
      "timestamp": "2018-05-13T02:36:55.216Z",
      "footer": {
        "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
        "text": "X viewers since "
      },
      "thumbnail": {
        "url": "https://cdn.discordapp.com/embed/avatars/0.png"
      },
      "author": {
        "name": "twitch.tv/alaksdjflksf",
        "url": "https://discordapp.com",
        "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
      },
      "fields": [
        {
          "name": "Playing",
          "value": "something",
          "inline":true
        }
      ]

    },
        {
      "title": "Currently Offline",
      "url": "https://discordapp.com",
      "color": 13632027,
      "footer": {
      },

      "author": {
        "name": "twitch.tv/alaksdjflksf",
        "url": "https://discordapp.com"
      },
      "fields": []
    }
  ]
}
 */
// tell Twitch that we no longer listen
// otherwise it will try to send events to a down app


