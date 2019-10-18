const axios = require('axios')
const buildUrl = require('build-url')
const sha256 = require('sha256')
const querystring = require('querystring')
const W3CWebSocket = require('websocket').w3cwebsocket

const utils = require('./utils').constructor
const { sockets } = require('./constants')

/**
 * @class Btcexa
 */
class Btcexa {
  /**
   *
   * @type {string}
   */
  api_url = 'https://api.btcexa.com/api'
  ws_market = 'wss://ws.btcexa.com/api/market/ws'
  ws_trade = 'wss://ws.btcexa.com/api/trade/ws'

  /**
   * @type {string}
   */
  api_key

  /**
   * @type {string}
   */
  api_secret

  /**
   * Constructor
   * @param data {api_key, api_secret}
   */
  constructor (data) {
    this.api_key = data['api_key']
    this.api_secret = data['api_secret']
  }

  /**
   *
   * @param method - POST, GET
   * @param queryPath protocol://source/path
   * @param queryParams ?param=q
   * @param bodyParams ?param=b
   * @return {Array}
   */
  #buildSignature = (method, queryPath, queryParams, bodyParams) => {
    let _ss = '\n'
    //let fullPath = queryPath;
    let fullParams = Object.assign(queryParams, bodyParams)
    let _params = utils.objSortByAlp(fullParams)
    let fullParamsStr = buildUrl('', { queryParams: _params })
    let dataCombain =
      method.toUpperCase() +
      _ss +
      queryPath +
      _ss +
      fullParamsStr.trim().substring(1) +
      _ss +
      this.api_secret

    console.log(dataCombain)

