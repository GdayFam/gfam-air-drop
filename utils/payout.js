/**
 * ###### NOTICE ######
 * This file has been modified from the original versions
 * original versions:
 * https://github.com/ripple/xrp-batch-payout
 * https://github.com/nixer89/xrpl-token-distributor
 */

const {
  generateWallet,
  connectToLedger,
  reliableBatchPayment
} = require('./xrp');

const { checkBalanceIsSufficient } = require('./payments');

const config = require('../config/xrpl');

async function payout(batch) {
  try {
    console.log('Starting XRP batch payout...');

    // generate XRP wallet from secret
    console.log('Generating XRP wallet...');
    console.log('Distributor secret: ' + config.DISTRIBUTOR_FAMILY_SEED);
    const [wallet, classicAddress] = generateWallet(
      config.DISTRIBUTOR_FAMILY_SEED
    );

    // connect to XRPL
    console.log(`Connecting to XRPL ${config.XRPL_NETWORK}..`);
    const [xrpNetworkClient, balance] = await connectToLedger(
      config.WSSEndpoints.Main,
      classicAddress
    );
    // check balance sufficient for all payments
    console.log(`Checking balance is sufficient for all payments...`);
    const balanceIsSufficient = await checkBalanceIsSufficient(
      balance,
      batch.payments
    );
    console.log(`  -> Balance is sufficient: ${balanceIsSufficient}`);
    if (!balanceIsSufficient) {
      return {
        status: false,
        message: 'Balance is not sufficient for all payments'
      };
    }
    // send XRP to accounts in txInputs
    // Testing only - `await` (remove for server)
    reliableBatchPayment(batch.payments, wallet, xrpNetworkClient, batch._id);

    // update payment batch finished to true
    console.log('Batch payout submitted successfully!');
    return {
      success: true,
      message: 'Batch payout submitted'
    };
  } catch (error) {
    console.log('payout error: ', error);
    return {
      success: false,
      message: 'Payout error'
    };
  }
}

module.exports = {
  payout
};
