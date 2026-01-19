const { sql, poolPromise } = require('../db');

const mouldController = {
  
  // --- 1. Get Details & Calculate Daily Totals ---
  getMouldDetails: async (req, res) => {
    try {
      const { date, disa, shift } = req.query;
      const pool = await poolPromise;

      // Query A: Fetch specific record for the selected Shift
      const shiftQuery = `
        SELECT * FROM UnPouredMouldDetails 
        WHERE RecordDate = @date AND Disa = @disa AND Shift = @shift
      `;
      
      const shiftResult = await pool.request()
        .input('date', sql.Date, date)
        .input('disa', sql.VarChar, disa)
        .input('shift', sql.Int, shift)
        .query(shiftQuery);

      // Query B: Calculate Daily Totals (Sum across all shifts for this Date & Disa)
      // Added sums for Sand and Pouring
      const totalsQuery = `
        SELECT 
            SUM(TotalChange) as DailyMouldTotal,
            SUM(SandDelay) as DailySandDelay,
            SUM(DrySand) as DailyDrySand,
            SUM(TotalPouring) as DailyPouringTotal
        FROM UnPouredMouldDetails 
        WHERE RecordDate = @date AND Disa = @disa
      `;

      const totalsResult = await pool.request()
        .input('date', sql.Date, date)
        .input('disa', sql.VarChar, disa)
        .query(totalsQuery);

      const totals = totalsResult.recordset[0];

      res.json({
        record: shiftResult.recordset[0] || null,
        dailyStats: {
            totalHeatChange: totals.DailyMouldTotal || 0,
            totalSandDelay: totals.DailySandDelay || 0,
            totalDrySand: totals.DailyDrySand || 0,
            totalPouring: totals.DailyPouringTotal || 0
        }
      });

    } catch (err) {
      console.error('Error fetching mould details:', err);
      res.status(500).send('Server Error');
    }
  },

  // --- 2. Save or Update (Upsert) Data ---
  saveMouldDetails: async (req, res) => {
    try {
      const { 
        date, disa, shift, 
        // Moulding
        patternChange, heatCodeChange, mouldBurn, amcCleaning, mouldCrush, coreFalling, totalChange,
        // Sand Plant
        sandDelay, drySand,
        // Pouring
        nozzleLeakage, spoutPocking, stRod, totalPouring
      } = req.body;

      const pool = await poolPromise;

      const query = `
        MERGE UnPouredMouldDetails AS target
        USING (SELECT @date, @disa, @shift) AS source (RecordDate, Disa, Shift)
        ON (target.RecordDate = source.RecordDate AND target.Disa = source.Disa AND target.Shift = source.Shift)
        
        WHEN MATCHED THEN
            UPDATE SET 
                -- Moulding
                PatternChange = @pChange, 
                HeatCodeChange = @hChange, 
                MouldBurn = @mBurn, 
                AmcCleaning = @amc, 
                MouldCrush = @mCrush, 
                CoreFalling = @cFall, 
                TotalChange = @tChange,
                -- Sand Plant
                SandDelay = @sDelay,
                DrySand = @dSand,
                -- Pouring
                NozzleLeakage = @nLeak,
                SpoutPocking = @sPock,
                StRod = @stRod,
                TotalPouring = @tPouring,

                UpdatedAt = GETDATE()
                
        WHEN NOT MATCHED THEN
            INSERT (
                RecordDate, Disa, Shift, 
                PatternChange, HeatCodeChange, MouldBurn, AmcCleaning, MouldCrush, CoreFalling, TotalChange,
                SandDelay, DrySand,
                NozzleLeakage, SpoutPocking, StRod, TotalPouring
            )
            VALUES (
                @date, @disa, @shift, 
                @pChange, @hChange, @mBurn, @amc, @mCrush, @cFall, @tChange,
                @sDelay, @dSand,
                @nLeak, @sPock, @stRod, @tPouring
            );
      `;

      await pool.request()
        // Keys
        .input('date', sql.Date, date)
        .input('disa', sql.VarChar, disa)
        .input('shift', sql.Int, shift)
        // Moulding Inputs
        .input('pChange', sql.Int, patternChange)
        .input('hChange', sql.Int, heatCodeChange)
        .input('mBurn', sql.Int, mouldBurn)
        .input('amc', sql.Int, amcCleaning)
        .input('mCrush', sql.Int, mouldCrush)
        .input('cFall', sql.Int, coreFalling)
        .input('tChange', sql.Int, totalChange)
        // Sand Plant Inputs
        .input('sDelay', sql.Int, sandDelay)
        .input('dSand', sql.Int, drySand)
        // Pouring Inputs
        .input('nLeak', sql.Int, nozzleLeakage)
        .input('sPock', sql.Int, spoutPocking)
        .input('stRod', sql.Int, stRod)
        .input('tPouring', sql.Int, totalPouring)
        .query(query);

      res.json({ success: true, message: 'All details saved successfully' });

    } catch (err) {
      console.error('Error saving details:', err);
      res.status(500).send('Server Error');
    }
  }
};

module.exports = mouldController;