const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const PDFDocument = require("pdfkit");
const path = require("path");

// ══════════════════════════════════════════════════════════════════════════════
//  DROPDOWN DATA
// ══════════════════════════════════════════════════════════════════════════════
router.get("/incharges", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT supervisorName AS name FROM Supervisors ORDER BY supervisorName ASC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: "DB error", error: err.message }); }
});

router.get("/types", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT typeName FROM FourMTypes ORDER BY id ASC`);
        res.json(result.recordset);
    } catch (err) {
        res.json([{ typeName: "Man" }, { typeName: "Machine" }, { typeName: "Material" }, { typeName: "Method" }]);
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CUSTOM COLUMN MANAGEMENT (Admin)
// ══════════════════════════════════════════════════════════════════════════════
router.get("/custom-columns", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT id, columnName, displayOrder FROM FourMCustomColumns WHERE isDeleted = 0 ORDER BY displayOrder ASC, id ASC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: "DB error", error: err.message }); }
});

router.post("/custom-columns", async (req, res) => {
    const { columnName } = req.body;
    try {
        const pool = await poolPromise;
        const maxRes = await pool.request().query(`SELECT ISNULL(MAX(displayOrder), 0) AS maxOrder FROM FourMCustomColumns WHERE isDeleted = 0`);
        const nextOrder = maxRes.recordset[0].maxOrder + 1;
        const result = await pool.request()
            .input('columnName', sql.NVarChar, columnName.trim())
            .input('displayOrder', sql.Int, nextOrder)
            .query(`INSERT INTO FourMCustomColumns (columnName, displayOrder, isDeleted) OUTPUT INSERTED.* VALUES (@columnName, @displayOrder, 0)`);
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ message: "Insert failed", error: err.message }); }
});

router.put("/custom-columns/:id", async (req, res) => {
    const { id } = req.params;
    const { columnName } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('columnName', sql.NVarChar, columnName.trim())
            .query(`UPDATE FourMCustomColumns SET columnName = @columnName WHERE id = @id`);
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ message: "Update failed", error: err.message }); }
});

router.delete("/custom-columns/:id", async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query(`UPDATE FourMCustomColumns SET isDeleted = 1 WHERE id = @id`);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: "Delete failed" }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  RECORDS CRUD
// ══════════════════════════════════════════════════════════════════════════════
router.get("/records", async (req, res) => {
    try {
        const pool = await poolPromise;
        const recordsResult = await pool.request().query(`SELECT * FROM FourMChangeRecord ORDER BY id DESC`);
        const records = recordsResult.recordset;

        if (records.length === 0) return res.json([]);

        const ids = records.map(r => r.id).join(',');
        const valResult = await pool.request().query(`SELECT recordId, columnId, value FROM FourMCustomColumnValues WHERE recordId IN (${ids})`);

        const valMap = {};
        valResult.recordset.forEach(v => {
            if (!valMap[v.recordId]) valMap[v.recordId] = {};
            valMap[v.recordId][v.columnId] = v.value;
        });

        res.json(records.map(r => ({ ...r, customValues: valMap[r.id] || {} })));
    } catch (err) { res.status(500).json({ message: "DB error", error: err.message }); }
});

router.post("/add", async (req, res) => {
    const {
        line, partName, recordDate, shift, mcNo, type4M, description,
        firstPart, lastPart, inspFreq, retroChecking, quarantine,
        partId, internalComm, inchargeSign, customValues
    } = req.body;

    try {
        const pool = await poolPromise;
        const insertResult = await pool.request()
            .input('line', sql.VarChar, line).input('partName', sql.VarChar, partName).input('recordDate', sql.Date, recordDate)
            .input('shift', sql.VarChar, shift).input('mcNo', sql.VarChar, mcNo).input('type4M', sql.VarChar, type4M)
            .input('description', sql.NVarChar, description).input('firstPart', sql.VarChar, firstPart)
            .input('lastPart', sql.VarChar, lastPart).input('inspFreq', sql.VarChar, inspFreq)
            .input('retroChecking', sql.VarChar, retroChecking).input('quarantine', sql.VarChar, quarantine)
            .input('partId', sql.VarChar, partId).input('internalComm', sql.VarChar, internalComm).input('inchargeSign', sql.VarChar, inchargeSign)
            .query(`
                INSERT INTO FourMChangeRecord (
                  line, partName, recordDate, shift, mcNo, type4M, description, firstPart, lastPart, 
                  inspFreq, retroChecking, quarantine, partId, internalComm, inchargeSign
                ) OUTPUT INSERTED.id VALUES (
                  @line, @partName, @recordDate, @shift, @mcNo, @type4M, @description, @firstPart, @lastPart, 
                  @inspFreq, @retroChecking, @quarantine, @partId, @internalComm, @inchargeSign
                )
            `);

        const newRecordId = insertResult.recordset[0].id;

        if (customValues) {
            for (const [columnId, value] of Object.entries(customValues)) {
                if (value) {
                    await pool.request()
                        .input('recordId', sql.Int, newRecordId).input('columnId', sql.Int, parseInt(columnId)).input('value', sql.NVarChar, String(value))
                        .query(`INSERT INTO FourMCustomColumnValues (recordId, columnId, value) VALUES (@recordId, @columnId, @value)`);
                }
            }
        }
        res.json({ message: "Saved" });
    } catch (err) { res.status(500).json({ message: "Insert failed", error: err.message }); }
});

router.put("/records/:id", async (req, res) => {
    const { id } = req.params;
    const {
        mcNo, type4M, description, firstPart, lastPart, inspFreq, 
        retroChecking, quarantine, partId, internalComm, inchargeSign, customValues
    } = req.body;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id).input('mcNo', sql.VarChar, mcNo).input('type4M', sql.VarChar, type4M)
            .input('description', sql.NVarChar, description).input('firstPart', sql.VarChar, firstPart)
            .input('lastPart', sql.VarChar, lastPart).input('inspFreq', sql.VarChar, inspFreq)
            .input('retroChecking', sql.VarChar, retroChecking).input('quarantine', sql.VarChar, quarantine)
            .input('partId', sql.VarChar, partId).input('internalComm', sql.VarChar, internalComm).input('inchargeSign', sql.VarChar, inchargeSign)
            .query(`
                UPDATE FourMChangeRecord
                SET mcNo=@mcNo, type4M=@type4M, description=@description, firstPart=@firstPart, lastPart=@lastPart,
                    inspFreq=@inspFreq, retroChecking=@retroChecking, quarantine=@quarantine, partId=@partId, 
                    internalComm=@internalComm, inchargeSign=@inchargeSign
                WHERE id = @id
            `);

        if (customValues) {
            for (const [columnId, value] of Object.entries(customValues)) {
                const existing = await pool.request()
                    .input('recordId', sql.Int, id).input('columnId', sql.Int, parseInt(columnId))
                    .query(`SELECT id FROM FourMCustomColumnValues WHERE recordId = @recordId AND columnId = @columnId`);

                const vReq = pool.request().input('recordId', sql.Int, id).input('columnId', sql.Int, parseInt(columnId)).input('value', sql.NVarChar, String(value||''));
                if (existing.recordset.length > 0) {
                    await vReq.query(`UPDATE FourMCustomColumnValues SET value = @value WHERE recordId = @recordId AND columnId = @columnId`);
                } else {
                    await vReq.query(`INSERT INTO FourMCustomColumnValues (recordId, columnId, value) VALUES (@recordId, @columnId, @value)`);
                }
            }
        }
        res.json({ message: "Updated" });
    } catch (err) { res.status(500).json({ message: "Update failed", error: err.message }); }
});

router.delete("/records/:id", async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM FourMCustomColumnValues WHERE recordId = @id`);
        await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM FourMChangeRecord WHERE id = @id`);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ message: "Delete failed" }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  DYNAMIC PDF REPORT (Filtered by Date & Alignment Fixed)
// ══════════════════════════════════════════════════════════════════════════════
router.get("/report", async (req, res) => {
    try {
        const { fromDate, toDate } = req.query; 

        const pool = await poolPromise;
        const request = pool.request();
        
        let queryStr = `SELECT * FROM FourMChangeRecord`;

        if (fromDate && toDate) {
            queryStr += ` WHERE recordDate >= @fromDate AND recordDate <= @toDate`;
            request.input('fromDate', sql.Date, fromDate);
            request.input('toDate', sql.Date, toDate);
        }
        queryStr += ` ORDER BY id DESC`;

        const result = await request.query(queryStr);
        
        const colsResult = await pool.request().query(`SELECT id, columnName FROM FourMCustomColumns WHERE isDeleted = 0 ORDER BY displayOrder ASC, id ASC`);
        const customCols = colsResult.recordset;

        let customValMap = {};
        if (customCols.length > 0) {
            const vRes = await pool.request().query(`SELECT recordId, columnId, value FROM FourMCustomColumnValues`);
            vRes.recordset.forEach(v => {
                if (!customValMap[v.recordId]) customValMap[v.recordId] = {};
                customValMap[v.recordId][v.columnId] = v.value;
            });
        }

        // FIX 1: Set margins explicitly. A smaller bottom margin prevents PDFKit from auto-breaking pages early.
        const marginOptions = { top: 30, bottom: 20, left: 30, right: 30 };
        const doc = new PDFDocument({ 
            margins: marginOptions, 
            size: "A4", 
            layout: "landscape" 
        });
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=4M_Change_Report.pdf");
        doc.pipe(res);

        const topRecord = result.recordset.length > 0 ? result.recordset[0] : {};
        const headerLine = topRecord.line || "DISA - I";
        const uniquePartNames = [...new Set(result.recordset.map(r => r.partName).filter(Boolean))];
        const headerPart = uniquePartNames.join(", ") || "-";

        const startX = 30;
        const pageWidth = doc.page.width - 60; 

        // Base Headers and Weights
        const baseHeaders = ["Date /\nShift", "M/c.\nNo", "Type of\n4M", "Description", "First\nPart", "Last\nPart", "Insp.\nFreq", "Retro\nChecking", "Quarantine", "Part\nIdent.", "Internal\nComm.", "Supervisor\nSign"];
        const headers = [...baseHeaders, ...customCols.map(c => c.columnName)];

        const baseWeights = [1.5, 1, 1, 3.5, 1, 1, 1, 1.2, 1.5, 1, 1.2, 2.5];
        const customWeights = customCols.map(() => 1.5); 
        const allWeights = [...baseWeights, ...customWeights];
        const totalWeight = allWeights.reduce((sum, w) => sum + w, 0);
        const colWidths = allWeights.map(w => (w / totalWeight) * pageWidth);

        const headerFontSize = headers.length > 12 ? 6.5 : 8;
        const bodyFontSize = headers.length > 12 ? 7 : 8.5;
        const minRowHeight = 40;

        const drawHeaders = (y) => {
            doc.font("Helvetica-Bold").fontSize(16).text("4M CHANGE MONITORING CHECK SHEET", startX, y, { align: "center" });
            doc.font("Helvetica-Bold").fontSize(12)
                .text(`Line: ${headerLine}`, startX, y + 25)
                .text(`Part Name: ${headerPart}`, startX, y + 25, { align: "right", width: pageWidth });

            if (fromDate && toDate) {
                 doc.font("Helvetica").fontSize(9).text(`Filtered: ${fromDate} to ${toDate}`, startX, y + 38, { align: "center" });
            }

            const tableHeaderY = y + 50;
            let currentX = startX;
            doc.font("Helvetica-Bold").fontSize(headerFontSize);
            headers.forEach((header, i) => {
                doc.rect(currentX, tableHeaderY, colWidths[i], minRowHeight).stroke();
                doc.text(header, currentX, tableHeaderY + 8, { width: colWidths[i], align: "center" });
                currentX += colWidths[i];
            });
            return tableHeaderY + minRowHeight;
        };

        const drawFooter = () => {
            // FIX 2: Draw the footer slightly higher up, safely above the explicit 20pt bottom margin
            const footerY = doc.page.height - 35; 
            doc.font("Helvetica").fontSize(8).text("QF/07/MPD-36, Rev. No: 01, 13.03.2019", startX, footerY, { align: "left" });
            const rightX = doc.page.width - 130;
            doc.text("HOD Sign", rightX, footerY, { align: "right" });
            doc.moveTo(rightX + 20, footerY - 5).lineTo(rightX + 100, footerY - 5).stroke();
        };

        const drawCellContent = (value, x, y, width, height) => {
            const centerX = x + width / 2;
            const centerY = y + (height / 2); 
            if (value === "OK") {
                doc.save().lineWidth(1.5).moveTo(centerX - 4, centerY + 2).lineTo(centerX - 1, centerY + 6).lineTo(centerX + 6, centerY - 4).stroke().restore();
            } else if (value === "Not OK") {
                doc.save().lineWidth(1.5).moveTo(centerX - 4, centerY - 4).lineTo(centerX + 4, centerY + 4).moveTo(centerX + 4, centerY - 4).lineTo(centerX - 4, centerY + 4).stroke().restore();
            } else if (["-", "N", "I"].includes(value)) {
                doc.font("Helvetica").fontSize(10).text(value, x, y + (height/2) - 5, { width, align: "center" });
            } else {
                doc.font("Helvetica").fontSize(bodyFontSize).text(String(value || ""), x + 2, y + 5, { width: width - 4, align: "center" });
            }
        };

        let y = drawHeaders(30);

        if (result.recordset.length === 0) {
            doc.font("Helvetica-Oblique").fontSize(12).text("No records found for selected dates.", startX, y + 20, { align: "center", width: pageWidth });
        } else {
            result.recordset.forEach((row) => {
                const formattedDate = new Date(row.recordDate).toLocaleDateString("en-GB");
                const customData = customCols.map(c => customValMap[row.id]?.[c.id] || "");
                
                const rowData = [
                    `${formattedDate}\nShift ${row.shift}`, row.mcNo, row.type4M, row.description,
                    row.firstPart, row.lastPart, row.inspFreq, row.retroChecking,
                    row.quarantine, row.partId, row.internalComm, row.inchargeSign, ...customData
                ];

                let maxRowHeight = minRowHeight;
                doc.font("Helvetica").fontSize(bodyFontSize);
                
                rowData.forEach((cell, i) => {
                    if(!["OK", "Not OK"].includes(cell)) {
                        const h = doc.heightOfString(String(cell || ""), { width: colWidths[i] - 4 });
                        if (h + 15 > maxRowHeight) maxRowHeight = h + 15;
                    }
                });

                // FIX 3: Trigger the manual page break slightly earlier (65 units from bottom) to leave 
                // exactly enough room for the table to finish nicely and the footer to draw underneath it.
                if (y + maxRowHeight > doc.page.height - 65) {
                    drawFooter();
                    doc.addPage({ size: "A4", layout: "landscape", margins: marginOptions });
                    y = drawHeaders(30);
                }

                let x = startX;
                rowData.forEach((cell, i) => {
                    doc.rect(x, y, colWidths[i], maxRowHeight).stroke();
                    drawCellContent(cell, x, y, colWidths[i], maxRowHeight);
                    x += colWidths[i];
                });
                y += maxRowHeight;
            });
        }

        drawFooter(); // Make sure the final page gets its footer
        doc.end();
    } catch (err) {
        console.error("Error generating report:", err);
        res.status(500).json({ message: "Report failed" });
    }
});

module.exports = router;