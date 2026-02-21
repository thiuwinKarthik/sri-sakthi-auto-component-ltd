const { sql } = require('../db');

exports.getChecklistDetails = async (req, res) => {
  try {
    const { date, processLine } = req.query;
    
    const checklistResult = await sql.query`
      SELECT 
          M.MasterId, 
          M.SlNo, 
          M.CheckPointDesc, 
          ISNULL(T.IsDone, 0) as IsDone, 
          ISNULL(T.IsNA, 0) as IsNA, 
          ISNULL(T.IsHoliday, 0) as IsHoliday,
          ISNULL(T.IsVatCleaning, 0) as IsVatCleaning,
          T.Sign
      FROM BottomLevelAudit_Master M
      LEFT JOIN BottomLevelAudit_Trans T 
          ON M.MasterId = T.MasterId 
          AND T.LogDate = ${date}
          AND T.ProcessLineName = ${processLine}
      ORDER BY M.SlNo ASC
    `;
    
    const operatorsResult = await sql.query`SELECT Id, OperatorName FROM dbo.Operators`;
    
    const reportsResult = await sql.query`
      SELECT * FROM dbo.BottomLevelAudit_NCR 
      WHERE ReportDate = ${date} AND ProcessLineName = ${processLine}
    `;

    res.json({
      checklist: checklistResult.recordset,
      operators: operatorsResult.recordset,
      reports: reportsResult.recordset 
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.saveBatchChecklist = async (req, res) => {
  try {
    const { items, sign, date, processLine } = req.body; 
    if (!items || !date || !processLine) return res.status(400).send("Data missing");

    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      for (const item of items) {
        const request = new sql.Request(transaction); 

        const checkRes = await request.query`
            SELECT COUNT(*) as count FROM BottomLevelAudit_Trans 
            WHERE MasterId = ${item.MasterId} AND LogDate = ${date} AND ProcessLineName = ${processLine}
        `;
        
        const isDoneVal = item.IsDone ? 1 : 0;
        const isNaVal = item.IsNA ? 1 : 0;
        const isHolidayVal = item.IsHoliday ? 1 : 0;
        const isVatVal = item.IsVatCleaning ? 1 : 0;

        const writeRequest = new sql.Request(transaction);

        if (checkRes.recordset[0].count > 0) {
          await writeRequest.query`
            UPDATE BottomLevelAudit_Trans 
            SET IsDone = ${isDoneVal}, IsNA = ${isNaVal}, IsHoliday = ${isHolidayVal}, IsVatCleaning = ${isVatVal}, Sign = ${sign}, LastUpdated = GETDATE()
            WHERE MasterId = ${item.MasterId} AND LogDate = ${date} AND ProcessLineName = ${processLine}
          `;
        } else {
          await writeRequest.query`
            INSERT INTO BottomLevelAudit_Trans (MasterId, LogDate, ProcessLineName, IsDone, IsNA, IsHoliday, IsVatCleaning, Sign)
            VALUES (${item.MasterId}, ${date}, ${processLine}, ${isDoneVal}, ${isNaVal}, ${isHolidayVal}, ${isVatVal}, ${sign})
          `;
        }
      }
      
      await transaction.commit();
      res.json({ success: true });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.saveNCReport = async (req, res) => {
  try {
    const { 
        checklistId, slNo, reportDate, ncDetails, correction, 
        rootCause, correctiveAction, targetDate, responsibility, sign, processLine 
    } = req.body;

    await sql.query`
      INSERT INTO BottomLevelAudit_NCR (
        MasterId, ReportDate, ProcessLineName, NonConformityDetails, Correction, 
        RootCause, CorrectiveAction, TargetDate, Responsibility, Sign, Status
      )
      VALUES (
        ${checklistId}, ${reportDate}, ${processLine}, ${ncDetails}, ${correction}, 
        ${rootCause}, ${correctiveAction}, ${targetDate}, ${responsibility}, ${sign}, 'Pending'
      )
    `;

    const checkRow = await sql.query`
        SELECT COUNT(*) as count FROM BottomLevelAudit_Trans 
        WHERE MasterId = ${checklistId} AND LogDate = ${reportDate} AND ProcessLineName = ${processLine}
    `;
    
    if (checkRow.recordset[0].count > 0) {
       await sql.query`
           UPDATE BottomLevelAudit_Trans SET IsDone = 0, IsNA = 0, Sign = ${sign} 
           WHERE MasterId = ${checklistId} AND LogDate = ${reportDate} AND ProcessLineName = ${processLine}
       `;
    } else {
       await sql.query`
           INSERT INTO BottomLevelAudit_Trans (MasterId, LogDate, ProcessLineName, IsDone, IsNA, Sign) 
           VALUES (${checklistId}, ${reportDate}, ${processLine}, 0, 0, ${sign})
       `;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year, processLine } = req.query;
    
    const checklistResult = await sql.query`
      SELECT MasterId, DAY(LogDate) as DayVal, IsDone, IsNA, IsHoliday, IsVatCleaning, Sign
      FROM BottomLevelAudit_Trans
      WHERE MONTH(LogDate) = ${month} 
        AND YEAR(LogDate) = ${year} 
        AND ProcessLineName = ${processLine}
    `;

    const ncResult = await sql.query`
      SELECT 
        ReportId, ReportDate, NonConformityDetails, Correction, RootCause, 
        CorrectiveAction, TargetDate, Responsibility, Sign, Status
      FROM BottomLevelAudit_NCR
      WHERE MONTH(ReportDate) = ${month} 
        AND YEAR(ReportDate) = ${year} 
        AND ProcessLineName = ${processLine}
      ORDER BY ReportDate ASC
    `;

    res.json({ monthlyLogs: checklistResult.recordset, ncReports: ncResult.recordset });
  } catch (err) {
    res.status(500).send(err.message);
  }
};