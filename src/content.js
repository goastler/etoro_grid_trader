console.log('content.js')


let getPendingOrderPricesCmd = null;
let getFilledOrderPricesCmd = null;
let getPriceCmd = null;
let closeOrderCmd = null;
let openOrderCmd = null;
let waitCmd = null;
let navCmd = null;
let orderAmount = null;
let priceStep = null;
let takeProfit = null;
let roundDp = null;
const cmds = {};

const sleep = (ms, msg) => {
  console.log('waiting ' + ms + 'ms for ' + msg);
  return new Promise(r => setTimeout(r, ms));
};

const randSleep = (min, max, msg) => {
  const origMin = min;
  const origMax = max;
  min = Math.min(origMax, origMin);
  max = Math.max(origMax, origMin);
  const diff = max - min + 1;
  const time = Math.round(Math.random() * diff) + min;
  return sleep(time, msg);
}

const getPendingOrderPrices = async data => {
  const buys = [];
  const fields = getPendingOrderPriceFields();
  for(let i = 0; i < fields.length; i++) {
    const buy = parseFloat($(fields[i]).text());
    buys.push(buy);
  }
  return {prices: buys};
}

const getFilledOrderPrices = async data => {
  const buys = [];
  const fields = getFilledOrderPriceFields();
  for(let i = 0; i < fields.length; i++) {
    let buy = parseFloat($(fields[i]).text()) - priceStep; // -priceStep as we're looking at the take profit
    buy = roundDp(buy, 2);
    buys.push(buy);
  }
  return {prices: buys};
}

const getPrice = async data => {
  const field = getPriceField();
  const txt = $(field).text();
  const trimmed = txt.trim();
  const price = parseFloat(trimmed);
  return {price};
}

const blurInput = index => {
  document.dispatchEvent(new CustomEvent('ET_blur_input', {detail: index}));
}

const openOrder = async data => {
  console.log('opening order at ' + data.price);
  // if(!isMarketOpen()) {
  //   console.log('market closed');
  //   await sleep(30000, 'market closed');
  //   return {};
  // }
  const button = getTradeButton();
  button.click();
  await randSleep(1000, 2000, 'modal popup')
  getOrderTypeMenuButton().click();
  await randSleep(500, 1000, 'show order type dropdown');
  getOrderTypeButton().click();
  await randSleep(500, 1000, 'switch to order type');
  // getTradeRateButton().click();
  // await randSleep(1000, 3000, 'switch to trade rate')
  getTakeProfitButton().click();
  await randSleep(500, 1000, 'enable take profit')
  // getTakeProfitRateButton().click();
  // await randSleep(1000, 3000, 'switch to take profit rate');
  const inputs = getTradeInputFields();
  $(inputs[0]).val(data.price);
  blurInput(0);
  await randSleep(500, 1000, 'input rate')
  $(inputs[1]).val(orderAmount);
  blurInput(1);
  await randSleep(500, 1000, 'input buy')
  $(inputs[2]).val(data.price + takeProfit);
  blurInput(2);
  await randSleep(500, 1000, 'input sell')
  const setOrderButton = getSetOrderButton();
  setOrderButton.click();
  await sleep(1000, 'order settlement')
  return data;
}

const closeOrder = async data => {
  console.log('closing order at: ' + data.price);
  const fields = getPendingOrderPriceFields();
  const closeButtons = getCloseOrderButtons();
  for(let i = 0; i < fields.length; i++) {
    const buyPrice = parseFloat($(fields[i]).text());
    const closeButton = closeButtons[i];
    if(buyPrice == data.price) {
      closeButton.click();
      await randSleep(1000, 2000, 'popup');
      $('#uidialog1 > div.uidialog-content > et-close-order > div > div.close-order-footer > button').click();
      await sleep(1000, 'order close');
      break;
    }
  }
  return data;
}

const wait = async data => {
  await sleep(data.time, 'wait cmd');
  return data;
}

const nav = async data => {
  console.log('navigating to: ' + data.url)
  window.location.href = data.url;
  await sleep(60000000, 'waiting for nav to: ' + data.url);
  // script will get killed here
}

