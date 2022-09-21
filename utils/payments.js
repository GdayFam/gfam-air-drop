const Reward = require('../database/challengeDB/Reward');
const Batch = require('../database/challengeDB/PaymentBatch');

const { EST_TX_FEE } = require('../config/xrpl');

async function getPaymentBatch(batchId) {
  try {
    const batch = await Batch.findById(batchId)
      .select('payments')
      .populate({
        path: 'payments',
        select: 'user amount',
        populate: [
          {
            path: 'user',
            select: 'payment_account'
          }
        ]
      });

    if (!batch || !batch.payments || batch.payments.length === 0) {
      return {
        success: false,
        message: 'Payment batch not found'
      };
    }

    return batch;
  } catch (error) {
    console.log('getPaymentBatch error:', error);
    return {
      success: false,
      message: 'Error submitting payments'
    };
  }
}

async function updatePaymentBatch(id, update) {
  try {
    const batch = await Batch.findByIdAndUpdate(id, update);

    if (!batch) {
      console.log('batch not found');
    }
  } catch (error) {
    console.log('updateBatch error:', error);
  }
}

async function updateReward(id, update) {
  try {
    const reward = await Reward.findByIdAndUpdate(id, update);

    if (!reward) {
      console.log('reward not found');
    }
  } catch (error) {
    console.log('update reward error:', error);
  }
}

async function getTotalPaymentsAmt(payments) {
  const paymentReducer = (acc, payment) => acc + payment.amount;

  const total = payments.reduce(paymentReducer, 0);
  return total;
}

function estimatedTxFees(paymentCount) {
  const feeEstimate = paymentCount * EST_TX_FEE;

  return feeEstimate;
}

async function checkBalanceIsSufficient(balance, payments) {
  console.log('checkBalanceIsSufficient...');
  // console.log('balance:', balance);
  const totalPayments = await getTotalPaymentsAmt(payments);
  // console.log('totalPayments:', totalPayments);
  const feeEstimate = estimatedTxFees(payments.length);
  const total = totalPayments + feeEstimate;
  // console.log('total:', total);
  const balanceIsSufficient = balance >= total;
  console.log('balanceIsSufficient:', balanceIsSufficient);

  return balanceIsSufficient;
}

module.exports = {
  getPaymentBatch,
  updatePaymentBatch,
  updateReward,
  checkBalanceIsSufficient
};