    return sha256(dataCombain)
  }

  /**
   *
   * @param queryPath
   * @param httpMethod
   * @param queryParams
   * @param bodyParams
   * @return {Promise<*>}
   */
  async apiCall (queryPath, httpMethod, queryParams, bodyParams) {
    let uri = buildUrl(this.api_url, {
      path: queryPath,
    })
    httpMethod = httpMethod.toUpperCase()
    let signature = this.#buildSignature(
      httpMethod,
      uri,
      queryParams,
      bodyParams,
    )
    let result = new Promise((resolve, reject) => {
      const postData = querystring.stringify(bodyParams)
      axios({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          Apikey: this.api_key,
          Signature: signature,
        },
        port: 443,
        method: httpMethod,
        url: uri,
        params: queryParams,
        data: postData,
        //responseType: 'json'
      })
        .then(data => {
          resolve(data)
        })
        .catch(e => {
          console.log(e.message)
          reject(e.message)
        })
    })

    result = await result

    return result.data
  }

  /**
   *
   * @return {Promise<*>}
   */
  async balanceList () {
    return await this.apiCall(
      'assets/balance_list',
      'get',
      {
        timestamp: utils.timestamp(),
      },
      {},
    )
  }

  /**
   *
   * @param pair
   * @return {Promise<*>}
   */
  async ticker (pair) {
    return await this.apiCall(
      'market/ticker',
      'get',
      {
        trading_pair: pair,
      },
      {},
    )
  }

  /**
   *
   * @returns {Promise<*>}
   */
  marketFee = () => this.apiCall('market/fee', 'get', {}, {})

  /**
   *
   * @param {string} trading_pair
   * @param {string} period
   * @param {number} limit
   * @returns {Promise<*>}
   */
  marketKline = (trading_pair, period, limit = 1440) =>
    this.apiCall('market/kline', 'get', { trading_pair, period, limit }, {})

  /**
   *
   * @param {string} trading_pair
   * @returns {Promise<*>}
   */
  marketTicker = trading_pair => this.apiCall('market/ticker', 'get', { trading_pair }, {})

  /**
   *
   * @param {string} trading_pair
   * @param {number} limit
   * @returns {Promise<*>}
   */
  marketTrade = (trading_pair, limit = 20) => this.apiCall('market/trade', 'get', { trading_pair, limit }, {})

  /**
   *
   * @returns {Promise<*>}
   */
  marketTradingPairs = () => this.apiCall('market/trading_pairs', 'get', {}, {})

  /**
   *
   * @return {Promise<*>}
   */
  async marketDepth () {
    return await this.apiCall(
      'market/depth',
      'get',
      {
        timestamp: utils.timestamp(),
      },
      {},
    )
  }

  /**
   * Create orders for the purchase and sale.
   *
   * @param data - {type, pair, amount, rate, order_type}
   */
  async orderCreate (data) {
    if (typeof data['amount'] === 'undefined')
      throw new Error('required field amount not found.')
    if (typeof data['order_type'] === 'undefined')
      throw new Error('required field order_type not found.')
    if (typeof data['type'] === 'undefined')
      throw new Error('required field type not found.')
    if (typeof data['pair'] === 'undefined')
      throw new Error('required field pair not found.')

    if (
      data.order_type.toUpperCase() !== 'LIMIT' ||
      data.order_type.toUpperCase() !== 'MARKET'
    )
      throw new Error('Order type must be "LIMIT" or "MARKET" value.')
    if (data.type.toUpperCase() !== 'BUY' || data.type.toUpperCase() !== 'SELL')
      throw new Error('Order type must be "BUY" or "SELL" value.')

    return await this.apiCall(
      'trade/create_order',
      'post',
      {
        timestamp: utils.timestamp().toString(),
      },
      {
        quantity: data.amount,
        order_type: data.order_type, //  string Required "LIMIT", "MARKET"
        side: data.type, // "BUY", "SELL"
        trading_pair: data.pair,
        price: data.rate,
      },
    )
  }

  /**
   *
   * @param {string} url
   * @param {function} onMessage
   * @param {function} onOpen
   * @param callbacks - {onerror, onopen, onclose}
   * @returns {W3CWebSocket}
   */
  connectSocket (url, onMessage, onOpen, callbacks = {}) {
    const client = new W3CWebSocket(url)

    client.onerror = utils.callableFn(
      callbacks.onerror,
      error => console.log(`Socket connection error: ${error.toString()}`)
    )
    client.onopen = utils.callableFn(
      onOpen,
      () => console.log(`Socket successfully connected to: ${url}`)
    )

    client.onclose = utils.callableFn(
      callbacks.onclose,
      () => console.log(`Socket successfully closed for: ${url}`)
    )
    client.onmessage = onMessage

    return client
  }

  /**
   *
   * @param {W3CWebSocket} client
   * @param {*} data
   */
  static sendDataToSocket = (client, data) => {
    if (client.readyState !== client.OPEN) {
      console.log(`Can't send message, because client readyState is: ${client.readyState}`)

      return
    }

    client.send(data)
  }

  /**
   *
   * @param {string} data
   * @returns {*}
   */
  static dataFromSocket = ({ data }) => utils.fromJson(data)

  /**
   *
   * @param {string} req
   * @param {*} args
   * @returns {string}
   */
  static argumentsToWsRequest = (req, args) => `${req}|${utils.toJson(args)}`

  // WS MARKET
  wsMarketTicker (handler) {
    const client = this.connectSocket(
      this.ws_market,
      response => handler(Btcexa.dataFromSocket(response)),
      () => Btcexa.sendDataToSocket(client, sockets.market.allTicker),
    )
  }

  wsMarketKline (handler, wallet_type, period = '1m', limit = 10) {
    const client = this.connectSocket(
      this.ws_market,
      response => handler(Btcexa.dataFromSocket(response)),
      () => Btcexa.sendDataToSocket(
        client,
        Btcexa.argumentsToWsRequest(sockets.market.kline(wallet_type), { period, limit })
      )
    )
  }

  wsMarketDepth (handler, wallet_type, limit = 10) {
    const client = this.connectSocket(
      this.ws_market,
      response => handler(Btcexa.dataFromSocket(response)),
      () => Btcexa.sendDataToSocket(
        client,
        Btcexa.argumentsToWsRequest(sockets.market.depth(wallet_type), { limit })
      )
    )
  }

  wsTrade (handler, wallet_type, limit = 10) {
    const client = this.connectSocket(
      this.ws_market,
      response => handler(Btcexa.dataFromSocket(response)),
      () => Btcexa.sendDataToSocket(
        client,
        Btcexa.argumentsToWsRequest(sockets.market.trade(wallet_type), { limit })
      )
    )
  }

  /**
   *
   * @param {string} trading_pair
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  tradeActiveOrderList = (trading_pair, timestamp = utils.timestamp()) =>
    this.apiCall('trade/active_order_list', 'get', { trading_pair, timestamp }, {})

  cancelOrder = (trading_pair, ids, timestamp = utils.timestamp()) =>
    this.apiCall('trade/cancel_order', 'get', { timestamp }, { trading_pair, ids })

  /**
   *
   * @param {object} data - {sort: string, start_time: number, end_time: number, page: number, limit: number, trading_pair: string, base: string, quote: string, side: string}
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  tradeDealList = (data, timestamp = utils.timestamp()) => {
    const validSortMethods = ['ASC', 'DESC']
    data.sort = data.sort.toLocaleUpperCase()
    if (!validSortMethods.includes(data.sort)) {
      delete data.sort
    }

    const sideValidValues = ['A', 'B']
    data.side = data.side.toLocaleUpperCase()
    if (!sideValidValues.includes(data.side)) {
      delete data.side
    }

    return this.apiCall('trade/deal_list', 'get', { timestamp, ...data }, {})
  }

  /**
   *
   * @param {number} order_id
   * @param {string} trading_pair
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  tradeOrderDeal = (order_id, trading_pair, timestamp = utils.timestamp()) =>
    this.apiCall('trader/order_deal', 'get', { timestamp, order_id, trading_pair }, {})

  /**
   *
   * @param {object} data - {sort: string, start_time: number, end_time: number, page: number, limit: number, trading_pair: string,
   *                         base: string, quote: string, status: string, type: string, side: string, hide_empty_orders: boolean\
   *                        }
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  tradeOrderList = (data, timestamp = utils.timestamp()) => {
    const validSortMethods = ['ASC', 'DESC']
    data.sort = data.sort.toLocaleUpperCase()
    if (!validSortMethods.includes(data.sort)) {
      delete data.sort
    }

    const validStatusValues = ['CANCELED', 'NEW', 'PARTFILLED', 'REMOVED', 'REVISE', 'TRADE']
    data.status = data.status.toLocaleUpperCase()
    if (!validStatusValues.includes(data.status)) {
      delete data.status
    }

    const validTypeValues = ['Lt', 'Mt']
    data.type = data.type[0].toLocaleUpperCase() + data.type[1].toLocaleLowerCase()
    if (!validTypeValues.includes(data.type)) {
      delete data.type
    }

    const sideValidValues = ['A', 'B']
    data.side = data.side.toLocaleUpperCase()
    if (!sideValidValues.includes(data.side)) {
      delete data.side
    }

    return this.apiCall('trade/order_list', 'get', { timestamp, ...data }, {})
  }

  /**
   *
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsBalanceList = (timestamp = utils.timestamp()) =>
    this.apiCall('assets/balance_list', 'get', { timestamp }, {})

  /**
   *
   * @param {string} id
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsCancelWithdrawalById = (id, timestamp = utils.timestamp()) =>
    this.apiCall(`assets/cancel_withdrawal/${id}`, 'get', { timestamp }, {})

  /**
   *
   * @param {object} data - {symbol: string, address: string, amount: string|number, remark: string|int}
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsCreateWithdrawal = (data, timestamp = utils.timestamp()) =>
    this.apiCall('assets/create_withdrawal', 'post', { timestamp }, data)

  /**
   *
   * @param {object} data - {symbol: string, address: string, name: string}
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsCreateWithdrawalAddress = (data, timestamp = utils.timestamp()) =>
    this.apiCall('assets/create_withdrawal_address', 'post', { timestamp }, data)

  /**
   *
   * @param {string} id
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsDeleteWithdrawalAddress = (id, timestamp = utils.timestamp()) =>
    this.apiCall(`assets/delete_withdrawal_address/${id}`, 'get', { timestamp }, {})

  /**
   *
   * @param {string} symbol
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsDepositAddressBySymbol = (symbol, timestamp = utils.timestamp()) =>
    this.apiCall(`assets/deposit_address/${symbol}`, 'get', { timestamp }, {})

  /**
   *
   * @param {object} data - {address: string, wallet_order_id: string, page: string, limit: int}
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsDepositList = (data, timestamp = utils.timestamp()) =>
    this.apiCall('assets/deposit_list', 'get', { timestamp, ...data }, {})

  /**
   *
   * @param {string} symbol
   * @param {object} data - {page: number, limit: number}
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assertsDepositListBySymbool = (symbol, data, timestamp = utils.timestamp()) =>
    this.apiCall(`assets/deposit_list/${symbol}`, 'get', { ...data, timestamp }, {})

  /**
   *
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsFrozenWithdrawal = (timestamp = utils.timestamp()) =>
    this.apiCall('assets/freeze_list', 'get', { timestamp }, {})

  /**
   *
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsWithdrawalAddressList = (timestamp = utils.timestamp()) =>
    this.apiCall('assets/withdrawal_address_list', 'get', { timestamp }, {})

  /**
   *
   * @param {string} symbol
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsWithdrawalAddressListBySymbol = (symbol, timestamp = utils.timestamp()) =>
    this.apiCall(`assets/withdrawal_address_list/${symbol}`, 'get', { timestamp }, {})

  /**
   *
   * @param {object} data - {address: string, wallet_order_id: string, page: number, limit: number}
   * @param {number} timestamp
   * @returns {Promise<*>}
   */
  assetsWithdrawalList = (data, timestamp = utils.timestamp()) =>
    this.apiCall('assets/withdrawal_list', 'get', { timestamp, ...data }, {})

  /**
   * @link https://www.btcexa.com/documents/index_en-US.html#operation/wsActiveOrder
   *
   * @param handler
   * @param wallet_type
   * @param status
   * @param timestamp
   */
  wsActiveOrder (handler, wallet_type, status, timestamp = utils.timestamp()) {
    const client = this.connectSocket(
      this.ws_trade,
      response => handler(Btcexa.dataFromSocket(response)),
      () => {
        Btcexa.sendDataToSocket(client, utils.toJson({
            apikey: this.api_key,
            signature: sha256(`GET\n${this.ws_trade}\n${timestamp}\n${this.api_secret}`),
            timestamp: timestamp
          })
        )

        Btcexa.sendDataToSocket(
          client,
          Btcexa.argumentsToWsRequest(sockets.trade.order(wallet_type), { status })
        )
      }
    )
  }
}

module.exports = Btcexa
