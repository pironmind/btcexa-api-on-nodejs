const sockets = {
  market: {
    allTicker: 'sub.market.all.ticker',
    trade: type => `sub.market.${type}.trade`,
    depth: type => `sub.market.${type}.depth`,
    kline: type => `sub.market.${type}.kline`
  },
  trade: {
    order: type => `sub.trade.${type}.order`
  }
}

module.exports = { sockets }