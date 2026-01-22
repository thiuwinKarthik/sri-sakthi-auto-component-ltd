const { sql, poolPromise } = require('../db');

const disaMachineChecklistController = {

  // --- 1. Get Details (Now includes LastUpdated) ---
  getChecklistDetails: async (req, res) => {
    try {
      const { date } = req.query; 
      const pool = await poolPromise;
      
      // ADDED: LastUpdated to the select list
      const checklistQuery = `
        SELECT ChecklistId, SlNo, [CheckPoint], CheckMethod, IsDone, Sign, LastUpdated 
        FROM dbo.MachineChecklist 
        ORDER BY SlNo ASC
      `;
      
      const operatorsQuery = `SELECT Id, OperatorName FROM dbo.Operators`;
      
      // Filter Reports by the SELECTED DATE
      const reportsQuery = `
        SELECT * FROM dbo.DisaNonConformanceReport 
        WHERE ReportDate = @selectedDate
      `;

      const checklistResult = await pool.request().query(checklistQuery);
      const operatorsResult = await pool.request().query(operatorsQuery);
      
      const reportsResult = await pool.request()
        .input('selectedDate', sql.Date, date || new Date()) 
        .query(reportsQuery);

      res.json({
        checklist: checklistResult.recordset,
        operators: operatorsResult.recordset,
        reports: reportsResult.recordset 
      });

    } catch (err) {
      console.error('Error fetching details:', err);
      res.status(500).send(err.message);
    }
  },

  // --- 2. Save NC Report ---
  saveNCReport: async (req, res) => {
    try {
      const {
        checklistId, slNo, reportDate, 
        ncDetails, correction, rootCause, correctiveAction,
        targetDate, responsibility, sign
      } = req.body;

      const pool = await poolPromise;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Insert Report
        const insertReport = `
          INSERT INTO dbo.DisaNonConformanceReport (
            ChecklistId, SlNo, ReportDate, 
            NonConformityDetails, Correction, RootCause, CorrectiveAction,
            TargetDate, Responsibility, Sign, Status
          ) VALUES (
            @cid, @sl, @rDate,
            @nc, @corr, @rc, @ca,
            @tDate, @resp, @sign, 'Pending'
          )
        `;

        // Update Checklist Status & LastUpdated
        const updateChecklist = `
          UPDATE dbo.MachineChecklist 
          SET IsDone = 0, Sign = @sign, LastUpdated = GETDATE() 
          WHERE ChecklistId = @cid
        `;

        const request = new sql.Request(transaction);
        request.input('cid', sql.Int, checklistId);
        request.input('sl', sql.Int, slNo);
        request.input('sign', sql.NVarChar, sign);
        request.input('rDate', sql.Date, reportDate);
        request.input('nc', sql.NVarChar, ncDetails);
        request.input('corr', sql.NVarChar, correction);
        request.input('rc', sql.NVarChar, rootCause);
        request.input('ca', sql.NVarChar, correctiveAction);
        request.input('tDate', sql.Date, targetDate);
        request.input('resp', sql.NVarChar, responsibility);

        await request.query(insertReport);
        await request.query(updateChecklist);

        await transaction.commit();
        res.json({ success: true, message: 'NC Report Logged' });

      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error('Error saving report:', err);
      res.status(500).send(err.message);
    }
  },

  // --- 3. Batch Submit ---
  saveBatchChecklist: async (req, res) => {
    try {
      const { items, sign } = req.body; 
      
      if (!items || items.length === 0) return res.status(400).send("No data");

      const pool = await poolPromise;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        const request = new sql.Request(transaction);
        for (const item of items) {
          await request.query(`
            UPDATE dbo.MachineChecklist 
            SET IsDone = ${item.IsDone ? 1 : 0}, 
                Sign = '${sign}', 
                LastUpdated = GETDATE()
            WHERE ChecklistId = ${item.ChecklistId}
          `);
        }
        await transaction.commit();
        res.json({ success: true, message: 'Checklist Saved' });

      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error('Error batch saving:', err);
      res.status(500).send(err.message);
    }
  }
};

module.exports = disaMachineChecklistController;