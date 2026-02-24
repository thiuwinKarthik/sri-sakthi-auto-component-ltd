const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const PDFDocument = require("pdfkit");
const path = require("path");

/**
 * GET /api/4m-change/incharges
 * Returns supervisors/admins for dropdown
 */
router.get("/incharges", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
      SELECT supervisorName AS name FROM Supervisors ORDER BY supervisorName ASC
    `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching supervisors:", err.message);
        res.status(500).json({ message: "DB error", error: err.message });
    }
});

/**
 * GET /api/4m-change/types
 * Returns 4M types from FourMTypes table
 */
router.get("/types", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT typeName FROM FourMTypes ORDER BY id ASC`);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching 4M Types:", err.message);
        // Return defaults if table missing
        res.json([
            { typeName: "Man" },
            { typeName: "Machine" },
            { typeName: "Material" },
            { typeName: "Method" }
        ]);
    }
});

/**
 * POST /api/4m-change/add
 * Insert a new 4M Change record
 */
router.post("/add", async (req, res) => {
    const {
        line, partName, recordDate, shift, mcNo, type4M, description,
        firstPart, lastPart, inspFreq, retroChecking, quarantine,
        partId, internalComm, inchargeSign
    } = req.body;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('line', sql.VarChar, line)
            .input('partName', sql.VarChar, partName)
            .input('recordDate', sql.Date, recordDate)
            .input('shift', sql.VarChar, shift)
            .input('mcNo', sql.VarChar, mcNo)
            .input('type4M', sql.VarChar, type4M)
            .input('description', sql.NVarChar, description)
            .input('firstPart', sql.VarChar, firstPart)
            .input('lastPart', sql.VarChar, lastPart)
            .input('inspFreq', sql.VarChar, inspFreq)
            .input('retroChecking', sql.VarChar, retroChecking)
            .input('quarantine', sql.VarChar, quarantine)
            .input('partId', sql.VarChar, partId)
            .input('internalComm', sql.VarChar, internalComm)
            .input('inchargeSign', sql.VarChar, inchargeSign)
            .query(`
        INSERT INTO FourMChangeRecord (
          line, partName, recordDate, shift, mcNo, type4M, description,
          firstPart, lastPart, inspFreq, retroChecking, quarantine,
          partId, internalComm, inchargeSign
        ) VALUES (
          @line, @partName, @recordDate, @shift, @mcNo, @type4M, @description,
          @firstPart, @lastPart, @inspFreq, @retroChecking, @quarantine,
          @partId, @internalComm, @inchargeSign
        )
      `);
        res.json({ message: "Record saved successfully" });
    } catch (err) {
        console.error("Error inserting record:", err);
        res.status(500).json({ message: "Insert failed", error: err.message });
    }
});

/**
 * GET /api/4m-change/report
 * Generate & stream PDF report
 */
router.get("/report", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
      SELECT * FROM FourMChangeRecord ORDER BY id DESC
    `);

        const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=4M_Change_Report.pdf");
        doc.pipe(res);

        const topRecord = result.recordset.length > 0 ? result.recordset[0] : {};
        const headerLine = topRecord.line || "DISA - I";
        const uniquePartNames = [...new Set(result.recordset.map(r => r.partName).filter(Boolean))];
        const headerPart = uniquePartNames.join(", ");

        const startX = 30;
        const colWidths = [60, 45, 45, 185, 40, 40, 40, 45, 60, 50, 60, 110];
        const rowHeight = 40;

        const headers = [
            "Date /\nShift", "M/c.\nNo", "Type of\n4M", "Description",
            "First\nPart", "Last\nPart", "Insp.\nFreq", "Retro\nChecking",
            "Quarantine", "Part\nIdent.", "Internal\nComm.", "Supervisor\nSign"
        ];

        const drawCellContent = (value, x, y, width) => {
            const centerX = x + width / 2;
            const centerY = y + 20;
            if (value === "OK") {
                doc.save().lineWidth(1.5)
                    .moveTo(centerX - 4, centerY + 2).lineTo(centerX - 1, centerY + 6).lineTo(centerX + 6, centerY - 4).stroke().restore();
            } else if (value === "Not OK") {
                doc.save().lineWidth(1.5)
                    .moveTo(centerX - 4, centerY - 4).lineTo(centerX + 4, centerY + 4)
                    .moveTo(centerX + 4, centerY - 4).lineTo(centerX - 4, centerY + 4).stroke().restore();
            } else if (["-", "N", "I"].includes(value)) {
                doc.font("Helvetica").fontSize(10).text(value, x, y + 14, { width, align: "center" });
            } else {
                doc.font("Helvetica").fontSize(9).text(String(value || ""), x + 2, y + 5, { width: width - 4, align: "center" });
            }
            doc.font("Helvetica").fontSize(10);
        };

        const drawHeaders = (y) => {
            doc.font("Helvetica-Bold").fontSize(16).text("4M CHANGE MONITORING CHECK SHEET", startX, y, { align: "center" });
            doc.font("Helvetica-Bold").fontSize(12)
                .text(`Line: ${headerLine}`, startX, y + 25)
                .text(`Part Name: ${headerPart}`, startX, y + 25, { align: "right", width: doc.page.width - 60 });

            const tableHeaderY = y + 50;
            let currentX = startX;
            doc.font("Helvetica-Bold").fontSize(9);
            headers.forEach((header, i) => {
                doc.rect(currentX, tableHeaderY, colWidths[i], rowHeight).stroke();
                doc.text(header, currentX, tableHeaderY + 8, { width: colWidths[i], align: "center" });
                currentX += colWidths[i];
            });
            return tableHeaderY + rowHeight;
        };

        let y = drawHeaders(30);

        result.recordset.forEach((row) => {
            if (y + rowHeight > doc.page.height - 50) {
                doc.addPage({ layout: "landscape", margin: 30 });
                y = drawHeaders(30);
            }
            const formattedDate = new Date(row.recordDate).toLocaleDateString("en-GB");
            const rowData = [
                `${formattedDate}\nShift ${row.shift}`,
                row.mcNo, row.type4M, row.description,
                row.firstPart, row.lastPart, row.inspFreq, row.retroChecking,
                row.quarantine, row.partId, row.internalComm, row.inchargeSign
            ];
            let x = startX;
            rowData.forEach((cell, i) => {
                doc.rect(x, y, colWidths[i], rowHeight).stroke();
                drawCellContent(cell, x, y, colWidths[i]);
                x += colWidths[i];
            });
            y += rowHeight;
        });

        const footerY = doc.page.height - 30;
        doc.font("Helvetica").fontSize(8)
            .text("QF/07/MPD-36, Rev. No: 01, 13.03.2019", startX, footerY, { align: "left" });
        const rightX = doc.page.width - 130;
        doc.text("HOD Sign", rightX, footerY, { align: "right" });
        doc.moveTo(rightX + 20, footerY - 5).lineTo(rightX + 100, footerY - 5).stroke();

        doc.end();
    } catch (err) {
        console.error("Error generating 4M report:", err);
        res.status(500).json({ message: "Report generation failed" });
    }
});

module.exports = router;
