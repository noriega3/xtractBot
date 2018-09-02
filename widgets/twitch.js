const fs = require("fs")
const TwitchWebhook = require("twitch-webhook")
const TwitchHelix = require("twitch-helix")
const config = require('./config.json')
const _ = require('lodash')
const _get = require('lodash/get')
const Promise = require('bluebird')
const getTrackedStreams = require('./utils/getTrackedStreams')
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

getStreamInfoByIds = async (users) => {
    if (!users || _.isEmpty(users)) {
        return []
    }
    let userIds = _.map(users, ({user_id}) => user_id)
    const queryPromises = []
    for (const userIdsChunk of _.chunk(userIds, 100)) { // /users endpoint has a cap of 100, so we split the query into chunks
        queryPromises.push(twitchApi.sendHelixRequest("streams", {
            requestOptions: {
                qs: {
                    user_id: userIdsChunk
                }
            }
        }))
    }
    return await Promise.all(queryPromises).then((statuses) => {
        let online = _.flatten(statuses[0])
        let offline = _.differenceBy(users, online, 'user_id');
        return online.concat(offline)
    })
}

getTrackedStreamsIds = async usernames => {
    if (!usernames || _.isEmpty(usernames)) {
        return []
    }
    const queryPromises = []
    for (const usernamesChunk of _.chunk(usernames, 100)) { // /users endpoint has a cap of 100, so we split the query into chunks
        queryPromises.push(twitchApi.sendHelixRequest("users", {
            requestOptions: {
                qs: {
                    login: usernamesChunk
                }
            }
        }))
    }
    return await Promise.all(queryPromises).then(([ids]) => {
        console.log('promise all done', _.flatten(ids))
        return _.flatten(ids)
    })
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

    start: async (discordBot) => {
        let streams = await getTrackedStreams()
        let statuses = await getStreamInfoByIds(streams)

        await discordBot.setStreamMessage(statuses)

        await _.each(streams, (info) => {
            const user_id = _get(info, 'user_id')
            return twitchWebhook.subscribe('streams', {id: user_id})
                .catch((err) => {
                    throw new Error('unexpected error in #subscribe: ' + err.message)
                }).then(() => {
                    console.log('subbed to ', user_id)
                })
        })
        return 'OK'
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
