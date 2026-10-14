/**
 * LexForge™ XRPL anchor (in-repo; replaces the missing ../xrpl_anchor sibling module)
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 *
 * Writes an `ACA/delivery/v1` memo to the XRP Ledger. Without XRPL_DEST_ADDRESS it uses an
 * AccountSet transaction (a Payment to yourself is rejected by the ledger as temREDUNDANT);
 * with XRPL_DEST_ADDRESS it sends a 1-drop Payment to that address.
 *
 * STATUS: unit-tested with an injected client; NOT verified against a live ledger from this
 * build environment (no outbound access to XRPL nodes).
 */

import { config } from '../config/index.js';

const NETWORKS = {
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet:  'wss://s.devnet.rippletest.net:51233',
  mainnet: 'wss://xrplcluster.com',
};

const hex = (s) => Buffer.from(s, 'utf8').toString('hex').toUpperCase();

export class XRPLAnchor {
  /** @param {{ xrpl?: object, seed?: string, network?: string, endpoint?: string, destAddress?: string }} [opts] */
  constructor(opts = {}) {
    this.seed = opts.seed ?? config.xrpl.seed;
    this.network = opts.network ?? config.xrpl.network;
    this.endpoint = opts.endpoint || config.xrpl.endpoint || NETWORKS[this.network];
    this.destAddress = opts.destAddress ?? config.xrpl.destAddress;
    this._xrpl = opts.xrpl ?? null;
    if (!this.seed) throw new Error('XRPL_SEED not set');
    if (!this.endpoint) throw new Error(`Unknown XRPL network: ${this.network}`);
  }

  async _lib() {
    if (!this._xrpl) this._xrpl = await import('xrpl');
    return this._xrpl;
  }

  /**
   * @param {{ productId:string, documentTypes:string[], jurisdiction:string, contentHash:string,
   *           buyerRefHash:string, transactionId:string }} d
   * @returns {Promise<{ success:boolean, txHash?:string, ledgerIndex?:number, error?:string }>}
   */
  async anchorDelivery(d) {
    let client;
    try {
      const xrpl = await this._lib();
      const wallet = xrpl.Wallet.fromSeed(this.seed);
      client = new xrpl.Client(this.endpoint);
      await client.connect();

      const memoData = JSON.stringify({
        p: d.productId, t: d.transactionId, d: d.documentTypes, j: d.jurisdiction,
        h: d.contentHash, b: d.buyerRefHash,
      });
      const memo = {
        Memo: {
          MemoType: hex('ACA/delivery/v1'),
          MemoFormat: hex('application/json'),
          MemoData: hex(memoData),
        },
      };
      const tx = this.destAddress
        ? { TransactionType: 'Payment', Account: wallet.address, Destination: this.destAddress, Amount: '1', Memos: [memo] }
        : { TransactionType: 'AccountSet', Account: wallet.address, Memos: [memo] };

      const prepared = await client.autofill(tx);
      const signed = wallet.sign(prepared);
      const res = await client.submitAndWait(signed.tx_blob);
      const result = res.result?.meta?.TransactionResult;
      if (result !== 'tesSUCCESS') return { success: false, error: `XRPL result ${result ?? 'unknown'}` };
      return { success: true, txHash: res.result.hash, ledgerIndex: res.result.ledger_index };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      if (client) { try { await client.disconnect(); } catch { /* ignore */ } }
    }
  }
}
