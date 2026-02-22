const { sql } = require('../db');

const dmmController = {
  getDetails: async (req, res) => {
    try {
      const { date, disa } = req.query;

      // 1. Fetch Dynamic Columns from Master
      const masterRes = await sql.query`
        SELECT * FROM DmmSetting_Master 
        WHERE IsDeleted = 0 
        ORDER BY SlNo ASC
      `;

      // 2. Fetch Transaction Values for this date
      const transRes = await sql.query`
        SELECT * FROM DmmSetting_Trans 
        WHERE RecordDate = ${date} AND DisaMachine = ${disa}
      `;

      // 3. Construct Columns definition
      const masterCols = masterRes.recordset.map(row => ({
        key: row.MasterId.toString(),
        originalKey: row.ColumnKey, // Keeping for backward compatibility context if needed
        label: row.ColumnLabel,
        width: row.ColumnWidth,
        inputType: row.InputType
      }));

      // 4. Map transactions into { 1: [row1, row2], 2: [row1], 3: [] } format
      const shiftData = { 1: [], 2: [], 3: [] };
      const rowTracker = {};

      transRes.recordset.forEach(record => {
        const shift = record.Shift;
        const rowId = record.RowUUID;

        if (!rowTracker[rowId]) {
          // Create empty row object
          const newRow = { id: rowId };
          masterCols.forEach(col => newRow[col.key] = '');
          rowTracker[rowId] = newRow;
          shiftData[shift].push(newRow);
        }

        // Map value to the correct MasterId (column key)
        rowTracker[rowId][record.MasterId.toString()] = record.Value || '';
      });

      // Provide minimal empty rows if a shift has NO data yet
      [1, 2, 3].forEach(shift => {
        if (shiftData[shift].length === 0) {
          const empty = { id: crypto.randomUUID() };
          masterCols.forEach(col => empty[col.key] = '');
          shiftData[shift].push(empty, { ...empty, id: crypto.randomUUID() });
        }
      });

      res.json({ masterCols, shiftsData: shiftData });

    } catch (err) {
      console.error('Error fetching dmm details:', err);
      res.status(500).send('Server Error');
    }
  },

  saveDetails: async (req, res) => {
    try {
      const { date, disa, shiftsData } = req.body;

      const transaction = new sql.Transaction();
      await transaction.begin();

      try {
        // Delete existing transactions for this date and machine completely
        const deleteReq = new sql.Request(transaction);
        await deleteReq.query`
          DELETE FROM DmmSetting_Trans 
          WHERE RecordDate = ${date} AND DisaMachine = ${disa}
        `;

        // Insert new values
        for (const shift of [1, 2, 3]) {
          const rows = shiftsData[shift];

          if (!rows || rows.length === 0) continue;

          for (const row of rows) {
            // Iterate over each column key in the row (which are MasterIds)
            for (const [masterId, value] of Object.entries(row)) {
              if (masterId === 'id') continue; // Skip the row tracking ID

              // Only insert if there's actually a value provided
              if (value !== '' && value !== null) {
                const insertReq = new sql.Request(transaction);
                await insertReq.query`
                          INSERT INTO DmmSetting_Trans (RecordDate, DisaMachine, Shift, RowUUID, MasterId, Value)
                          VALUES (${date}, ${disa}, ${shift}, ${row.id}, ${masterId}, ${value.toString().replace(/'/g, "''")})
                      `;
              }
            }
          }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Settings saved successfully' });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error('Error saving details:', err);
      res.status(500).send('Server Error');
    }
  }
};

module.exports = dmmController;