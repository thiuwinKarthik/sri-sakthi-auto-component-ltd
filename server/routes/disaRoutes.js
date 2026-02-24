const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

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
 * Insert a new DISA Setting Adjustment record
 */
router.post("/add", async (req, res) => {
    const {
        recordDate,
        mouldCountNo,
        prevMouldCountNo,
        noOfMoulds,
        workCarriedOut,
        preventiveWorkCarried,
        remarks
    } = req.body;

    try {
        const pool = await poolPromise;
        await pool.request()
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
        ) VALUES (
          @recordDate, @mouldCountNo, @prevMouldCountNo, @noOfMoulds,
          @workCarriedOut, @preventiveWorkCarried, @remarks
        )
      `);
        res.json({ message: "Record saved successfully" });
    } catch (err) {
        console.error("Error inserting record:", err);
        res.status(500).json({ message: "Insert failed", error: err.message });
    }
});

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

        const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=DISA_Setting_Adjustment_Report.pdf");
        doc.pipe(res);

        const startX = 30;
        const startY = 30;
        const pageWidth = doc.page.width - 60;

        const colWidths = [80, 110, 80, 200, 200, pageWidth - 670];
        const logoBoxWidth = colWidths[0] + colWidths[1];
        const titleBoxWidth = pageWidth - logoBoxWidth;
        const headerHeight = 60;
        const minRowHeight = 35;

        const headers = [
            "Date", "Mould Count No.", "No. of Moulds",
            "Work Carried Out", "Preventive Work Carried", "Remarks"
        ];

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
            doc.font("Helvetica-Bold").fontSize(10);
            headers.forEach((header, i) => {
                doc.rect(currentX, tableHeaderY, colWidths[i], minRowHeight).stroke();
                doc.text(header, currentX + 5, tableHeaderY + 12, {
                    width: colWidths[i] - 10, align: "center"
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

        result.recordset.forEach((row) => {
            const formattedDate = new Date(row.recordDate).toLocaleDateString("en-GB");
            const rowData = [
                formattedDate, row.mouldCountNo, row.noOfMoulds,
                processText(row.workCarriedOut), processText(row.preventiveWorkCarried), row.remarks
            ];

            let maxRowHeight = minRowHeight;
            doc.font("Helvetica").fontSize(10);
            rowData.forEach((cell, i) => {
                const textHeight = doc.heightOfString(String(cell || ""), { width: colWidths[i] - 10 });
                if (textHeight + 20 > maxRowHeight) maxRowHeight = textHeight + 20;
            });

            if (y + maxRowHeight + 30 > doc.page.height - 30) {
                drawFooter(y);
                doc.addPage({ layout: "landscape", margin: 30 });
                y = drawHeaders(30);
            }

            let x = startX;
            rowData.forEach((cell, i) => {
                doc.rect(x, y, colWidths[i], maxRowHeight).stroke();
                doc.text(String(cell || ""), x + 5, y + 10, { width: colWidths[i] - 10, align: "center" });
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
