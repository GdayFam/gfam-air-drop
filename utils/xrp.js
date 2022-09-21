/**
 * ###### NOTICE ######
 * This file has been modified from the original versions
 * original versions:
 * https://github.com/ripple/xrp-batch-payout
 * https://github.com/nixer89/xrpl-token-distributor
 */

const { Client, isValidAddress, Wallet, xrpToDrops } = require('xrpl');
const { Account } = require('xrpl-secret-numbers');

const config = require('../config/xrpl');

const { updatePaymentBatch, updateReward } = require('../utils/payments');

/**
 * Connect to the XRPL network
 * @param wssUrl - The web gRPC endpoint of the rippleD node
 * @param classicAddress - The sender's XRP classic address
 * @throws Re-throws more informative errors connection failure
 * @returns A XRPL network client with address' balance
 */
async function connectToLedger(wssUrl, classicAddress) {
  try {
    let xrpClient;
    let balance = -1;

    // `true` uses the web gRPC endpoint, which is currently more reliable
    xrpClient = new Client(wssUrl);
    await xrpClient.connect();

    if (xrpClient.isConnected()) console.log('  -> XRPL is connected!');
    // Get balance in XRP - network call validates that we are connected to the ledger
    try {
      balance = parseFloat(await xrpClient.getXrpBalance(classicAddress));
    } catch (err) {
      console.log(err);
    }

    console.log('  -> Account balance: ' + balance);
    return [xrpClient, balance];
  } catch (err) {
    throw Error(
      `Failed to connect ${wssUrl}. Is the the right ${wssUrl} endpoint?`
    );
  }
}

/**
 * Generate account secret/seed from secret numbers
 * @param secretNumbers - Array of secret numbers
 * @returns Account secret/seed
 */
function generateAccountSecret(secretNumbers) {
  try {
    if (!secretNumbers || secretNumbers.length <= 10) return null;

    const account = new Account(secretNumbers);
    if (!account) return null;

    const secret = account.getFamilySeed();
    return secret;
  } catch (error) {
    console.log('generateAccountSecret error:', error);
    return null;
  }
}

/**
 * Generate a seed wallet from an XRPL secret
 * @param secret - XRPL secret
 * @returns XRPL seed wallet and classic address
 */
function generateWallet(secret) {
  try {
    const wallet = Wallet.fromSecret(secret);

    const classicAddress = wallet.classicAddress;

    // Validate wallet generated successfully
    if (!wallet || !isValidAddress(wallet.classicAddress)) {
      throw Error('Failed to generate wallet from secret.');
    }

    console.log('  -> Wallet generated successfully!');
    console.log(`  -> Wallet address: ${classicAddress}`);
    return [wallet, classicAddress];
  } catch (error) {
    console.log(error);
  }
}

/**
 * Check account existence
 * @param xrpClient - XRPL network client
 * @param address - XRP address
 * @returns boolean - true if account exists
 */
async function checkAccountExists(xrplClient, address) {
  try {
    console.log(`Checking Account Exists ...`);
    console.log(`  -> Account: ${address}`);

    if (!address) return false;

    let accountInfoRequest = {
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    };

    let accountInfoResponse = await xrplClient.request(accountInfoRequest);

    if (!accountInfoResponse?.result) {
      return false;
    }

    const balance = parseInt(accountInfoResponse.result.account_data?.Balance);
    console.log(`  -> Account balance: ${balance}`);

    const found =
      parseInt(accountInfoResponse.result.account_data?.Balance) > 0;

    return found;
  } catch (err) {
    console.log('err: ', err);
    return false;
  }
}

/**
 * Check if transaction succeeded
 * @param txResponse - The transaction response from XRPL
 * @returns boolean - true if payment was successful
 */
function checkTxResponse(txResponse) {
  // console.log('txResponse: ', txResponse);
  if (!txResponse || !txResponse.result) return false;

  return txResponse.result.meta.TransactionResult === 'tesSUCCESS';
}

/**
 * Check if max transaction fee exceeded
 * @param txResponse - The transaction response from XRPL
 * @returns boolean - true if max fee exceeded
 */