const main = async () => {
  console.log('page ready, starting script');
  // // const url = 'https://www.etoro.com/markets/gme';
  // // const url = 'https://www.etoro.com/portfolio/gme';
  // const url = 'https://www.etoro.com/portfolio/orders';
  // if(window.location.href != url) {
  //   window.location.href = url;
  //   // kills script here
  // }
  //
  // await sleep(5000, 'page load');
  // // console.log(await getPrice())
  // // placeOrder({price: 100});
  // // closeOrder({index: 0})
  // console.log(await closeOrder({price: 134}));
  // // console.log(await getFilledOrderPrices());
  // // console.log(await getPendingOrderPrices());

  let run = true;
  let cmd = null;
  let data = null;
  while(run) {
    const res = await chrome.runtime.sendMessage({cmd, data});
    cmd = res.cmd;
    if(cmd == null) {
      // no cmd issued, so stop
      run = false;
    } else {
      try {
        const cmdFunc = cmds[cmd];
        data = await cmdFunc(res.data);
      } catch(err) {
        console.log(err);
        await sleep(1000, 'error');
        location.reload();
        // script killed here
      }
    }
  }
  console.log('script done');
}

const isMarketOpen = () => {
  const txt = $($('[automation-id="market-open-close-indication"] a')[0]).text();
  const txtLower = txt.toLowerCase();
  if(txtLower.indexOf('market open') >= 0) {
    return true;
  } else {
    return false;
  }
}

const getPriceField = () => {
  return $('[automation-id="market-head-stats-value"]')[0];
}

const isNoOrders = () => {
  return $('body > ui-layout > div > et-layout-main > div > div.container-level2.layout-sidenav-collapsed.layout-sidenav-closed > div.container-level3 > div.page-content > div > ng-view > div > div.portfolio-page-type1-content-body > div > div > p').length > 0;
}

const getOrderTypeMenuButton = () => {
  return $('[data-etoro-automation-id="execution-trade-mode-drop-box"]')[0];
}

const getOrderTypeButton = () => {
  return $('[data-etoro-automation-id="execution-trade-mode-switch-to-order"]')[0];
}

const getTakeProfitRateButton = () => {
  return $('[data-etoro-automation-id="execution-take-profit-amount-editing-switch-to-rate-button"]')[0];
}

const getSetOrderButton = () => {
  return $('[data-etoro-automation-id="execution-open-order-button"]')[0];
}

const getTakeProfitButton = () => {
  return $('[data-etoro-automation-id="execution-take-profit-tab-title-label"]')[0]
}

const getTradeInputFields = () => {
  return $('[data-etoro-automation-id="input"]')
}

const getTradeRateButton = () => {
  return $('[data-etoro-automation-id="execution-button-switch-order-rate"]')[0]
}

const getTradeButton = () => {
  return getTradeButtonArray()[0];
}

const getTradeButtonArray = () => {
  return $('[automation-id="trade-button"]')
}

const getCloseOrderButtons = () => {
  return $('[data-etoro-automation-id="orders-table-body-close-order-action"]')
}

const getPendingOrderPriceFields = () => {
  return $('[data-etoro-automation-id="orders-table-body-cell-rate-order"]');
}

const getFilledOrderPriceFields = () => {
  return $('[data-etoro-automation-id="open-trades-table-body-cell-take-profit-rate"]');
}

const preMain = async () => {
  // https://stackoverflow.com/questions/66406672/chrome-extension-mv3-modularize-service-worker-js-file
  const configSrc = chrome.runtime.getURL("config.js");
  const config = await import(configSrc);
  ({
    getPendingOrderPricesCmd,
    getFilledOrderPricesCmd,
    getPriceCmd,
    closeOrderCmd,
    openOrderCmd,
    waitCmd,
    navCmd,
    orderAmount,
    priceStep,
    takeProfit,
    roundDp,
  } = config);
  cmds[getPendingOrderPricesCmd] = getPendingOrderPrices;
  cmds[getFilledOrderPricesCmd] = getFilledOrderPrices;
  cmds[getPriceCmd] = getPrice;
  cmds[closeOrderCmd] = closeOrder;
  cmds[openOrderCmd] = openOrder;
  cmds[waitCmd] = wait;
  cmds[navCmd] = nav;
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('inject.js');
  (document.head||document.documentElement).appendChild(s);
  main();
}

$(window).on( "load", preMain);
