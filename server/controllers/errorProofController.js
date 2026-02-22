const { sql } = require('../db');

exports.getDetails = async (req, res) => {
  try {
    const { machine } = req.query;
    // We are pulling data for today. If no data exists for today, we still return the Master list.
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Dynamic Master List
    const masterRes = await sql.query`
      SELECT * FROM ErrorProof_Master 
      WHERE IsDeleted = 0 
      ORDER BY SlNo ASC
    `;

    // 2. Fetch Transactions for today matching this machine
    const transRes = await sql.query`
      SELECT * FROM ErrorProof_Trans 
      WHERE DisaMachine = ${machine} AND RecordDate = ${today}
    `;

    // 3. Fetch Reaction Plans for today
    // We need to match ReactionPlans to the TransId
    const reactionRes = await sql.query`
      SELECT rp.* FROM ReactionPlans rp
      INNER JOIN ErrorProof_Trans epv ON rp.VerificationId = epv.TransId
      WHERE epv.DisaMachine = ${machine} AND epv.RecordDate = ${today}
      ORDER BY rp.SNo ASC
    `;

    // Map the transaction data to the master data
    const verifications = masterRes.recordset.map(masterRow => {
      // Look for matching transaction
      const transRow = transRes.recordset.find(t => t.MasterId === masterRow.MasterId);

      return {
        Id: transRow ? transRow.TransId : `temp-${masterRow.MasterId}`,
        MasterId: masterRow.MasterId,
        Line: masterRow.Line,
        ErrorProofName: masterRow.ErrorProofName,
        NatureOfErrorProof: masterRow.NatureOfErrorProof,
        Frequency: masterRow.Frequency,
        SlNo: masterRow.SlNo,
        Date1_Shift1_Res: transRow ? transRow.Shift1_Res : null,
        Date1_Shift2_Res: transRow ? transRow.Shift2_Res : null,
        Date1_Shift3_Res: transRow ? transRow.Shift3_Res : null,
        ReviewedByHOF: transRow ? transRow.ReviewedByHOF : '',
        ApprovedBy: transRow ? transRow.ApprovedBy : ''
      };
    });

    res.json({
      verifications: verifications,
      reactionPlans: reactionRes.recordset
    });

  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).send('Server Error');
  }
};

exports.saveDetails = async (req, res) => {
  try {
    const { machine, verifications, reactionPlans, headerDetails } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      // 1. Update existing records or Insert brand new ones
      for (const row of verifications) {

        // Safely check if this is a temporary ID (no transaction row for today yet)
        const isNewRecord = String(row.Id).startsWith('temp');
        const queryReq = new sql.Request(transaction);

        if (isNewRecord) {
          // INSERT NEW ROW IN TRANS TABLE
          const result = await queryReq.query`
            INSERT INTO ErrorProof_Trans (
              RecordDate, DisaMachine, MasterId,
              Shift1_Res, Shift2_Res, Shift3_Res,
              ReviewedByHOF, ApprovedBy, LastUpdated
            ) 
            OUTPUT INSERTED.TransId
            VALUES (
              ${today}, ${machine}, ${row.MasterId},
              ${row.Date1_Shift1_Res || null}, ${row.Date1_Shift2_Res || null}, ${row.Date1_Shift3_Res || null},
              ${headerDetails.reviewedBy}, ${headerDetails.approvedBy}, GETDATE()
            )
          `;

          const newDbId = result.recordset[0].TransId;

          // Replace 'temp-x' with the real SQL Integer ID in the Reaction Plans array
          if (reactionPlans && reactionPlans.length > 0) {
            reactionPlans.forEach(rp => {
              if (String(rp.VerificationId) === String(row.Id)) {
                rp.VerificationId = newDbId;
              }
            });
          }

        } else {
          // UPDATE EXISTING TRANS ROW
          await queryReq.query`
            UPDATE ErrorProof_Trans
            SET 
              Shift1_Res = ${row.Date1_Shift1_Res || null},
              Shift2_Res = ${row.Date1_Shift2_Res || null},
              Shift3_Res = ${row.Date1_Shift3_Res || null},
              ReviewedByHOF = ${headerDetails.reviewedBy},
              ApprovedBy = ${headerDetails.approvedBy},
              LastUpdated = GETDATE()
            WHERE TransId = ${row.Id}
          `;
        }
      }

      // 2. Clear out existing reaction plans safely
      const validIdsForDeletion = verifications
        .filter(v => !String(v.Id).startsWith('temp'))
        .map(v => v.Id);

      for (const validId of validIdsForDeletion) {
        const deleteReq = new sql.Request(transaction);
        await deleteReq.query`DELETE FROM ReactionPlans WHERE VerificationId = ${validId}`;
      }

      // 3. Insert fresh reaction plans
      if (reactionPlans && reactionPlans.length > 0) {
        for (const plan of reactionPlans) {
          const insertReq = new sql.Request(transaction);
          await insertReq.query`
            INSERT INTO ReactionPlans (
              VerificationId, SNo, ErrorProofNo, ErrorProofName, VerificationDateShift,
              Problem, RootCause, CorrectiveAction, Status, ReviewedBy, ApprovedBy, Remarks
            ) VALUES (
              ${plan.VerificationId}, ${plan.SNo}, ${plan.ErrorProofNo || ''}, ${plan.ErrorProofName}, ${plan.VerificationDateShift},
              ${plan.Problem}, ${plan.RootCause}, ${plan.CorrectiveAction}, ${plan.Status}, 
              ${plan.ReviewedBy}, ${plan.ApprovedBy}, ${plan.Remarks}
            )
          `;
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Saved successfully' });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Save Error:", err);
    res.status(500).json({ error: err.message, message: 'Server Error' });
  }
};