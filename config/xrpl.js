/**
 * ###### NOTICE ######
 * This file has been modified from its original version to meet the requirements for a token distribution on the XRPL
 * original version: https://github.com/ripple/xrp-batch-payout
 */

// wss rippled node endpoints hosted by RippleX
const WSSEndpoints = {
  Main: 'wss://xrplcluster.com',
  Test: 'wss://s.altnet.rippletest.net:51233'
};

// xrpl network
const XRPL_NETWORK = process.env.XRPL_NETWORK || 'testnet';
const XRP_LEDGER_VERSION = process.env.XRP_LEDGER_VERSION || 'validated';
const TRANSACTION_TIMEOUT = parseInt(
  process.env.TRANSACTION_TIMEOUT ? process.env.TRANSACTION_TIMEOUT : '1000'
);
const MAX_TRANSACTION_FEE = parseInt(
  process.env.MAX_TRANSACTION_FEE ? process.env.MAX_TRANSACTION_FEE : '10000'
);
const EST_TX_FEE = 0.00003; // 30 drops

// const FIXED_TRANSACTION_FEE =
//   process.env.FIXED_TRANSACTION_FEE || '2500';

// payor properties
const DISTRIBUTOR_ACCOUNT = process.env.DISTRIBUTOR_ACCOUNT || '';
const DISTRIBUTOR_SECRET_NUMBERS = process.env.DISTRIBUTOR_SECRET_NUMBERS || '';
const DISTRIBUTOR_FAMILY_SEED = process.env.DISTRIBUTOR_FAMILY_SEED || '';

module.exports = {
  WSSEndpoints,
  XRPL_NETWORK,
  XRP_LEDGER_VERSION,
  TRANSACTION_TIMEOUT,
  MAX_TRANSACTION_FEE,
  EST_TX_FEE,
  DISTRIBUTOR_ACCOUNT,
  DISTRIBUTOR_SECRET_NUMBERS,
  DISTRIBUTOR_FAMILY_SEED
};
