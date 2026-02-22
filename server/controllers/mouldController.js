const { sql } = require('../db');

const mouldController = {
  // --- 1. Get Details for ALL Shifts at once ---
  getMouldDetails: async (req, res) => {
    try {
      const { date, disa } = req.query;

      // 1. Fetch Dynamic Columns from Master
      const masterRes = await sql.query`
        SELECT * FROM UnpouredMould_Master 
        WHERE IsDeleted = 0 
        ORDER BY SlNo ASC
      `;

      // 2. Fetch Transaction Values for this date
      const transRes = await sql.query`
        SELECT * FROM UnpouredMould_Trans 
        WHERE RecordDate = ${date} AND DisaMachine = ${disa}
      `;

      // 3. Construct Columns definition for the frontend
      const masterCols = masterRes.recordset.map(row => ({
        key: row.MasterId.toString(),
        label: row.ReasonName,
        group: row.Department
      }));

      // Find the last column in each group
      if (masterCols.length > 0) {
        let currentGroup = masterCols[0].group;
        for (let i = 1; i < masterCols.length; i++) {
          if (masterCols[i].group !== currentGroup) {
            masterCols[i - 1].isLastInGroup = true;
            currentGroup = masterCols[i].group;
          }
        }
        masterCols[masterCols.length - 1].isLastInGroup = true;
      }

      // 4. Map the array into an object keyed by Shift Number (1, 2, 3)
      const shiftData = { 1: {}, 2: {}, 3: {} };

      // Initialize with empty strings
      masterCols.forEach(col => {
        shiftData[1][col.key] = '';
        shiftData[2][col.key] = '';
        shiftData[3][col.key] = '';
      });

      // Populate with actual data
      transRes.recordset.forEach(row => {
        if (shiftData[row.Shift]) {
          // Convert 0 to empty string for cleaner UI, or just send the quantity
          shiftData[row.Shift][row.MasterId.toString()] = row.Quantity === 0 ? '' : row.Quantity;
        }
      });

      res.json({ masterCols, shiftsData: shiftData });

    } catch (err) {
      console.error('Error fetching mould details:', err);
      res.status(500).send('Server Error');
    }
  },

  // --- 2. Save/Update ALL 3 Shifts in one transaction ---
  saveMouldDetails: async (req, res) => {
    try {
      const { date, disa, shiftsData } = req.body;

      const transaction = new sql.Transaction();
      await transaction.begin();

      try {
        // Delete existing transactions for this date and machine completely
        const deleteReq = new sql.Request(transaction);
        await deleteReq.query`
          DELETE FROM UnpouredMould_Trans 
          WHERE RecordDate = ${date} AND DisaMachine = ${disa}
        `;

        // Insert new values
        for (const shift of [1, 2, 3]) {
          const shiftValues = shiftsData[shift];

          if (!shiftValues) continue;

          for (const masterId of Object.keys(shiftValues)) {
            if (masterId === 'rowTotal') continue;

            const val = parseInt(shiftValues[masterId]);

            const insertReq = new sql.Request(transaction);
            await insertReq.query`
                  INSERT INTO UnpouredMould_Trans (RecordDate, DisaMachine, Shift, MasterId, Quantity)
                  VALUES (${date}, ${disa}, ${shift}, ${masterId}, ${isNaN(val) ? 0 : val})
              `;
          }
        }

        await transaction.commit();
        res.json({ success: true, message: 'All shifts saved successfully' });
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

module.exports = mouldController;