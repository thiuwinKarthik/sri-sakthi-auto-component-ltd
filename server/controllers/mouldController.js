const { sql } = require('../db');

const mouldController = {
  
  // --- 1. Get Details & Calculate Daily Totals ---
  getMouldDetails: async (req, res) => {
    try {
      const { date, disa, shift } = req.query;

      // Query A: Fetch specific record for the selected Shift
      const shiftResult = await sql.query`
        SELECT * FROM UnPouredMouldDetails 
        WHERE RecordDate = ${date} AND Disa = ${disa} AND Shift = ${shift}
      `;
      
      // Query B: Calculate Daily Totals (Sum across all shifts for this Date & Disa)
      const totalsResult = await sql.query`
        SELECT 
            SUM(TotalChange) as DailyMouldTotal,
            SUM(SandDelay) as DailySandDelay,
            SUM(DrySand) as DailyDrySand,
            SUM(TotalPouring) as DailyPouringTotal
        FROM UnPouredMouldDetails 
        WHERE RecordDate = ${date} AND Disa = ${disa}
      `;

      const totals = totalsResult.recordset[0] || {};

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

      // Using Tagged Template Literals automatically handles parameter types (Int, Date, etc.)
      await sql.query`
        MERGE UnPouredMouldDetails AS target
        USING (SELECT ${date} AS RecordDate, ${disa} AS Disa, ${shift} AS Shift) AS source
        ON (target.RecordDate = source.RecordDate AND target.Disa = source.Disa AND target.Shift = source.Shift)
        
        WHEN MATCHED THEN
            UPDATE SET 
                -- Moulding
                PatternChange = ${patternChange}, 
                HeatCodeChange = ${heatCodeChange}, 
                MouldBurn = ${mouldBurn}, 
                AmcCleaning = ${amcCleaning}, 
                MouldCrush = ${mouldCrush}, 
                CoreFalling = ${coreFalling}, 
                TotalChange = ${totalChange},
                -- Sand Plant
                SandDelay = ${sandDelay},
                DrySand = ${drySand},
                -- Pouring
                NozzleLeakage = ${nozzleLeakage},
                SpoutPocking = ${spoutPocking},
                StRod = ${stRod},
                TotalPouring = ${totalPouring},

                UpdatedAt = GETDATE()
                
        WHEN NOT MATCHED THEN
            INSERT (
                RecordDate, Disa, Shift, 
                PatternChange, HeatCodeChange, MouldBurn, AmcCleaning, MouldCrush, CoreFalling, TotalChange,
                SandDelay, DrySand,
                NozzleLeakage, SpoutPocking, StRod, TotalPouring
            )
            VALUES (
                ${date}, ${disa}, ${shift}, 
                ${patternChange}, ${heatCodeChange}, ${mouldBurn}, ${amcCleaning}, ${mouldCrush}, ${coreFalling}, ${totalChange},
                ${sandDelay}, ${drySand},
                ${nozzleLeakage}, ${spoutPocking}, ${stRod}, ${totalPouring}
            );
      `;

      res.json({ success: true, message: 'All details saved successfully' });

    } catch (err) {
      console.error('Error saving details:', err);
      res.status(500).send('Server Error');
    }
  }
};

module.exports = mouldController;