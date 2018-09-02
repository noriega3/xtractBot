const Promise = require('bluebird')
const fs = require('fs')
Promise.promisifyAll(require("fs"))

module.exports = function(){
    return fs.readFileAsync('./streams.json', 'utf8')
        .then(JSON.parse)
        .catchReturn({})
}
