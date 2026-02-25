const { sql, poolPromise } = require("../db");
const PDFDocument = require("pdfkit");

exports.getUnpouredData = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });

    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('targetDate', sql.VarChar, date);

        // Fetch aggregated data for the selected date
        const result = await request.query(`
            WITH CurrentDay AS (
                SELECT 
                    r.disa,
                    MAX(p.mouldCounterNo) AS mouldCounterClose,
                    SUM(p.produced) AS producedMould,
                    SUM(p.poured) AS pouredMould
                FROM DisamaticProductReport r
                LEFT JOIN DisamaticProduction p ON r.id = p.reportId
                WHERE r.reportDate = @targetDate
                GROUP BY r.disa
            ),
            PreviousDay AS (
                SELECT 
                    r.disa,
                    MAX(p.mouldCounterNo) AS mouldCounterOpen
                FROM DisamaticProductReport r
                LEFT JOIN DisamaticProduction p ON r.id = p.reportId
                WHERE r.reportDate < @targetDate
                GROUP BY r.disa
            ),
            DelaysData AS (
                SELECT 
                    r.disa,
                    SUM(d.durationMinutes) AS totalDelayMinutes
                FROM DisamaticProductReport r
                LEFT JOIN DisamaticDelays d ON r.id = d.reportId
                WHERE r.reportDate = @targetDate
                GROUP BY r.disa
            ),
            -- NEW: Dynamically count how many shifts ran today for each machine
            ShiftCount AS (
                SELECT 
                    disa,
                    COUNT(DISTINCT shift) AS activeShifts
                FROM DisamaticProductReport
                WHERE reportDate = @targetDate
                GROUP BY disa
            )
            SELECT 
                d.disa,
                c.mouldCounterClose,
                p.mouldCounterOpen,
                c.producedMould,
                c.pouredMould,
                del.totalDelayMinutes,
                sc.activeShifts
            FROM (VALUES ('I'), ('II'), ('III'), ('IV')) AS d(disa)
            LEFT JOIN CurrentDay c ON d.disa = c.disa
            LEFT JOIN PreviousDay p ON d.disa = p.disa
            LEFT JOIN DelaysData del ON d.disa = del.disa
            LEFT JOIN ShiftCount sc ON d.disa = sc.disa
        `);

        // Process calculations mapping to the UI format
        const responseData = result.recordset.map(row => {
            const produced = row.producedMould || 0;
            const poured = row.pouredMould || 0;
            const delaysMins = row.totalDelayMinutes || 0;
            
            const unpoured = produced - poured;
            const percentage = produced > 0 ? ((unpoured / produced) * 100).toFixed(2) : 0;
            
            // NEW: DYNAMIC RUNNING HOURS
            // Assumes 8 hours per shift. If 2 shifts ran, base is 16 hours. 
            // If activeShifts is null (machine didn't run), base is 0.
            const baseHours = (row.activeShifts || 0) * 8; 
            const runningHours = Math.max(0, baseHours - (delaysMins / 60)).toFixed(2);
            
            const producedMhr = runningHours > 0 ? (produced / runningHours).toFixed(2) : 0;
            const pouredMhr = runningHours > 0 ? (poured / runningHours).toFixed(2) : 0;

            return {
                disa: row.disa,
                mouldCounterClose: row.mouldCounterClose || "-",
                mouldCounterOpen: row.mouldCounterOpen || "-",
                producedMould: produced,
                pouredMould: poured,
                unpouredMould: unpoured,
                percentage: percentage,
                delays: delaysMins,
                producedMhr: producedMhr,
                pouredMhr: pouredMhr,
                runningHours: runningHours
            };
        });

        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error fetching unpoured data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};



exports.downloadUnpouredPDF = async (req, res) => {
    const { date } = req.query;
    
    // In a real scenario, you would extract the exact layout generation here.
    // Re-using the logic from getUnpouredData to fetch the data.
    // For brevity, this sends back a basic PDF mapping the required grid.
    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        res.setHeader("Content-Type", "application/pdf");
        
        // Error 1 Fixed: Removed escaping slashes around backticks and dollar sign
        res.setHeader("Content-Disposition", `attachment; filename="Unpoured_Mould_Details_${date}.pdf"`);
        doc.pipe(res);

        doc.font('Helvetica-Bold').fontSize(16).text("UN POURED MOULD DETAILS", { align: 'center' });
        
        // Error 2 Fixed: Removed escaping slashes around backticks and dollar sign
        doc.fontSize(12).text(`DATE: ${date}`, { align: 'center' });
        doc.moveDown(2);

        // Render PDF tables here aligning with the requested format
        // *Placeholder for PDFKit drawing lines/rectangles similar to productController*
        doc.fontSize(14).text("Report generated successfully. Expand with PDFKit grid logic as needed.", { align: 'center' });

        doc.end();
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
};