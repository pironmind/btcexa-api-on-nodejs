const axios = require('axios');
const buildUrl = require('build-url');
const sha256 = require('sha256');
const querystring = require('querystring');
const utils = require('./utils').constructor;


/**
 * Stex Api Wrapper
 */
class Btcexa {

    /**
     *
     * @type {string}
     */
    #api_url = 'https://api.btcexa.com/api';
    #ws_market = 'wss://ws.btcexa.com/api/market/ws';
    #ws_trade = 'wss://ws.btcexa.com/api/trade/ws';

    /**
     * @type {string}
     */
    #api_key;

    /**
     * @type {string}
     */
    #api_secret;

    /**
     * Constructor
     * @param data {api_key, api_secret}
     */
    constructor(data) {
        this.#api_key = data['api_key'];
        this.#api_secret = data['api_secret'];
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
        let _ss = '\n';
        //let fullPath = queryPath;
        let fullParams = Object.assign(queryParams, bodyParams);
        let _params = utils.objSortByAlp(fullParams);
        let fullParamsStr = buildUrl('', {queryParams: _params});
        let dataCombain = method.toUpperCase() + _ss + queryPath + _ss + fullParamsStr.trim().substring(1) + _ss + this.#api_secret;

        console.log(dataCombain);

        return sha256(dataCombain);
    };

    /**
     *
     * @param queryPath
     * @param httpMethod
     * @param queryParams
     * @param bodyParams
     * @return {Promise<*>}
     */
    async apiCall(queryPath, httpMethod, queryParams, bodyParams) {
        let uri = buildUrl(this.#api_url, {
            path: queryPath
        });
        httpMethod = httpMethod.toUpperCase();
        let signature = this.#buildSignature(httpMethod, uri, queryParams, bodyParams);
        let result = new Promise((resolve, reject) => {

            const postData = querystring.stringify(bodyParams)
            axios({
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'Apikey': this.#api_key,
                    'Signature': signature,
                },
                port: 443,
                method: httpMethod,
                url: uri,
                params: queryParams,
                data: postData,
                //responseType: 'json'
            }).then((data)=> {
                resolve(data)
            }).catch(e=>{
                console.log(e.message)
                reject(e.message)
            })
        });

        result = await result;

        return result.data;
    }

    /**
     *
     * @return {Promise<*>}
     */
    async balanceList() {
        return await this.apiCall(
            'assets/balance_list',
            'get',
            {
                timestamp: utils.timestamp()
            },
            {})
    }


    /**
     *
     * @param pair
     * @return {Promise<*>}
     */
    async ticker(pair) {
        return await this.apiCall(
            'market/ticker',
            'get',
            {
                trading_pair: pair
            },
            {})
    }

    /**
     *
     * @return {Promise<*>}
     */
    async marketDepth() {
        return await this.apiCall(
            'market/depth',
            'get',
            {
                timestamp: utils.timestamp()
            },
            {})
    }


    /**
     * Create orders for the purchase and sale.
     *
     * @param data - {type, pair, amount, rate, order_type}
     */
    async orderCreate(data) {
              if(typeof data['amount'] === 'undefined')
                  throw new Error('required field amount not found.');
              if(typeof data['order_type'] === 'undefined')
                  throw new Error('required field order_type not found.');
              if(typeof data['type'] === 'undefined')
                  throw new Error('required field type not found.');
              if(typeof data['pair'] === 'undefined')
                  throw new Error('required field pair not found.');

              if(data.order_type.toUpperCase() !== "LIMIT" || data.order_type.toUpperCase() !== "MARKET")
                  throw new Error('Order type must be "LIMIT" or "MARKET" value.');
              if(data.type.toUpperCase() !== "BUY" || data.type.toUpperCase() !== "SELL")
                  throw new Error('Order type must be "BUY" or "SELL" value.');

        return await this.apiCall(
            'trade/create_order',
            'post',
            {
                "timestamp": utils.timestamp().toString()
            },
            {
                "quantity": data.amount,
                "order_type": data.order_type,    //  string Required "LIMIT", "MARKET"
                "side": data.type,                // "BUY", "SELL"
                "trading_pair": data.pair,
                "price": data.rate
            })
    }

    // NOT implemented methods

    async KlineData(data) {}
    async aggregatedMarketInformation(data) {}
    async recentlyCompleted(data) {}
    async activeOrderList(data) {}

    async orderCancel(data) {}
    async dealList(data) {}
    async orderList(data) {}
    //async balanceList() {}
    async withdrawalCancel() {}
    async withdrawalCreate() {}
    async withdrawalAddressCreate() {}
    async withdrawalAddressDelete() {}
    async depositList() {}
    async depositListByAsset() {}
    async freezeList() {}
    async withdrawalAddressList() {}
    async withdrawalList() {}
    async withdrawalListByAsset() {}

    async wsKline() {}
    async wsDepth() {}
    async wsTrade() {}
    async wsTicker() {}
    async wsOrders() {}
    async wsAssets() {}

}

module.exports = Btcexa;