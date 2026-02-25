const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

// ══════════════════════════════════════════════════════════════════════════════
//  CUSTOM COLUMN MANAGEMENT  (Admin only)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/disa/custom-columns
 * Get all active custom columns
 */
router.get("/custom-columns", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT id, columnName, displayOrder
            FROM DISACustomColumns
            WHERE isDeleted = 0
            ORDER BY displayOrder ASC, id ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching custom columns:", err);
        res.status(500).json({ message: "DB error", error: err.message });
    }
});

/**
 * POST /api/disa/custom-columns
 * Add a new custom column (admin only)
 */
router.post("/custom-columns", async (req, res) => {
    const { columnName } = req.body;
    if (!columnName || !columnName.trim()) {
        return res.status(400).json({ message: "Column name is required" });
    }
    try {
        const pool = await poolPromise;
        // Get max displayOrder
        const maxRes = await pool.request().query(`
            SELECT ISNULL(MAX(displayOrder), 0) AS maxOrder FROM DISACustomColumns WHERE isDeleted = 0
        `);
        const nextOrder = maxRes.recordset[0].maxOrder + 1;
        const result = await pool.request()
            .input('columnName', sql.NVarChar, columnName.trim())
            .input('displayOrder', sql.Int, nextOrder)
            .query(`
                INSERT INTO DISACustomColumns (columnName, displayOrder, isDeleted)
                OUTPUT INSERTED.id, INSERTED.columnName, INSERTED.displayOrder
                VALUES (@columnName, @displayOrder, 0)
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Error adding custom column:", err);
        res.status(500).json({ message: "Insert failed", error: err.message });
    }
});

/**
 * DELETE /api/disa/custom-columns/:id
 * Soft-delete a custom column (admin only)
 */
router.delete("/custom-columns/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query(`UPDATE DISACustomColumns SET isDeleted = 1 WHERE id = @id`);
        res.json({ message: "Custom column removed" });
    } catch (err) {
        console.error("Error deleting custom column:", err);
        res.status(500).json({ message: "Delete failed", error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CORE RECORD ROUTES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/disa/last-mould-count
 * Returns the most recent mould counter number
 */
router.get("/last-mould-count", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TOP 1 mouldCountNo 
            FROM DISASettingAdjustmentRecord
            ORDER BY id DESC
        `);
        const prev = result.recordset.length > 0 ? result.recordset[0].mouldCountNo : 0;
        res.json({ prevMouldCountNo: prev });
    } catch (err) {
        console.error("Error fetching last mould count:", err);
        res.status(500).json({ message: "DB error", error: err.message });
    }
});

/**
 * POST /api/disa/add
 * Insert a new DISA Setting Adjustment record (with optional custom column values)
 */
router.post("/add", async (req, res) => {
    const {
        recordDate,
        mouldCountNo,
        prevMouldCountNo,
        noOfMoulds,
        workCarriedOut,
        preventiveWorkCarried,
        remarks,
        customValues  // { columnId: value, ... }
    } = req.body;

    try {
        const pool = await poolPromise;

        // Insert main record and get new id
        const insertResult = await pool.request()
            .input('recordDate', sql.Date, recordDate)
            .input('mouldCountNo', sql.VarChar, String(mouldCountNo))
            .input('prevMouldCountNo', sql.VarChar, String(prevMouldCountNo))
            .input('noOfMoulds', sql.Int, noOfMoulds)
            .input('workCarriedOut', sql.NVarChar, workCarriedOut || '')
            .input('preventiveWorkCarried', sql.NVarChar, preventiveWorkCarried || '')
            .input('remarks', sql.NVarChar, remarks || '')
            .query(`
                INSERT INTO DISASettingAdjustmentRecord (
                    recordDate, mouldCountNo, prevMouldCountNo, noOfMoulds,
                    workCarriedOut, preventiveWorkCarried, remarks
                )
                OUTPUT INSERTED.id
                VALUES (
                    @recordDate, @mouldCountNo, @prevMouldCountNo, @noOfMoulds,
                    @workCarriedOut, @preventiveWorkCarried, @remarks
                )
            `);

        const newRecordId = insertResult.recordset[0].id;

        // Insert custom column values if provided
        if (customValues && typeof customValues === 'object') {
            for (const [columnId, value] of Object.entries(customValues)) {
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    await pool.request()
                        .input('recordId', sql.Int, newRecordId)
                        .input('columnId', sql.Int, parseInt(columnId))
                        .input('value', sql.NVarChar, String(value))
                        .query(`
                            INSERT INTO DISACustomColumnValues (recordId, columnId, value)
                            VALUES (@recordId, @columnId, @value)
                        `);
                }
            }
        }

        res.json({ message: "Record saved successfully", id: newRecordId });
    } catch (err) {
        console.error("Error inserting record:", err);
        res.status(500).json({ message: "Insert failed", error: err.message });
    }
});

