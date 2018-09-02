const disBot = require('./disBot.js')
const widgets = require('./widgets')
const Promise = require('bluebird')

console.log('starting up')
/*
async function launchDiscordBot (){
    return discordBot.start()
}*/


function main(){
    //const discordBot = await DiscordBot.start()
    return Promise.all([
        disBot.start(),
        disBot.clearMessages(),
        widgets.init(disBot)
    ]).then((err, res) =>{
        console.log('main finished', err, res)
        return 'OK'
    })
}
process.stdin.resume()

main().then(v => console.log(v))

process.on('SIGINT', () => {
    console.log('signit called')
    TwitchBot.destroy()
    disBot.destroy()
    process.exit(0)
})
