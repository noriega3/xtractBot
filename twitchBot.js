const fs = require("fs")
const TwitchWebhook = require("twitch-webhook")
const TwitchHelix = require("twitch-helix")
const config = require('./config.json')
const _ = require('lodash')
const _get = require('lodash/get')
const Promise = require('bluebird')
Promise.promisifyAll(require("fs"))

let twitchIds,twitchStreams

const twitchApi = new TwitchHelix({
    clientId: config.twitch.api.clientId,
    clientSecret: config.twitch.api.clientSecret
})

twitchApi.on('log-info', (message) => {
    console.log('log-info', message)
})
twitchApi.on('log-warn', (message) => {
    console.log('log-warn', message)
})
twitchApi.on('log-error', (message) => {
    console.log('log-error', message)
})
console.log('streams is ', config.twitch.trackChannels.join(","))

//get ids from regular api



//after initial stream hit, then we have list of ids

let twitchWebhook = new TwitchWebhook({
    client_id: config.twitch.webhook.client_id,
    callback: config.twitch.webhook.callback,
    secret: config.twitch.webhook.secret,
    lease_seconds: 259200,    // default: 864000 (maximum value)
    listen: {
        autoStart: true      // default: true
    }
})

twitchWebhook.on('*', ({ topic, options, endpoint, event }) => {
    console.log('global catchall')
    console.log(topic, options, endpoint, event)
})

twitchWebhook.on('streams', (obj) => {
    console.log('streams', obj)
})

twitchWebhook.on('subscribe', (obj) => {
    console.log('did sub', obj)
})

getStreamInfoByUsernames = async usernames => {
    if (!usernames || _.isEmpty(usernames)) {
        return []
    }
    const queryPromises = []
    for (const usernamesChunk of _.chunk(usernames, 100)) { // /users endpoint has a cap of 100, so we split the query into chunks
        queryPromises.push(twitchApi.sendHelixRequest("streams", {
            requestOptions: {
                qs: {
                    user_login: usernamesChunk
                }
            }
        }))
    }
    const twitchUsers = await Promise.all(queryPromises)
    return _.flatten(twitchUsers)
}


// renew the subscription when it expires
twitchWebhook.on('unsubscribe', (obj) => {
    console.log('had unsub', obj)
    twitchWebhook.subscribe(obj['hub.topic'])
})

// renew the subscription when it expires
twitchWebhook.on('error', (err) => {
    console.log('error', err)
})

module.exports = {
    start: (discordBot) => {
        console.log('starting')

        return this.getTrackedStreams()
            .then(discordBot.setStreamMessage)
            .map((user) => {
                const user_id = _get(user, 'user_id')
                console.log('got user', user)
                return twitchWebhook.subscribe('streams', {id})

                    .catch((err) => {
                        throw new Error('unexpected error in #subscribe: ' + err.message)
                    }).then(() => {
                    console.log('subbed to ', user_id)
                })
            })
            .then(getStreamInfoByUsernames)
            .then((users) => {
                //now discord
                return discordBot.setStreamMessage(users)
            })
    },
    getTrackedStreams: () => {
        return fs.readFileAsync('twitchStreams.json', 'utf8')
            .then(() => {
                twitchStreams = JSON.parse(data); //now it an object
            })
            .catchReturn({})
    },
    updateTrackedStreams:(twitchStreams = {}) => {
        return Promise.mapSeries(twitchApi.getTwitchUsersByName(config.twitch.trackChannels))
            .then((updatedTwitchStreams) => {
                twitchStreams = updatedTwitchStreams
                return fs.writeFileAsync('twitchStreams.json', JSON.stringify(updatedTwitchStreams), 'utf8', callback);
            })

    },
    destroy: () =>{
        console.log('signit called twitchbot')

        twitchWebhook.unsubscribe('*')
    }
}