/**
 * GET /api/disa/records
 * Fetch all DISA records with custom column values (admin view), optional date filter
 */
router.get("/records", async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const pool = await poolPromise;

        // Build base query
        let query = `
            SELECT id, recordDate, mouldCountNo, prevMouldCountNo, noOfMoulds,
                   workCarriedOut, preventiveWorkCarried, remarks
            FROM DISASettingAdjustmentRecord
        `;
        const request = pool.request();
        if (fromDate && toDate) {
            query += ` WHERE recordDate BETWEEN @fromDate AND @toDate`;
            request.input('fromDate', sql.Date, fromDate);
            request.input('toDate', sql.Date, toDate);
        }
        query += ` ORDER BY id DESC`;

        const recordsResult = await request.query(query);
        const records = recordsResult.recordset;

        if (records.length === 0) return res.json([]);

        // Fetch custom column values for all returned records
        const ids = records.map(r => r.id).join(',');
        const valResult = await pool.request().query(`
            SELECT recordId, columnId, value
            FROM DISACustomColumnValues
            WHERE recordId IN (${ids})
        `);

        // Merge custom values into each record
        const valMap = {};
        valResult.recordset.forEach(v => {
            if (!valMap[v.recordId]) valMap[v.recordId] = {};
            valMap[v.recordId][v.columnId] = v.value;
        });

        const merged = records.map(r => ({
            ...r,
            customValues: valMap[r.id] || {}
        }));

        res.json(merged);
    } catch (err) {
        console.error("Error fetching records:", err);
        res.status(500).json({ message: "DB error", error: err.message });
    }
});

/**
 * PUT /api/disa/records/:id
 * Update an existing record (including custom column values)
 */
