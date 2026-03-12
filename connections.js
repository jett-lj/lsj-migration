/**
 * Database connection helpers for migration.
 *
 * Provides:
 *  - connectMssql()    → mssql connection pool
 *  - connectPostgres() → pg Pool for target farm database
 *  - closePools()      → tear down all connections
 */
'use strict';

const sql  = require('mssql');
const { Pool } = require('pg');
const { getMssqlConfig } = require('./config');

let _mssqlPool = null;
let _pgPool    = null;

/**
 * Connect to the legacy SQL Server database.
 * Returns an mssql ConnectionPool (already connected).
 */
async function connectMssql(configOverride) {
  if (_mssqlPool) return _mssqlPool;
  const config = configOverride || getMssqlConfig();
  _mssqlPool = await new sql.ConnectionPool(config).connect();
  return _mssqlPool;
}

/**
 * Connect to the target PostgreSQL farm database.
 * @param {object} opts  - { connectionString } or individual host/port/user/password/database
 */
function connectPostgres(opts) {
  if (_pgPool) return _pgPool;
  if (!opts) {
    throw new Error('PostgreSQL connection config required');
  }
  _pgPool = new Pool({ ...opts, max: 10 });
  return _pgPool;
}

/**
 * Gracefully close all pools.
 */
async function closePools() {
  const tasks = [];
  if (_mssqlPool) { tasks.push(_mssqlPool.close()); _mssqlPool = null; }
  if (_pgPool)    { tasks.push(_pgPool.end());       _pgPool = null;    }
  await Promise.all(tasks);
}

/** Allow tests to inject mock pools */
function _setMssqlPool(p) { _mssqlPool = p; }
function _setPgPool(p)    { _pgPool = p; }
function _getMssqlPool()  { return _mssqlPool; }
function _getPgPool()     { return _pgPool; }

module.exports = {
  connectMssql,
  connectPostgres,
  closePools,
  _setMssqlPool,
  _setPgPool,
  _getMssqlPool,
  _getPgPool,
};