function checkMaxTxFeeExceeded(txResponse) {
  console.log('  -> tx fee: ', txResponse.result.Fee);
  const fee = parseInt(txResponse.result.Fee);
  return fee > config.MAX_TRANSACTION_FEE;
}

/**
 * Submit an XRP payment transaction to the ledger
 *
 * @param senderWallet - Sender's XRP wallet
 * @param xrpClient - XRPL network client
 * @param address - destination address
 * @param amount - amount to send
 *
 * @returns Tx result
 */
async function submitPayment(senderWallet, xrplClient, address, amount) {
  try {
    const amountInDrops = xrpToDrops(amount);

    let payment = {
      TransactionType: 'Payment',
      Account: senderWallet.classicAddress,
      Destination: address,
      Amount: amountInDrops
    };

    // Submit payment
    const txResponse = await xrplClient.submitAndWait(payment, {
      wallet: senderWallet,
      failHard: true
    });

    return txResponse;
  } catch (err) {
    console.log('Submit payment error: ', err);
    return null;
  }
}

/**
 * Submit batch of XRP payment transactions
 *
 * @param txInputs - transaction inputs
 * @param senderWallet - Sender's XRP wallet
 * @param xrpClient - XRPL network client
 * @param batchId - payment batch ObjectId
 *
 */
async function reliableBatchPayment(
  txInputs,
  senderWallet,
  xrpClient,
  batchId
) {
  try {
    let successes = 0;
    let failures = 0;

    // delay
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // iterate through txInputs - for each:
    for (const txInput of txInputs) {
      const {
        user: { payment_account },
        amount
      } = txInput;
      console.log('**********************************************************');
      // check if account exists
      const accountExists = await checkAccountExists(
        xrpClient,
        payment_account
      );
      console.log('  -> Account Exists: ', accountExists);

      if (!accountExists) {
        console.log(`  -> Account ${payment_account} does not exist.`);
        // update payment record using id
        // and set status to 'failed'
        failures++;
        continue;
      }

      // pause for 1 second
      await sleep(config.TRANSACTION_TIMEOUT);

      console.log(`Submitting payment to address: ${payment_account}...`);

      // submit payment
      const txResponse = await submitPayment(
        senderWallet,
        xrpClient,
        payment_account,
        amount
      );

      // check result status
      const txSuccess = checkTxResponse(txResponse);
      console.log(
        `  -> Payment to address: ${payment_account} ${
          txSuccess ? 'SUCCESS' : 'FAILED'
        }`
      );

      // update payment record
      if (txSuccess) {
        successes++;
        console.log(
          '  -> account balance: ',
          parseFloat(await xrpClient.getXrpBalance(payment_account))
        );
        await updateReward(txInput.id, {
          status: 'paid',
          txHash: txResponse.result.hash
        });

        // check if max fee exceeded
        console.log('Checking if max fee exceeded...');
        const maxFeeExceeded = checkMaxTxFeeExceeded(txResponse);
        console.log('  -> Max Fee Exceeded: ', maxFeeExceeded);
        if (maxFeeExceeded) {
          await updatePaymentBatch(batchId, {
            finished: true,
            result: {
              successes,
              failures,
              maxFeeExceeded: true
            }
          });
          break;
        }
      } else {
        console.log('failed txResponse: ', txResponse);
        failures++;
        await updateReward(txInput.id, {
          status: 'failed'
        });
      }
    }

    // update batch record
    await updatePaymentBatch(batchId, {
      finished: true,
      result: {
        successes,
        failures,
        maxFeeExceeded: false
      }
    });

    console.log('**********************************************************');
    console.log(`Payment batch ${batchId} completed.`);
    console.log(`  -> Successes: ${successes}`);
    console.log(`  -> Failures: ${failures}`);
  } catch (error) {
    console.log('reliableBatchPayment error: ', error);
    return error; // or just terminate the process?
  }
}

module.exports = {
  connectToLedger,
  generateWallet,
  reliableBatchPayment
};
