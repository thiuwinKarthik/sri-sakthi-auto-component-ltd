const express = require("express");
const router = express.Router();
const { poolPromise, sql } = require("../db");
const PDFDocument = require("pdfkit");

/**
 * GET active master rows for the Error Proof Verification user form
 */
router.get("/master-rows", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
      SELECT MasterId, SlNo, Line, ErrorProofName, NatureOfErrorProof, Frequency
      FROM ErrorProof_Master
      WHERE IsDeleted = 0
      ORDER BY SlNo ASC
    `);
        const rows = result.recordset.map(row => ({
            id: row.MasterId,
            line: row.Line || '',
            name: row.ErrorProofName || '',
            nature: row.NatureOfErrorProof || '',
            frequency: row.Frequency || ''
        }));
        res.json(rows);
    } catch (err) {
        console.error("Error fetching error proof master rows:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET next S.No
 */
router.get("/next-sno", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT ISNULL(MAX(sNo), 0) + 1 AS nextSNo FROM ReactionPlan`);
        res.json({ nextSNo: result.recordset[0].nextSNo });
    } catch (err) {
        res.status(500).json({ message: "DB error" });
    }
});

/**
 * GET incharges (from Supervisors table)
 */
router.get("/incharges", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT supervisorName AS name FROM Supervisors ORDER BY supervisorName ASC`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "DB error" });
    }
});

/**
 * INSERT Verification
 */
router.post("/add-verification", async (req, res) => {
    const { line, errorProofName, natureOfErrorProof, frequency, recordDate, shift, observationResult, verifiedBy, reviewedBy } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('line', sql.VarChar, line)
            .input('errorProofName', sql.NVarChar, errorProofName)
            .input('natureOfErrorProof', sql.NVarChar, natureOfErrorProof)
            .input('frequency', sql.VarChar, frequency)
            .input('recordDate', sql.Date, recordDate)
            .input('shift', sql.VarChar, shift)
            .input('observationResult', sql.VarChar, observationResult)
            .input('verifiedBy', sql.VarChar, verifiedBy)
            .input('reviewedBy', sql.VarChar, reviewedBy)
            .query(`
        INSERT INTO ErrorProofVerification (line, errorProofName, natureOfErrorProof, frequency, recordDate, shift, observationResult, verifiedBy, reviewedBy)
        VALUES (@line, @errorProofName, @natureOfErrorProof, @frequency, @recordDate, @shift, @observationResult, @verifiedBy, @reviewedBy)
      `);
        res.json({ message: "Verification saved" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Insert failed" });
    }
});

/**
 * INSERT Reaction Plan
 */
router.post("/add-reaction", async (req, res) => {
    const { sNo, errorProofNo, errorProofName, recordDate, shift, problem, rootCause, correctiveAction, status, reviewedBy, approvedBy, remarks } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('sNo', sql.Int, sNo)
            .input('errorProofNo', sql.VarChar, errorProofNo)
            .input('errorProofName', sql.NVarChar, errorProofName)
            .input('recordDate', sql.Date, recordDate)
            .input('shift', sql.VarChar, shift)
            .input('problem', sql.NVarChar, problem)
            .input('rootCause', sql.NVarChar, rootCause)
            .input('correctiveAction', sql.NVarChar, correctiveAction)
            .input('status', sql.VarChar, status)
            .input('reviewedBy', sql.VarChar, reviewedBy)
            .input('approvedBy', sql.VarChar, approvedBy)
            .input('remarks', sql.NVarChar, remarks)
            .query(`
        INSERT INTO ReactionPlan (sNo, errorProofNo, errorProofName, recordDate, shift, problem, rootCause, correctiveAction, status, reviewedBy, approvedBy, remarks)
        VALUES (@sNo, @errorProofNo, @errorProofName, @recordDate, @shift, @problem, @rootCause, @correctiveAction, @status, @reviewedBy, @approvedBy, @remarks)
      `);
        res.json({ message: "Reaction Plan saved" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Insert failed" });
    }
});

/**
 * GET PDF REPORT
 */
router.get("/report", async (req, res) => {
    try {
        const pool = await poolPromise;
        const verificationResult = await pool.request().query(`SELECT * FROM ErrorProofVerification ORDER BY recordDate ASC, id ASC`);
        const reactionResult = await pool.request().query(`SELECT * FROM ReactionPlan ORDER BY id ASC`);

        const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape", bufferPages: true });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=Error_Proof_Check_List.pdf");
        doc.pipe(res);

        const startX = 30;
        const startY = 30;

        const formatDate = (dateStr) => {
            const d = new Date(dateStr);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        const wLine = 45, wName = 105, wNature = 140, wFreq = 55;
        const wDateBox = 135;
        const wShift = wDateBox / 3;

        const drawMainHeaders = (y, datesArr = []) => {
            doc.font("Helvetica-Bold").fontSize(14).text("ERROR PROOF VERIFICATION CHECK LIST - FDY", startX, y, { align: "center" });
            const headerTopY = y + 25;
            doc.rect(startX, headerTopY, wLine, 60).stroke();
            doc.text("Line", startX, headerTopY + 25, { width: wLine, align: "center" });
            let cx = startX + wLine;
            doc.rect(cx, headerTopY, wName, 60).stroke();
            doc.text("Error Proof\nName", cx, headerTopY + 20, { width: wName, align: "center" });
            cx += wName;
            doc.rect(cx, headerTopY, wNature, 60).stroke();
            doc.text("Nature of\nError Proof", cx, headerTopY + 20, { width: wNature, align: "center" });
            cx += wNature;
            doc.rect(cx, headerTopY, wFreq, 60).stroke();
            doc.text("Frequency\nS,D,W,M", cx, headerTopY + 15, { width: wFreq, align: "center" });
            cx += wFreq;
            for (let i = 0; i < 3; i++) {
                const boxX = cx + (i * wDateBox);
                doc.rect(boxX, headerTopY, wDateBox, 20).stroke();
                let dateLabel = datesArr[i] ? `Date: ${formatDate(datesArr[i])}` : "Date:";
                doc.font("Helvetica-Bold").fontSize(9).text(dateLabel, boxX + 2, headerTopY + 5, { width: wDateBox, align: "left" });
                for (let s = 0; s < 3; s++) {
                    doc.rect(boxX + s * wShift, headerTopY + 20, wShift, 20).stroke();
                    doc.rect(boxX + s * wShift, headerTopY + 40, wShift, 20).stroke();
                }
                doc.fontSize(7);
                doc.text("Ist Shift", boxX, headerTopY + 25, { width: wShift, align: "center" });
                doc.text("IInd Shift", boxX + wShift, headerTopY + 25, { width: wShift, align: "center" });
                doc.text("IIIrd Shift", boxX + wShift * 2, headerTopY + 25, { width: wShift, align: "center" });
                doc.text("Observation\nResult", boxX, headerTopY + 42, { width: wShift, align: "center" });
                doc.text("Observation\nResult", boxX + wShift, headerTopY + 42, { width: wShift, align: "center" });
                doc.text("Observation\nResult", boxX + wShift * 2, headerTopY + 42, { width: wShift, align: "center" });
            }
            return headerTopY + 60;
        };

        const allRecords = verificationResult.recordset;
        const uniqueDates = [...new Set(allRecords.map(r => {
            const d = new Date(r.recordDate);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }))].sort();
        const uniqueProofsMap = new Map();
        allRecords.forEach(r => {
            if (!uniqueProofsMap.has(r.errorProofName))
                uniqueProofsMap.set(r.errorProofName, { line: r.line, nature: r.natureOfErrorProof, frequency: r.frequency });
        });
        const uniqueProofs = Array.from(uniqueProofsMap.keys());
        const dateChunks = [];
        if (uniqueDates.length === 0) dateChunks.push([]);
        else for (let i = 0; i < uniqueDates.length; i += 3) dateChunks.push(uniqueDates.slice(i, i + 3));

        let y = startY;
        dateChunks.forEach((chunk, chunkIndex) => {
            if (chunkIndex > 0) { doc.addPage({ layout: "landscape", margin: 30 }); y = startY; }
            y = drawMainHeaders(y, chunk);
            uniqueProofs.forEach((proofName) => {
                const pd = uniqueProofsMap.get(proofName);
                doc.font("Helvetica").fontSize(8);
                let rowHeight = Math.max(50,
                    doc.heightOfString(proofName || "", { width: wName - 8 }) + 20,
                    doc.heightOfString(pd.nature || "", { width: wNature - 8 }) + 20
                );
                if (y + rowHeight > doc.page.height - 60) {
                    doc.font("Helvetica-Bold").fontSize(9).text("QF/07/FYQ-05, Rev.No: 02 dt 28.02.2023", startX, y + 10, { align: "left" });
                    doc.addPage({ layout: "landscape", margin: 30 }); y = drawMainHeaders(30, chunk);
                }
                let cx = startX;
                [[wLine, pd.line], [wName, proofName], [wNature, pd.nature], [wFreq, pd.frequency]].forEach(([w, text]) => {
                    doc.rect(cx, y, w, rowHeight).stroke();
                    doc.text(String(text || ""), cx + 4, y + 10, { width: w - 8, align: "center" });
                    cx += w;
                });
                for (let i = 0; i < 9; i++) doc.rect(cx + i * wShift, y, wShift, rowHeight).stroke();
                chunk.forEach((dateStr, dateIndex) => {
                    allRecords.filter(r => {
                        const d = new Date(r.recordDate);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateStr && r.errorProofName === proofName;
                    }).forEach(record => {
                        const shiftOffset = record.shift === "II" ? 1 : record.shift === "III" ? 2 : 0;
                        const cellIndex = (dateIndex * 3) + shiftOffset;
                        doc.fontSize(7).text(record.observationResult === "OK" ? "Checked\nOK" : "Checked\nNot OK",
                            cx + cellIndex * wShift, y + rowHeight / 2 - 8, { width: wShift, align: "center" });
                    });
                });
                y += rowHeight;
            });
            doc.font("Helvetica-Bold").fontSize(9).text("QF/07/FYQ-05, Rev.No: 02 dt 28.02.2023", startX, y + 10, { align: "left" });
        });

        if (reactionResult.recordset.length > 0) {
            doc.addPage({ layout: "landscape", margin: 30 });
            const rColWidths = [30, 50, 90, 60, 80, 80, 80, 50, 70, 70, 90];
            const rHeaders = ["S.No", "Error\nProof No", "Error proof\nName", "Date /\nShift", "Problem", "Root Cause", "Corrective\naction", "Status", "Reviewed\nBy", "Approved\nBy", "Remarks"];
            const drawReactionHeaders = (ry) => {
                doc.font("Helvetica-Bold").fontSize(14).text("REACTION PLAN", startX, ry, { align: "center" });
                const headerY = ry + 25; let currX = startX;
                doc.fontSize(8);
                rHeaders.forEach((h, i) => {
                    doc.rect(currX, headerY, rColWidths[i], 30).stroke();
                    doc.text(h, currX + 2, headerY + 5, { width: rColWidths[i] - 4, align: "center" });
                    currX += rColWidths[i];
                });
                return headerY + 30;
            };
            let ry = drawReactionHeaders(30);
            reactionResult.recordset.forEach((rRow) => {
                doc.font("Helvetica").fontSize(8);
                const d = new Date(rRow.recordDate);
                const dateShiftStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}\nShift ${rRow.shift || ""}`;
                const rowData = [rRow.sNo || "", rRow.errorProofNo || "", rRow.errorProofName || "", dateShiftStr, rRow.problem || "", rRow.rootCause || "", rRow.correctiveAction || "", rRow.status || "", rRow.reviewedBy || "", rRow.approvedBy || "", rRow.remarks || ""];
                let rRowH = Math.max(40, ...rowData.map((t, i) => doc.heightOfString(String(t || ""), { width: rColWidths[i] - 8 }) + 15));
                if (ry + rRowH > doc.page.height - 60) {
                    doc.font("Helvetica-Bold").fontSize(9).text("QF/07/FYQ-05, Rev.No: 02 dt 28.02.2023", startX, ry + 10, { align: "left" });
                    doc.addPage({ layout: "landscape", margin: 30 }); ry = drawReactionHeaders(30);
                }
                let currX = startX;
                rowData.forEach((cell, i) => {
                    doc.rect(currX, ry, rColWidths[i], rRowH).stroke();
                    doc.text(String(cell), currX + 4, ry + 5, { width: rColWidths[i] - 8, align: "center" });
                    currX += rColWidths[i];
                });
                ry += rRowH;
            });
            doc.font("Helvetica-Bold").fontSize(9).text("QF/07/FYQ-05, Rev.No: 02 dt 28.02.2023", startX, ry + 10, { align: "left" });
        }

        doc.end();
    } catch (err) {
        console.error("Error generating report:", err);
        res.status(500).json({ message: "Report generation failed" });
    }
});

module.exports = router;
