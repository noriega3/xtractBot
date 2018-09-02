const ccxt = require('ccxt')

const init = async () => {
    let coinbase    = new ccxt.coinbase()
    let bittrex   = new ccxt.bittrex ({ verbose: true })

    console.log (kraken.id,    await kraken.loadMarkets ())
    console.log (bitfinex.id,  await bitfinex.loadMarkets  ())
    console.log (huobi.id,     await huobi.loadMarkets ())

    console.log (kraken.id,    await kraken.fetchOrderBook (kraken.symbols[0]))
    console.log (bitfinex.id,  await bitfinex.fetchTicker ('BTC/USD'))
    console.log (huobi.id,     await huobi.fetchTrades ('ETH/CNY'))
}


const tickers = async (instance) => {
    // check if the exchange is supported by ccxt
    let exchangeFound = ccxt.exchanges.indexOf (id) > -1
    if (exchangeFound) {

        log ('Instantiating', id.green, 'exchange')

        // instantiate the exchange by id
        let exchange = new ccxt[id] ({ enableRateLimit: true })

        // load all markets from the exchange
        let markets = await exchange.loadMarkets ()

        while (true) {

            const tickers = await exchange.fetchTickers ()

            log ('--------------------------------------------------------')
            log (exchange.id.green, exchange.iso8601 (exchange.milliseconds ()))
            log ('Fetched', Object.values (tickers).length.toString ().green, 'tickers:')
            log (asTable.configure ({ delimiter: ' | '.dim, right: true }) (
                ccxt.sortBy (Object.values (tickers), 'quoteVolume', true)
                    .slice (0,20)
                    .map (ticker => ({
                        symbol: ticker['symbol'],
                        price: ticker['last'].toFixed (8),
                        datetime: ticker['datetime'],
                    }))))
        }

    } else {

        log ('Exchange ' + id.red + ' not found')
        printSupportedExchanges ()
    }
}


module.exports = {
    init,
    tickers
}
