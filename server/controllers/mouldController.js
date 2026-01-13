const { sql, poolPromise } = require('../db');

const mouldController = {
  
  // 1. Get Details & Calculate Total Heat Change
  getMouldDetails: async (req, res) => {
    try {
      const { date, disa, shift } = req.query;
      const pool = await poolPromise;

      // Query A: Fetch specific data for the selected Shift
      const shiftQuery = `
        SELECT * FROM UnPouredMouldDetails 
        WHERE RecordDate = @date AND Disa = @disa AND Shift = @shift
      `;
      
      const shiftResult = await pool.request()
        .input('date', sql.Date, date)
        .input('disa', sql.VarChar, disa)
        .input('shift', sql.Int, shift)
        .query(shiftQuery);

      // Query B: Calculate Total Heat Change (Sum of ALL shifts for this Disa & Date)
      // This sums up TotalChange from Shift 1 + 2 + 3
      const totalHeatQuery = `
        SELECT SUM(TotalChange) as DailyTotal 
        FROM UnPouredMouldDetails 
        WHERE RecordDate = @date AND Disa = @disa
      `;

      const totalHeatResult = await pool.request()
        .input('date', sql.Date, date)
        .input('disa', sql.VarChar, disa)
        .query(totalHeatQuery);

      res.json({
        record: shiftResult.recordset[0] || null,
        totalHeatChange: totalHeatResult.recordset[0].DailyTotal || 0
      });

    } catch (err) {
      console.error('Error fetching mould details:', err);
      res.status(500).send('Server Error');
    }
  },

  // 2. Save or Update (Upsert) Data
  saveMouldDetails: async (req, res) => {
    try {
      const { 
        date, disa, shift, 
        patternChange, heatCodeChange, mouldBurn, 
        amcCleaning, mouldCrush, coreFalling, totalChange 
      } = req.body;

      const pool = await poolPromise;

      // Using MERGE to Insert if new, Update if exists
      const query = `
        MERGE UnPouredMouldDetails AS target
        USING (SELECT @date, @disa, @shift) AS source (RecordDate, Disa, Shift)
        ON (target.RecordDate = source.RecordDate AND target.Disa = source.Disa AND target.Shift = source.Shift)
        
        WHEN MATCHED THEN
            UPDATE SET 
                PatternChange = @pChange, 
                HeatCodeChange = @hChange, 
                MouldBurn = @mBurn, 
                AmcCleaning = @amc, 
                MouldCrush = @mCrush, 
                CoreFalling = @cFall, 
                TotalChange = @tChange,
                UpdatedAt = GETDATE()
                
        WHEN NOT MATCHED THEN
            INSERT (RecordDate, Disa, Shift, PatternChange, HeatCodeChange, MouldBurn, AmcCleaning, MouldCrush, CoreFalling, TotalChange)
            VALUES (@date, @disa, @shift, @pChange, @hChange, @mBurn, @amc, @mCrush, @cFall, @tChange);
      `;

      await pool.request()
        .input('date', sql.Date, date)
        .input('disa', sql.VarChar, disa)
        .input('shift', sql.Int, shift)
        .input('pChange', sql.Int, patternChange)
        .input('hChange', sql.Int, heatCodeChange)
        .input('mBurn', sql.Int, mouldBurn)
        .input('amc', sql.Int, amcCleaning)
        .input('mCrush', sql.Int, mouldCrush)
        .input('cFall', sql.Int, coreFalling)
        .input('tChange', sql.Int, totalChange) // This is the single shift total
        .query(query);

      res.json({ success: true, message: 'Record saved successfully' });

    } catch (err) {
      console.error('Error saving mould details:', err);
      res.status(500).send('Server Error');
    }
  }
};

module.exports = mouldController;