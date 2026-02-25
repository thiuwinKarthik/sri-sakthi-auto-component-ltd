const { sql } = require('../db');

exports.getReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    let data = {};

    if (type === 'unpoured-mould-details') {
      const result = await sql.query`
        SELECT * FROM UnPouredMouldDetails 
        WHERE RecordDate BETWEEN ${fromDate} AND ${toDate}
          AND DisaMachine LIKE 'DISA%'
        ORDER BY RecordDate ASC, DisaMachine ASC, Shift ASC
      `;
      data = result.recordset;
    }
    else if (type === 'dmm-setting-parameters') {
      const result = await sql.query`
        SELECT * FROM DmmSettingParameters
        WHERE RecordDate BETWEEN ${fromDate} AND ${toDate}
          AND DisaMachine LIKE 'DISA%'
        ORDER BY RecordDate ASC, DisaMachine ASC, Shift ASC, RowIndex ASC
      `;
      data = result.recordset;
    }
    else if (type === 'disa-operator') {
      const transResult = await sql.query`
        SELECT T.*, M.CheckPointDesc, M.CheckMethod, M.SlNo
        FROM MachineChecklist_Trans T
        INNER JOIN MachineChecklist_Master M ON T.MasterId = M.MasterId
        WHERE T.LogDate BETWEEN ${fromDate} AND ${toDate}
          AND T.DisaMachine LIKE 'DISA%'
        ORDER BY T.LogDate ASC, T.DisaMachine ASC, M.SlNo ASC
      `;
      const ncResult = await sql.query`
        SELECT * FROM DisaNonConformanceReport
        WHERE ReportDate BETWEEN ${fromDate} AND ${toDate}
          AND DisaMachine LIKE 'DISA%'
        ORDER BY ReportDate ASC, DisaMachine ASC
      `;
      data = { trans: transResult.recordset, ncr: ncResult.recordset };
    }
    else if (type === 'lpa') {
      const transResult = await sql.query`
        SELECT T.*, M.CheckPointDesc, M.SlNo
        FROM BottomLevelAudit_Trans T
        INNER JOIN BottomLevelAudit_Master M ON T.MasterId = M.MasterId
        WHERE T.LogDate BETWEEN ${fromDate} AND ${toDate}
          AND T.DisaMachine LIKE 'DISA%'
        ORDER BY T.LogDate ASC, T.DisaMachine ASC, M.SlNo ASC
      `;
      const ncResult = await sql.query`
        SELECT * FROM BottomLevelAudit_NCR
        WHERE ReportDate BETWEEN ${fromDate} AND ${toDate}
          AND DisaMachine LIKE 'DISA%'
        ORDER BY ReportDate ASC, DisaMachine ASC
      `;
      data = { trans: transResult.recordset, ncr: ncResult.recordset };
    }
    else if (type === 'error-proof') {
      const verificationsResult = await sql.query`
        SELECT * FROM ErrorProofVerifications
        WHERE RecordDate BETWEEN ${fromDate} AND ${toDate}
          AND DisaMachine LIKE 'DISA%'
        ORDER BY RecordDate ASC, DisaMachine ASC
      `;
      const reactionPlansResult = await sql.query`
        SELECT rp.* FROM ReactionPlans rp
        INNER JOIN ErrorProofVerifications epv ON rp.VerificationId = epv.Id
        WHERE epv.RecordDate BETWEEN ${fromDate} AND ${toDate}
          AND epv.DisaMachine LIKE 'DISA%'
        ORDER BY epv.RecordDate ASC, epv.DisaMachine ASC, rp.SNo ASC
      `;
      data = { verifications: verificationsResult.recordset, plans: reactionPlansResult.recordset };
    }
    else if (type === 'disa-setting-adjustment') {
      const result = await sql.query`
        SELECT id, recordDate, mouldCountNo, prevMouldCountNo, noOfMoulds,
               workCarriedOut, preventiveWorkCarried, remarks
        FROM DISASettingAdjustmentRecord
        WHERE recordDate BETWEEN ${fromDate} AND ${toDate}
        ORDER BY recordDate ASC, id ASC
      `;
      data = result.recordset;
    }
    else {
      return res.status(404).json({ error: 'Report type not found or not implemented' });
    }

    res.json(data);

  } catch (err) {
    console.error("Report Extraction Error:", err);
    res.status(500).send('Server Error');
  }
};
