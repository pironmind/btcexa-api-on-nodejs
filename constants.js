const sockets = {
  market: {
    allTicker: 'sub.market.all.ticker',
    trade: pair => `sub.market.${pair}.trade`,
    depth: pair => `sub.market.${pair}.depth`,
    kline: pair => `sub.market.${pair}.kline`
  },
  trade: {
    order: pair => `sub.trade.${pair}.order`
  }
}

module.exports = { sockets }
