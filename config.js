/**
 * Migration configuration — all connection details come from environment variables.
 *
 * Required env vars:
 *   MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE
 *
 * Optional:
 *   MSSQL_PORT              — default 1433
 *   MSSQL_ENCRYPT           — default false
 *   MSSQL_REQUEST_TIMEOUT   — ms per query (default 600000 = 10 min, needed for large tables)
 *   MSSQL_CONNECTION_TIMEOUT — ms to connect (default 30000)
 *   MIGRATION_BATCH_SIZE    — rows per INSERT batch (default 500)
 *   MIGRATION_LOG_LEVEL     — 'debug' | 'info' | 'warn' | 'error' (default 'info')
 */
'use strict';

function getMssqlConfig() {
  const host     = process.env.MSSQL_HOST;
  const user     = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD;
  const database = process.env.MSSQL_DATABASE || 'CATTLE';

  if (!host || !user || !password) {
    throw new Error(
      'Missing required env vars: MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD'
    );
  }

  return {
    server:   host,
    port:     parseInt(process.env.MSSQL_PORT || '1433', 10),
    user,
    password,
    database,
    options: {
      encrypt:            process.env.MSSQL_ENCRYPT === 'true',
      trustServerCertificate: true,
      requestTimeout:     parseInt(process.env.MSSQL_REQUEST_TIMEOUT || '600000', 10),
      connectionTimeout:  parseInt(process.env.MSSQL_CONNECTION_TIMEOUT || '30000', 10),
    },
    pool: {
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
    },
  };
}

function getMigrationOptions() {
  return {
    batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE || '500', 10),
    logLevel:  process.env.MIGRATION_LOG_LEVEL || 'info',
  };
}

module.exports = { getMssqlConfig, getMigrationOptions };
