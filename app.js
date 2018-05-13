const disBot = require('./disBot.js')
const TwitchBot = require('./twitchBot.js')

console.log('starting up')
/*
async function launchDiscordBot (){
    return discordBot.start()
}*/


async function main(){
    //const discordBot = await DiscordBot.start()
    await disBot.start()

    await disBot.clearMessages()

    await TwitchBot.start(disBot)

    return 'OK'
}
process.stdin.resume()

main()
    .then(v => console.log(v))

process.on('SIGINT', () => {
    console.log('signit called')
    TwitchBot.destroy()
    disBot.destroy()
    process.exit(0)
})
