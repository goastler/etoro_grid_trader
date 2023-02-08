
console.log('background.js')

import {
  getPendingOrderPricesCmd,
  getFilledOrderPricesCmd,
  getPriceCmd,
  closeOrderCmd,
  openOrderCmd,
  waitCmd,
  navCmd,
  band,
  priceStep,
  pendingOrdersUrl,
  filledOrdersUrl,
  stockUrl,
  trailingClose,
  roundDp,
} from './config.js';

let windowId = null;
// index of orders to close
let closeOrderPrices = [];
// prices at which to open new orders
let openOrderPrices = [];
// the current price of the stock
let currentPrice = null;
let floorPrice = null;
// the next nav
let nextUrl = stockUrl;
let currUrl = nextUrl;
let navigating = false;
// the next cmd
let nextCmd = getPriceCmd;
let currCmd = nextCmd;
// the next cmd's data
let currData = {};
let nextData = {};
// the next amount of time to wait before nextCmd
const defWait = 5000;
let currWait = defWait;
let nextWait = defWait;
// the pending set of orders
let pendingOrderPrices = [];
// the filled set of orders
let filledOrderPrices = [];

const setNextUrl = url => {
  nextUrl = url;
  nextWait = defWait;
}

// the loop:
// get the current price
// get the pending order prices
// get the filled order prices
// if any pending orders outside of band, then cancel one by one
// if price has moved to need new order, place one by one
// repeat every 10secs at most frequent (i.e. wait if <10secs))

const handleOrders = () => {
  // close any orders
  if(closeOrderPrices.length > 0) {
    const price = closeOrderPrices.shift();
    nextCmd = closeOrderCmd;
    nextData = {price};
    setNextUrl(pendingOrdersUrl);
  } else if(openOrderPrices.length > 0) {
    // else place any orders
    const price = openOrderPrices.shift();
    nextCmd = openOrderCmd;
    nextData = {price};
    setNextUrl(stockUrl);
  } else {
    // else sleep for a bit
    nextCmd = getPriceCmd;
    nextData = {};
    setNextUrl(stockUrl);
  }
}

// called after placing an order
const openOrder = data => {
  if(!data.hasOwnProperty('price')) {
    console.log('no order opened');
  } else {
    console.log('order opended at: ' + data.price);
  }
  handleOrders();
}

// called after closing an order
const closeOrder = data => {
  if(!data.hasOwnProperty('price')) {
    console.log('no order closed');
  } else {
    console.log('order closed at: ' + data.price);
  }
  handleOrders();
}

// called after fetching the price
const getPrice = data => {
  if(!data.hasOwnProperty('price') || data.price == null || data.price <= 0) {
    console.log('no price captured');
    setNextUrl(stockUrl);
    nextCmd = getPriceCmd;
    nextData = {};
  } else {
    currentPrice = data.price;
    currentPrice = roundDp(currentPrice, 2);
    const rem = currentPrice % priceStep;
    floorPrice = currentPrice - rem;
    floorPrice = roundDp(floorPrice, 2);
    console.log({currentPrice});
    console.log({floorPrice});
    // next get pending order prices
    nextCmd = getPendingOrderPricesCmd;
    nextData = {};
    setNextUrl(pendingOrdersUrl);
  }
}

// called after waiting
const wait = data => {
  // do nothing
  console.log('waited');
  nextWait = -1;
}

const getPendingOrderPrices = data => {
  if(!data.hasOwnProperty('prices')) {
    console.log('no pending order prices captured');
    setNextUrl(pendingOrdersUrl);
    nextCmd = getPendingOrderPricesCmd;
    nextData = {};
  } else {
    console.log('received pending order prices: ' + data.prices);
    pendingOrderPrices = data.prices;
    // next get filled order prices
    nextCmd = getFilledOrderPricesCmd;
    nextData = {};
    setNextUrl(filledOrdersUrl);
  }
}