router.put("/records/:id", async (req, res) => {
    const { id } = req.params;
    const {
        recordDate,
        mouldCountNo,
        prevMouldCountNo,
        noOfMoulds,
        workCarriedOut,
        preventiveWorkCarried,
        remarks,
        customValues  // { columnId: value, ... }
    } = req.body;

    try {
        const pool = await poolPromise;

        // Update main record
        await pool.request()
            .input('id', sql.Int, id)
            .input('recordDate', sql.Date, recordDate)
            .input('mouldCountNo', sql.VarChar, String(mouldCountNo))
            .input('prevMouldCountNo', sql.VarChar, String(prevMouldCountNo))
            .input('noOfMoulds', sql.Int, noOfMoulds)
            .input('workCarriedOut', sql.NVarChar, workCarriedOut || '')
            .input('preventiveWorkCarried', sql.NVarChar, preventiveWorkCarried || '')
            .input('remarks', sql.NVarChar, remarks || '')
            .query(`
                UPDATE DISASettingAdjustmentRecord
                SET recordDate = @recordDate,
                    mouldCountNo = @mouldCountNo,
                    prevMouldCountNo = @prevMouldCountNo,
                    noOfMoulds = @noOfMoulds,
                    workCarriedOut = @workCarriedOut,
                    preventiveWorkCarried = @preventiveWorkCarried,
                    remarks = @remarks
                WHERE id = @id
            `);

        // Upsert custom column values
        if (customValues && typeof customValues === 'object') {
            for (const [columnId, value] of Object.entries(customValues)) {
                const colId = parseInt(columnId);
                const strVal = value !== null && value !== undefined ? String(value) : '';

                // Check if value row exists
                const existing = await pool.request()
                    .input('recordId', sql.Int, id)
                    .input('columnId', sql.Int, colId)
                    .query(`SELECT id FROM DISACustomColumnValues WHERE recordId = @recordId AND columnId = @columnId`);

                if (existing.recordset.length > 0) {
                    await pool.request()
                        .input('recordId', sql.Int, id)
                        .input('columnId', sql.Int, colId)
                        .input('value', sql.NVarChar, strVal)
                        .query(`UPDATE DISACustomColumnValues SET value = @value WHERE recordId = @recordId AND columnId = @columnId`);
                } else {
                    await pool.request()
                        .input('recordId', sql.Int, id)
                        .input('columnId', sql.Int, colId)
                        .input('value', sql.NVarChar, strVal)
                        .query(`INSERT INTO DISACustomColumnValues (recordId, columnId, value) VALUES (@recordId, @columnId, @value)`);
                }
            }
        }

        res.json({ message: "Record updated successfully" });
    } catch (err) {
        console.error("Error updating record:", err);
        res.status(500).json({ message: "Update failed", error: err.message });
    }
});

/**
 * DELETE /api/disa/records/:id
 * Delete a DISA record (cascades to custom column values)
 */
