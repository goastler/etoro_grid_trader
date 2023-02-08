// cmds for actions
export const getPendingOrderPricesCmd = "getPendingOrderPrices";
export const getFilledOrderPricesCmd = "getFilledOrderPrices";
export const getPriceCmd = "getPrice";
export const closeOrderCmd = "closeOrder";
export const openOrderCmd = "openOrder";
export const waitCmd = "wait";
export const navCmd = "nav";
// urls for the pages
export const stockUrl = 'https://www.etoro.com/markets/gme';
export const pendingOrdersUrl = 'https://www.etoro.com/portfolio/orders';
export const filledOrdersUrl = 'https://www.etoro.com/portfolio/gme';
// the price band to place orders within, i.e. current price +/- band
export const band = 3;
// etoro seems to charge a fixed price per transaction when taking profit. Seems to be about $0.05.
// etoro does not execute limit orders exactly, it's a best effort, so there may be some slippage in the buy price
export const priceStep = 0.25;
export const takeProfit = 0.25;
// min order $50
export const orderAmount = 200;
// extra band to frequent avoid opening / closing the orders at the edge of the band
export const trailingClose = 2;


export const roundDp = (value, dp) => {
  const mult = Math.pow(10, dp)
  value *= mult;
  value = parseInt(Math.round(value));
  value /= mult;
  return value;
}
