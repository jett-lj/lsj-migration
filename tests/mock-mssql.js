/**
 * Shared mock of mssql's ConnectionPool for migration tests.
 *
 * Supports both read modes the runner uses:
 *  - plain `await request().query(sql)` → { recordset } (probes, COUNT, audits)
 *  - streaming (`request.stream = true` + on('row'/'error'/'done') + query())
 *    with pause()/resume() backpressure and cancel(), matching the interface
 *    migrateTable() relies on since the O(n²) OFFSET re-scan was replaced
 *    with a single streamed read.
 */

function createMockMssql(tables) {
  // Sort keys longest-first so 'Drugs_Given' matches before 'Drugs'
  const sortedKeys = Object.keys(tables).sort((a, b) => b.length - a.length);

  // Match table names using dbo. prefix with boundary check to avoid
  // 'dbo.Cattle' matching 'dbo.Cattle_Program_Types'.
  // Handles both dbo.Table and [dbo].[Table] formats.
  function findTable(sql) {
    for (const tableName of sortedKeys) {
      const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\[?dbo\\]?\\.\\[?${escaped}\\]?(?![a-zA-Z0-9_])`);
      if (re.test(sql)) return tableName;
    }
    return null;
  }

  function runQuery(sql) {
    // COUNT(*) queries (used for progress reporting)
    if (/SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(sql)) {
      const tbl = findTable(sql);
      if (tbl) return { recordset: [{ cnt: tables[tbl].length }] };
      return { recordset: [{ cnt: 0 }] };
    }

    // TOP N queries (raw-table empty-check probe)
    const topMatch = sql.match(/SELECT\s+TOP\s+(\d+)/i);
    // OFFSET/FETCH pagination (single-row probes)
    const offsetMatch = sql.match(/OFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY/i);

    const tbl = findTable(sql);
    if (tbl) {
      let rows = tables[tbl];
      if (offsetMatch) {
        const offset = parseInt(offsetMatch[1]);
        const limit = parseInt(offsetMatch[2]);
        rows = rows.slice(offset, offset + limit);
      } else if (topMatch) {
        rows = rows.slice(0, parseInt(topMatch[1]));
      }
      return { recordset: rows };
    }
    return { recordset: [] };
  }

  function makeRequest() {
    const handlers = {};
    let paused = false;
    let cancelled = false;

    const waitWhilePaused = async () => {
      while (paused && !cancelled) await new Promise((r) => setImmediate(r));
    };

    const req = {
      stream: false,
      on(event, fn) {
        handlers[event] = fn;
      },
      pause() {
        paused = true;
      },
      resume() {
        paused = false;
      },
      cancel() {
        cancelled = true;
      },
      async query(sql) {
        if (!req.stream) return runQuery(sql);

        // Streaming mode: emit rows one at a time, honouring backpressure.
        try {
          const { recordset } = runQuery(sql);
          for (const row of recordset) {
            await waitWhilePaused();
            if (cancelled) break;
            if (handlers.row) handlers.row(row);
          }
        } catch (err) {
          if (handlers.error) handlers.error(err);
        }
        await waitWhilePaused();
        if (handlers.done) handlers.done();
      },
    };
    return req;
  }

  return {
    request: makeRequest,
    async close() {},
  };
}

module.exports = { createMockMssql };