router.delete("/records/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        // Custom column values cascade-deleted via FK
        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM DISASettingAdjustmentRecord WHERE id = @id`);
        res.json({ message: "Record deleted successfully" });
    } catch (err) {
        console.error("Error deleting record:", err);
        res.status(500).json({ message: "Delete failed", error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PDF REPORT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/disa/report
 * Generate & stream a PDF report of all records
 */
router.get("/report", async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT recordDate, mouldCountNo, noOfMoulds,
                   workCarriedOut, preventiveWorkCarried, remarks
            FROM DISASettingAdjustmentRecord
            ORDER BY id DESC
        `);

        // Also get custom columns for the PDF
        const colsResult = await pool.request().query(`
            SELECT id, columnName FROM DISACustomColumns WHERE isDeleted = 0 ORDER BY displayOrder ASC, id ASC
        `);
        const customCols = colsResult.recordset;

        // Get custom values if there are custom columns
        let customValMap = {};
        if (customCols.length > 0) {
            const allIds = result.recordset.map((_, i) => i); // placeholder — will use row offset
            // NOTE: For the report, we fetch by joining via recordset order
            const vRes = await pool.request().query(`
                SELECT r.id AS recordId, cv.columnId, cv.value
                FROM DISASettingAdjustmentRecord r
                INNER JOIN DISACustomColumnValues cv ON cv.recordId = r.id
                ORDER BY r.id DESC
            `);
            vRes.recordset.forEach(v => {
                if (!customValMap[v.recordId]) customValMap[v.recordId] = {};
                customValMap[v.recordId][v.columnId] = v.value;
            });
        }

        const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=DISA_Setting_Adjustment_Report.pdf");
        doc.pipe(res);

        const startX = 30;
        const startY = 30;
        const pageWidth = doc.page.width - 60;

        const baseColWidths = [80, 110, 80, 165, 165];
        const baseHeaders = ["Date", "Mould Count No.", "No. of Moulds", "Work Carried Out", "Preventive Work Carried"];

        // Add Remarks width
        let remarksWidth = 80;
        const customColWidth = Math.max(60, Math.floor((pageWidth - baseColWidths.reduce((a, b) => a + b, 0) - remarksWidth) / Math.max(customCols.length, 1)));
        const colWidths = [...baseColWidths, remarksWidth, ...customCols.map(() => customColWidth)];
        const headers = [...baseHeaders, "Remarks", ...customCols.map(c => c.columnName)];

        const logoBoxWidth = baseColWidths[0] + baseColWidths[1];
        const titleBoxWidth = pageWidth - logoBoxWidth;
        const headerHeight = 60;
        const minRowHeight = 35;

        const drawHeaders = (y) => {
            doc.rect(startX, y, logoBoxWidth, headerHeight).stroke();
            doc.rect(startX + logoBoxWidth, y, titleBoxWidth, headerHeight).stroke();

            const logoPath = path.join(__dirname, "logo.jpg");
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, startX + 15, y + 10, {
                    fit: [logoBoxWidth - 30, headerHeight - 20],
                    align: 'center', valign: 'center'
                });
            }

            doc.font("Helvetica-Bold").fontSize(18);
            doc.text("DISA SETTING ADJUSTMENT RECORD", startX + logoBoxWidth, y + 20, {
                width: titleBoxWidth, align: "center"
            });

            const tableHeaderY = y + headerHeight;
            let currentX = startX;
            doc.font("Helvetica-Bold").fontSize(9);
            headers.forEach((header, i) => {
                doc.rect(currentX, tableHeaderY, colWidths[i], minRowHeight).stroke();
                doc.text(header, currentX + 3, tableHeaderY + 10, {
                    width: colWidths[i] - 6, align: "center"
                });
                currentX += colWidths[i];
            });
            return tableHeaderY + minRowHeight;
        };

        const drawFooter = (yPos) => {
            doc.font("Helvetica").fontSize(8);
            const controlText = "QF/07/FBP-02, Rev. No.01 Dt 14.05.2025";
            const textY = yPos + 10;
            doc.text(controlText, startX, textY, { align: "left" });
            const textWidth = doc.widthOfString(controlText);
            doc.moveTo(startX, textY + 12).lineTo(startX + textWidth, textY + 12).lineWidth(1).stroke();
        };

        const processText = (text) => {
            if (!text) return "";
            if (text.includes(",") && !text.includes("•")) {
                return text.split(",").map(item => `• ${item.trim()}`).join("\n");
            }
            return text;
        };

        let y = drawHeaders(startY);

        // Need record IDs to look up custom values — re-query with id
        const resultWithId = await pool.request().query(`
            SELECT id, recordDate, mouldCountNo, noOfMoulds,
                   workCarriedOut, preventiveWorkCarried, remarks
            FROM DISASettingAdjustmentRecord
            ORDER BY id DESC
        `);

        resultWithId.recordset.forEach((row) => {
            const formattedDate = new Date(row.recordDate).toLocaleDateString("en-GB");
            const customData = customCols.map(c => customValMap[row.id]?.[c.id] || "");
            const rowData = [
                formattedDate, row.mouldCountNo, row.noOfMoulds,
                processText(row.workCarriedOut), processText(row.preventiveWorkCarried),
                row.remarks || "", ...customData
            ];

            let maxRowHeight = minRowHeight;
            doc.font("Helvetica").fontSize(9);
            rowData.forEach((cell, i) => {
                const h = doc.heightOfString(String(cell || ""), { width: colWidths[i] - 6 });
                if (h + 20 > maxRowHeight) maxRowHeight = h + 20;
            });

            if (y + maxRowHeight + 30 > doc.page.height - 30) {
                drawFooter(y);
                doc.addPage({ layout: "landscape", margin: 30 });
                y = drawHeaders(30);
            }

            let x = startX;
            rowData.forEach((cell, i) => {
                doc.rect(x, y, colWidths[i], maxRowHeight).stroke();
                doc.text(String(cell || ""), x + 3, y + 10, { width: colWidths[i] - 6, align: "center" });
                x += colWidths[i];
            });
            y += maxRowHeight;
        });

        drawFooter(y);
        doc.end();
    } catch (err) {
        console.error("Error generating DISA report:", err);
        res.status(500).json({ message: "Report generation failed" });
    }
});

module.exports = router;
