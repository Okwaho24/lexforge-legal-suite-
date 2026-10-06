import { log, logError, EventType } from '../utils/logger.js';

let anchor = null;

export async function getXRPLAnchor() {
  if (!process.env.XRPL_ENABLED || process.env.XRPL_ENABLED !== 'true') return null;
  if (!process.env.XRPL_SEED) return null;
  if (anchor) return anchor;
  try {
    const { Client, Wallet } = await import('xrpl');
    const network = process.env.XRPL_NETWORK === 'mainnet'
      ? 'wss://xrplcluster.com'
      : 'wss://s.altnet.rippletest.net:51233';
    const client = new Client(network);
    await client.connect();
    const wallet = Wallet.fromSeed(process.env.XRPL_SEED);
    anchor = { client, wallet };
    return anchor;
  } catch (err) {
    logError({ eventType: EventType.XRPL_ERROR, error: err.message });
    return null;
  }
}

export async function anchorDelivery({ transactionId, documentCode, jurisdiction, language, contentHash, buyerWallet }) {
  const a = await getXRPLAnchor();
  if (!a) {
    log({ eventType: EventType.XRPL_SKIPPED, transactionId });
    return null;
  }
  try {
    const { a: { client, wallet } } = { a };
    const memo = {
      Memo: {
        MemoType: Buffer.from('ACA/delivery/v1', 'utf8').toString('hex').toUpperCase(),
        MemoData: Buffer.from(JSON.stringify({ transactionId, documentCode, jurisdiction, language, contentHash, buyerWallet }), 'utf8').toString('hex').toUpperCase(),
      },
    };
    const prepared = await a.client.autofill({ TransactionType: 'Payment', Account: a.wallet.address, Amount: '1', Destination: buyerWallet || a.wallet.address, Memos: [memo] });
    const signed = a.wallet.sign(prepared);
    const result = await a.client.submitAndWait(signed.tx_blob);
    const hash = result.result.hash;
    log({ eventType: EventType.XRPL_ANCHORED, transactionId, hash });
    return hash;
  } catch (err) {
    logError({ eventType: EventType.XRPL_ERROR, transactionId, error: err.message });
    return null;
  }
}
