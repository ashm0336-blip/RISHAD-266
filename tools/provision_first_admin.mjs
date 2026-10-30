#!/usr/bin/env node
/*
 * Usage: node tools/provision_first_admin.mjs --username <10-digit-login> --name "Name" --output <private-path.sql>
 * RISHAD 266: explicitly provision the first administrator on a fresh D1 database.
 * This is an OFFLINE operator command; it NEVER calls the website or Cloudflare.
 * No built-in credentials, public bootstrap endpoint, or database connection.
 * A future relational-identity migration must replace the current account-storage statement.
 */
import { pbkdf2Sync, randomBytes, randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ITERATIONS = 100_000; // matches PBKDF2_MAX enforced by the existing Worker
export const USER_KEY = 'bassam_auth_users_v1';
const sqlLiteral = (value) => "'" + String(value).replaceAll("'", "''") + "'";
export const validAdminPin = (s) => typeof s === 'string' && /^[0-9]{6}$/.test(s) &&
  !/^(.)\1+$/.test(s) &&
  !'01234567890123456789'.includes(s) && !'98765432109876543210'.includes(s);

export function createPassword() {
  // Original RISHAD administrator policy: random six-digit numeric PIN.
  // Reject repeated and sequential PINs. No fixed or bundled credentials.
  for (;;) {
    const value = String(randomInt(0, 1_000_000)).padStart(6, '0');
    if (validAdminPin(value)) return value;
  }
}

export function makeSql({ username, name, password, salt = randomBytes(16) }) {
  if (!/^\d{10}$/.test(username)) throw new Error('username must be exactly 10 ASCII digits');
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || /[\r\n\u0000]/.test(name)) throw new Error('invalid display name');
  if (!validAdminPin(password)) throw new Error('administrator PIN must be six nontrivial numeric digits');
  if (!Buffer.isBuffer(salt) || salt.length !== 16) throw new Error('salt must contain 16 random bytes');
  const ph = `p2$${ITERATIONS}$${salt.toString('hex')}$${pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('hex')}`;
  const users = JSON.stringify([{ id: 'su', un: username, name: name.trim(), role: 'super', ph, mc: 0, dis: 0 }]);
  // Statement 1 will fail with a PK conflict if a user key already exists.
  // Run only against a freshly migrated, EMPTY D1 database, in one atomic CLI execution.
  return `-- RISHAD 266 first-admin provisioning, for a NEW EMPTY database only.\n` +
    `-- No default accounts. Re-running fails at the primary-key constraint.\n` +
    `INSERT INTO kv (k, seq, v) VALUES (${sqlLiteral(USER_KEY)}, 0, ${sqlLiteral(users)});\n` +
    `INSERT INTO revs (k, rev) VALUES (${sqlLiteral(USER_KEY)}, 1);\n` +
    `INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO NOTHING;\n`;
}

function arg(flag) { const n = process.argv.indexOf(flag); return n < 0 ? null : process.argv[n + 1]; }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const username = arg('--username'), name = arg('--name'), output = arg('--output');
  if (!username || !name || !output) {
    console.error('Usage: node tools/provision_first_admin.mjs --username <10-digit-login> --name "Name" --output <private-path.sql>');
    process.exitCode = 2;
  } else if (!process.stdout.isTTY) {
    console.error('Run in an interactive terminal to display the one-time password privately.');
    process.exitCode = 2;
  } else {
    try {
      const password = createPassword();
      writeFileSync(resolve(output), makeSql({ username, name, password }), { flag: 'wx', mode: 0o600 });
      console.log(`SQL created: ${resolve(output)} (owner-only file).`);
      console.log('One-time initial administrator PIN (store securely; not written to file):');
      console.log(password);
      console.log('Apply SQL ONLY to a separate freshly migrated D1 database using authorized Wrangler access.');
      console.log('Delete the SQL file immediately after application; NEVER commit it to Git.');
    } catch (e) { console.error('Provisioning failed:', e.message); process.exitCode = 1; }
  }
}