const getFilledOrderPrices = data => {
  if(!data.hasOwnProperty('prices')) {
    console.log('no filled order prices captured');
    setNextUrl(filledOrdersUrl);
    nextCmd = getFilledOrderPricesCmd;
    nextData = {};
  } else {
    console.log('received filled order prices: ' + data.prices);
    closeOrderPrices = [];
    openOrderPrices = [];
    filledOrderPrices = data.prices;
    // calculate which orders are missing / invalid given filled, pending and current price
    const prices = new Set();
    filledOrderPrices.forEach((price, i) => {
      prices.add(price);
    });
    pendingOrderPrices.forEach((price, i) => {
      prices.add(price);
      if(price > floorPrice + band + trailingClose || price < floorPrice - band - trailingClose) {
        // price outside of band, close the order
        closeOrderPrices.push(price);
      }
    });
    // for each price point
    let i = 0;
    let price = floorPrice - band + i * priceStep;
    price = roundDp(price, 2);
    while(price <= floorPrice + band) {
      // check whether it has been accounted for with either a filled or pending order
      if(prices.has(price)) {
        // accounted for, do nothing
      } else {
        // need to make a new order at this price
        openOrderPrices.push(price);
      }
      prices.delete(price)
      i++;
      price = floorPrice - band + i * priceStep;
      price = roundDp(price, 2);
    }
    prices.forEach((price, i) => {
      const j = pendingOrderPrices.indexOf(price);
      if(j >= 0) {
        closeOrderPrices.push(price);
      }
    });

    console.log('close orders at: ' + closeOrderPrices)
    console.log('open orders at: ' + openOrderPrices)
    handleOrders();
  }
}

const nav = data => {
  console.log('navigated to ' + data.url);
}

const cmds = {};
cmds[getPendingOrderPricesCmd] = getPendingOrderPrices;
cmds[getFilledOrderPricesCmd] = getFilledOrderPrices;
cmds[getPriceCmd] = getPrice;
cmds[closeOrderCmd] = closeOrder;
cmds[openOrderCmd] = openOrder;
cmds[waitCmd] = wait;
cmds[navCmd] = nav;

const handleMessage = async (request, sender, sendResponse) => {
  // empty response means don't run the content script
  if(sender.tab.windowId === windowId) {
    // in correct window
    // run the cmd, this should populate the nextCmd / nextData
    if(request.cmd != null) {
      const cmdFunc = cmds[request.cmd];
      cmdFunc(request.data || {});
    } else {
      console.log('no result received, script starting from scratch')
    }
    console.log('%c **** next cmd ****', 'font-weight: bold;')
    const res = {};
    const dt = new Date();
    if(dt.getHours() >= 14 && dt.getHours() <= 22) {
      if(sender.url == nextUrl && navigating) {
        currUrl = nextUrl;
        nextUrl = null;
        navigating = false;
      }
      if(nextUrl != null) {
        // need to nav to new page
        res.cmd = navCmd;
        res.data = {url: nextUrl};
        navigating = true;
      } else if(nextWait > 0) {
        res.cmd = waitCmd;
        res.data = {time: nextWait};
      } else {
        res.cmd = nextCmd;
        res.data = nextData;
      }
    } else {
      console.log('outside of trading hrs')
      res.cmd = waitCmd;
      res.data = {time: 60000};
    }
    console.log(res.cmd);
    console.log(res.data);
    sendResponse(res);
  } else {
    // empty response stops content script
    sendResponse({});
  }
}

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse)
    return true;
  }
);

chrome.action.setIcon({path: "/on-38.png"});

chrome.action.onClicked.addListener((tab) => {

  chrome.storage.sync.get('windowId', data => {
    // get the win id from storage
    chrome.windows.getAll(windows => {
      // try to find the window with correct id
      const window = windows.find(window => {
        return window.id == data.windowId;
      });
      if(window != null) {
        // found window, switch to it
        console.log('window already active, switching to it');
        chrome.windows.update(data.windowId, {'focused': true});
      } else {
        // cannot find window, make a new one
        console.log('no window found')
        console.log('starting new window')
        chrome.windows.create({'focused': true, 'type': 'popup', 'height': 800, 'width': 1200, 'url': 'https://etoro.com'}).then(window => {
          data.windowId = window.id;
          // update window id in storage
          chrome.storage.sync.set(data, () => {
            console.log('saved window id');
            console.log(data);
            chrome.windows.update(data.windowId, {'focused': true});
            windowId = window.id;
          });
        });
      }
    });
  });
});
