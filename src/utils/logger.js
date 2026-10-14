/**
 * LexForge™ Structured Logger
 * ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785
 * Zero console.* in production — all output via this module.
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export const EventType = Object.freeze({
  RENDER:    'RENDER',
  DELIVER:   'DELIVER',
  FINGERPRINT: 'FINGERPRINT',
  XRPL:      'XRPL',
  WEBHOOK:   'WEBHOOK',
  SYSTEM:    'SYSTEM',
  ERROR:     'ERROR',
});

let _logStream = null;

function getStream() {
  if (_logStream) return _logStream;
  try {
    fs.mkdirSync(config.logs.dir, { recursive: true });
    const file = path.join(config.logs.dir, `lexforge-${datestamp()}.log`);
    _logStream = fs.createWriteStream(file, { flags: 'a' });
  } catch {
    _logStream = process.stderr;
  }
  return _logStream;
}

function datestamp() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Write a structured log entry.
 * @param {object} opts
 * @param {string} opts.eventType    — EventType constant
 * @param {string} [opts.documentCode]
 * @param {string} [opts.jurisdiction]
 * @param {string} [opts.language]
 * @param {string} [opts.transactionId]
 * @param {string} [opts.actor]
 * @param {object} [opts.payload]
 */
export function log(opts) {
  const entry = {
    ts:           new Date().toISOString(),
    product:      'ARC-LXF-001',
    eventType:    opts.eventType,
    documentCode: opts.documentCode  ?? null,
    jurisdiction: opts.jurisdiction  ?? null,
    language:     opts.language      ?? null,
    transactionId:opts.transactionId ?? null,
    actor:        opts.actor         ?? null,
    payload:      opts.payload       ?? {},
  };

  const line = JSON.stringify(entry);
  getStream().write(line + '\n');

  if (config.server.env !== 'production') {
    process.stderr.write(`[LexForge] ${entry.ts} ${entry.eventType} ${JSON.stringify(entry.payload)}\n`);
  }
}
