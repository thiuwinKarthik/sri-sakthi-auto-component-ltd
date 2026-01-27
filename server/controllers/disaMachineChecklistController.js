const { sql, poolPromise } = require('../db');

// --- 1. Get Details (Filter by Date AND Machine) ---
exports.getChecklistDetails = async (req, res) => {
  try {
    const { date, disaMachine } = req.query; // Added disaMachine
    const pool = await poolPromise;
    
    // JOIN Master with Trans for specific Date AND Machine
    const query = `
      SELECT 
          M.MasterId, 
          M.SlNo, 
          M.CheckPointDesc, 
          M.CheckMethod, 
          ISNULL(T.IsDone, 0) as IsDone, 
          T.Sign
      FROM MachineChecklist_Master M
      LEFT JOIN MachineChecklist_Trans T 
          ON M.MasterId = T.MasterId 
          AND T.LogDate = @date
          AND T.DisaMachine = @disaMachine -- Filter by Machine
      ORDER BY M.SlNo ASC
    `;
    
    const operatorsQuery = `SELECT Id, OperatorName FROM dbo.Operators`;
    
    const reportsQuery = `
      SELECT * FROM dbo.DisaNonConformanceReport 
      WHERE ReportDate = @date AND DisaMachine = @disaMachine
    `;

    const checklistResult = await pool.request()
        .input('date', sql.Date, date)
        .input('disaMachine', sql.NVarChar, disaMachine)
        .query(query);

    const operatorsResult = await pool.request().query(operatorsQuery);
    
    const reportsResult = await pool.request()
        .input('date', sql.Date, date)
        .input('disaMachine', sql.NVarChar, disaMachine)
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
};

// --- 2. Batch Submit (Include Machine Name) ---
exports.saveBatchChecklist = async (req, res) => {
  try {
    const { items, sign, date, disaMachine } = req.body; 
    if (!items || !date || !disaMachine) return res.status(400).send("Data missing");

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      
      for (const item of items) {
        // Check existence based on MasterId + Date + Machine
        const checkQuery = `
            SELECT COUNT(*) as count FROM MachineChecklist_Trans 
            WHERE MasterId = ${item.MasterId} AND LogDate = '${date}' AND DisaMachine = '${disaMachine}'
        `;
        const checkRes = await request.query(checkQuery);
        
        const isDoneVal = item.IsDone ? 1 : 0;

        if (checkRes.recordset[0].count > 0) {
          // UPDATE
          await request.query(`
            UPDATE MachineChecklist_Trans 
            SET IsDone = ${isDoneVal}, Sign = '${sign}', LastUpdated = GETDATE()
            WHERE MasterId = ${item.MasterId} AND LogDate = '${date}' AND DisaMachine = '${disaMachine}'
          `);
        } else {
          // INSERT
          await request.query(`
            INSERT INTO MachineChecklist_Trans (MasterId, LogDate, IsDone, Sign, DisaMachine)
            VALUES (${item.MasterId}, '${date}', ${isDoneVal}, '${sign}', '${disaMachine}')
          `);
        }
      }
      await transaction.commit();
      res.json({ success: true });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Error saving batch:', err);
    res.status(500).send(err.message);
  }
};

// --- 3. Save NC Report (Include Machine Name) ---
exports.saveNCReport = async (req, res) => {
  try {
    const { 
        checklistId, slNo, reportDate, ncDetails, correction, 
        rootCause, correctiveAction, targetDate, responsibility, sign, disaMachine 
    } = req.body;

    const pool = await poolPromise;
    
    // Insert Report
    await pool.request().query(`
      INSERT INTO DisaNonConformanceReport (MasterId, ReportDate, NonConformityDetails, Correction, RootCause, CorrectiveAction, TargetDate, Responsibility, Sign, Status, DisaMachine)
      VALUES (${checklistId}, '${reportDate}', '${ncDetails}', '${correction}', '${rootCause}', '${correctiveAction}', '${targetDate}', '${responsibility}', '${sign}', 'Pending', '${disaMachine}')
    `);

    // Update Trans Table (Mark 0)
    const checkRow = await pool.request().query(`
        SELECT COUNT(*) as count FROM MachineChecklist_Trans 
        WHERE MasterId = ${checklistId} AND LogDate = '${reportDate}' AND DisaMachine = '${disaMachine}'
    `);
    
    if (checkRow.recordset[0].count > 0) {
       await pool.request().query(`
           UPDATE MachineChecklist_Trans SET IsDone = 0, Sign = '${sign}' 
           WHERE MasterId = ${checklistId} AND LogDate = '${reportDate}' AND DisaMachine = '${disaMachine}'
       `);
    } else {
       await pool.request().query(`
           INSERT INTO MachineChecklist_Trans (MasterId, LogDate, IsDone, Sign, DisaMachine) 
           VALUES (${checklistId}, '${reportDate}', 0, '${sign}', '${disaMachine}')
       `);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// --- 4. Monthly Report (Filter by Machine) ---
// --- 4. Monthly Report (Filter by Machine) ---
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year, disaMachine } = req.query;
    const pool = await poolPromise;
    
    // Query 1: Checklist Status (Existing)
    const checklistQuery = `
      SELECT MasterId, DAY(LogDate) as DayVal, IsDone
      FROM MachineChecklist_Trans
      WHERE MONTH(LogDate) = @month 
        AND YEAR(LogDate) = @year 
        AND DisaMachine = @disaMachine
    `;

    // Query 2: Non-Conformance Reports (New)
    const ncQuery = `
      SELECT 
        ReportId, ReportDate, NonConformityDetails, 
        Correction, RootCause, CorrectiveAction, 
        TargetDate, Responsibility, Sign, Status
      FROM DisaNonConformanceReport
      WHERE MONTH(ReportDate) = @month 
        AND YEAR(ReportDate) = @year 
        AND DisaMachine = @disaMachine
      ORDER BY ReportDate ASC
    `;

    const request = pool.request()
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .input('disaMachine', sql.NVarChar, disaMachine);

    const checklistResult = await request.query(checklistQuery);
    const ncResult = await request.query(ncQuery);

    res.json({ 
      monthlyLogs: checklistResult.recordset,
      ncReports: ncResult.recordset // Return NCR data
    });

  } catch (err) {
    console.error("Monthly Report Error:", err);
    res.status(500).send(err.message);
  }
};