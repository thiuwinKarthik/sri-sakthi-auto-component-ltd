import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Utility for Formatting ---
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB');
};

const getReportMonthYear = (fromDate) => {
    const d = new Date(fromDate);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
};

// --- 1. UnPoured Mould Details ---
export const generateUnPouredMouldPDF = (data, dateRange) => {
    const doc = new jsPDF('l', 'mm', 'a4');

    // Group by RecordDate safely
    const groupedByDate = {};
    data.forEach(row => {
        const dateKey = String(row.RecordDate).split('T')[0];
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = { 1: {}, 2: {}, 3: {} };
        groupedByDate[dateKey][row.Shift] = row;
    });

    const dates = Object.keys(groupedByDate).sort();

    if (dates.length === 0) {
        doc.setFontSize(14);
        doc.text("No data found for the selected date range.", 148.5, 40, { align: 'center' });
        doc.save(`UnPouredMouldDetails_${dateRange.from}_to_${dateRange.to}.pdf`);
        return;
    }

    dates.forEach((dateKey, pageIndex) => {
        if (pageIndex > 0) doc.addPage();

        const shiftsData = groupedByDate[dateKey];
        // Ensure DisaMachine consistency; taking first available
        const disa = shiftsData[1]?.DisaMachine || shiftsData[2]?.DisaMachine || shiftsData[3]?.DisaMachine || 'DISA - I';

        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
        doc.text("UN POURED MOULD DETAILS", 148.5, 15, { align: 'center' });

        doc.setFontSize(11);
        doc.text(` ${disa}`, 8, 25);
        doc.text(`DATE: ${formatDate(dateKey)}`, 289 - doc.getTextWidth(`DATE: ${formatDate(dateKey)}`) - 8, 25);

        const columns = [
            { key: 'PatternChange', label: 'PATTERN\nCHANGE' },
            { key: 'HeatCodeChange', label: 'HEAT CODE\nCHANGE' },
            { key: 'MouldBroken', label: 'MOULD\nBROKEN' },
            { key: 'AmcCleaning', label: 'AMC\nCLEANING' },
            { key: 'MouldCrush', label: 'MOULD\nCRUSH' },
            { key: 'CoreFalling', label: 'CORE\nFALLING' },
            { key: 'SandDelay', label: 'SAND\nDELAY' },
            { key: 'DrySand', label: 'DRY\nSAND' },
            { key: 'NozzleChange', label: 'NOZZLE\nCHANGE' },
            { key: 'NozzleLeakage', label: 'NOZZLE\nLEAKAGE' },
            { key: 'SpoutPocking', label: 'SPOUT \nPOCKING' },
            { key: 'StRod', label: 'S/T ROD\nCHANGE' },
            { key: 'QcVent', label: 'QC VENT/\nSLAG' },
            { key: 'OutMould', label: 'OUT\nMOULD' },
            { key: 'LowMg', label: 'LOW\nMg' },
            { key: 'GradeChange', label: 'GRADE\nCHANGE' },
            { key: 'MsiProblem', label: 'MSI\nPROBLEM' },
            { key: 'BrakeDown', label: 'BRAKE\nDOWN' },
            { key: 'Wom', label: 'W/O M' },
            { key: 'DevTrail', label: 'DEV/\nTRAIL' },
            { key: 'PowerCut', label: 'POWER\nCUT' },
            { key: 'PlannedOff', label: 'PLANNED\nOFF' },
            { key: 'VatCleaning', label: 'VAT\nCLEANING' },
            { key: 'Others', label: 'OTHERS' }
        ];

        const headRow1 = [
            { content: 'SHIFT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'MOULDING', colSpan: 6, styles: { halign: 'center' } },
            { content: 'SAND PLANT', colSpan: 2, styles: { halign: 'center' } },
            { content: 'PREESPOUR', colSpan: 4, styles: { halign: 'center' } },
            { content: 'QUALITY CONTROL', colSpan: 5, styles: { halign: 'center' } },
            { content: 'MAINTENANCE', colSpan: 1, styles: { halign: 'center' } },
            { content: 'FURNACE', colSpan: 1, styles: { halign: 'center' } },
            { content: 'TOOLING', colSpan: 1, styles: { halign: 'center' } },
            { content: 'OTHERS', colSpan: 4, styles: { halign: 'center' } },
            { content: 'TOTAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [220, 220, 220] } }
        ];

        const headRow2 = columns.map(col => ({ content: col.label, styles: { halign: 'center', valign: 'middle', fontSize: 5.5 } }));

        const bodyRows = [1, 2, 3].map(shift => {
            const row = [shift.toString()];
            columns.forEach(col => {
                const val = shiftsData[shift]?.[col.key];
                row.push(val === '' || val === null || val === undefined ? '-' : val.toString());
            });
            const rowTotal = shiftsData[shift]?.RowTotal || '-';
            row.push(rowTotal.toString());
            return row;
        });

        // Calculate Totals purely from data provided for this page
        const getColTotal = (key) => [1, 2, 3].reduce((sum, shift) => sum + (parseInt(shiftsData[shift]?.[key]) || 0), 0);

        const totalRow = ['TOTAL'];
        columns.forEach(col => {
            const colTotal = getColTotal(col.key);
            totalRow.push(colTotal === 0 ? '-' : colTotal.toString());
        });
        const grandTotal = [1, 2, 3].reduce((sum, s) => sum + (parseInt(shiftsData[s]?.RowTotal) || 0), 0);
        totalRow.push(grandTotal === 0 ? '-' : grandTotal.toString());
        bodyRows.push(totalRow);

        autoTable(doc, {
            startY: 32, margin: { left: 5, right: 5 }, head: [headRow1, headRow2], body: bodyRows, theme: 'grid',
            styles: { fontSize: 8, cellPadding: { top: 3.5, right: 1, bottom: 3.5, left: 1 }, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', minCellHeight: 12 },
            bodyStyles: { minCellHeight: 10 },
            didParseCell: function (data) {
                if (data.section === 'body' && data.row.index === bodyRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });
    });

    doc.save(`UnPoured_Mould_Details_Bulk_${dateRange.from}_to_${dateRange.to}.pdf`);
};

// --- 2. DISA Setting Parameters ---
export const generateDmmSettingPDF = (data, dateRange) => {
    const doc = new jsPDF('l', 'mm', 'a4');

    // Group by Date and then Machine
    const groupedByDateAndMachine = {};
    data.forEach(row => {
        const dateKey = String(row.RecordDate).split('T')[0];
        const machine = row.DisaMachine;
        if (!groupedByDateAndMachine[dateKey]) groupedByDateAndMachine[dateKey] = {};
        if (!groupedByDateAndMachine[dateKey][machine]) groupedByDateAndMachine[dateKey][machine] = {};
        if (!groupedByDateAndMachine[dateKey][machine][row.Shift]) groupedByDateAndMachine[dateKey][machine][row.Shift] = [];

        groupedByDateAndMachine[dateKey][machine][row.Shift].push(row);
    });

    const dates = Object.keys(groupedByDateAndMachine).sort();
    if (dates.length === 0) {
        doc.setFontSize(14); doc.text("No data found for the selected date range.", 148.5, 40, { align: 'center' });
        doc.save(`DMM_Setting_Bulk_${dateRange.from}_to_${dateRange.to}.pdf`);
        return;
    }

    let isFirstPage = true;

    dates.forEach(dateKey => {
        const machinesForDate = Object.keys(groupedByDateAndMachine[dateKey]).sort();

        machinesForDate.forEach(machine => {
            if (!isFirstPage) doc.addPage();
            isFirstPage = false;

            const shiftsData = groupedByDateAndMachine[dateKey][machine];

            // Reconstruct Meta info based on first row of each shift
            const shiftsMeta = { 1: {}, 2: {}, 3: {} };
            [1, 2, 3].forEach(shift => {
                const firstRow = shiftsData[shift]?.[0] || {};
                shiftsMeta[shift] = {
                    operator: firstRow.OperatorName || '',
                    supervisor: firstRow.SupervisorName || '',
                    isIdle: firstRow.IsIdle === true || firstRow.IsIdle === 1
                };
            });

            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text("SAKTHI AUTO COMPONENT LIMITED", 148.5, 10, { align: 'center' });
            doc.setFontSize(16); doc.text("DMM SETTING PARAMETERS CHECK SHEET", 148.5, 18, { align: 'center' });

            doc.setFontSize(10); doc.setFont('helvetica', 'normal');
            doc.text(` ${machine}`, 10, 28);
            doc.text(`DATE: ${formatDate(dateKey)}`, 280, 28, { align: 'right' });

            autoTable(doc, {
                startY: 32, margin: { left: 10, right: 10 },
                head: [['SHIFT', 'OPERATOR NAME', 'VERIFIED BY', 'SIGNATURE']],
                body: [
                    ['SHIFT I', shiftsMeta[1].operator || '-', shiftsMeta[1].supervisor || '-', ''],
                    ['SHIFT II', shiftsMeta[2].operator || '-', shiftsMeta[2].supervisor || '-', ''],
                    ['SHIFT III', shiftsMeta[3].operator || '-', shiftsMeta[3].supervisor || '-', '']
                ],
                theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', valign: 'middle' },
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            let currentY = doc.lastAutoTable.finalY + 8;

            const columns = [
                { key: 'Customer', label: 'CUSTOMER' }, { key: 'ItemDescription', label: 'ITEM DESCRIPTION' }, { key: 'Time', label: 'TIME' },
                { key: 'PpThickness', label: 'PP\nTHICKNESS' }, { key: 'PpHeight', label: 'PP\nHEIGHT' },
                { key: 'SpThickness', label: 'SP\nTHICKNESS' }, { key: 'SpHeight', label: 'SP\nHEIGHT' },
                { key: 'CoreMaskOut', label: 'CORE MASK\n(OUT)' }, { key: 'CoreMaskIn', label: 'CORE MASK\n(IN)' },
                { key: 'SandShotPressure', label: 'SAND SHOT\nPRESSURE' }, { key: 'CorrectionShotTime', label: 'CORRECTION\nSHOT TIME' },
                { key: 'SqueezePressure', label: 'SQUEEZE\nPRESSURE' }, { key: 'PpStripAccel', label: 'PP STRIP\nACCEL' },
                { key: 'PpStripDist', label: 'PP STRIP\nDIST' }, { key: 'SpStripAccel', label: 'SP STRIP\nACCEL' },
                { key: 'SpStripDist', label: 'SP STRIP\nDIST' }, { key: 'MouldThickness', label: 'MOULD\nTHICKNESS' },
                { key: 'CloseUpForce', label: 'CLOSE UP\nFORCE' }, { key: 'Remarks', label: 'REMARKS' }
            ];

            [1, 2, 3].forEach((shift, index) => {
                const isIdle = shiftsMeta[shift].isIdle;
                const shiftLabel = shift === 1 ? 'I' : shift === 2 ? 'II' : 'III';

                const tableHeader = [
                    [{ content: `SHIFT ${shiftLabel}`, colSpan: columns.length + 1, styles: { halign: 'center', fontStyle: 'bold', fillColor: [200, 200, 200], textColor: [0, 0, 0] } }],
                    [{ content: 'S.No', styles: { cellWidth: 8 } }, ...columns.map(col => ({ content: col.label, styles: { cellWidth: 'wrap' } }))]
                ];

                let tableBody = [];
                if (isIdle) {
                    tableBody.push([{ content: 'L I N E   I D L E', colSpan: columns.length + 1, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 14, textColor: [100, 100, 100], fillColor: [245, 245, 245], minCellHeight: 15 } }]);
                } else {
                    const shiftRows = shiftsData[shift] || [];
                    tableBody = shiftRows.map((row, idx) => {
                        const pdfRow = [(idx + 1).toString()];
                        columns.forEach(col => {
                            const val = row[col.key];
                            pdfRow.push(val === '' || val === null || val === undefined ? '-' : val.toString());
                        });
                        return pdfRow;
                    });
                }

                autoTable(doc, {
                    startY: currentY, margin: { left: 5, right: 5 }, head: tableHeader, body: tableBody, theme: 'grid',
                    styles: { fontSize: 5.5, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
                    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 5 },
                    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 25 }, 2: { cellWidth: 28 }, 19: { cellWidth: 'auto' } }
                });

                currentY = doc.lastAutoTable.finalY + 5;
            });

            doc.setFontSize(8); doc.text("QF/07/FBP-13, Rev.No:06 dt 08.10.2025", 10, 200);
        });
    });

    doc.save(`DMM_Setting_Parameters_Bulk_${dateRange.from}_to_${dateRange.to}.pdf`);
};

// --- 3 & 4. DISA Operator / LPA Checking Generic ---
// Because these span up to 31 columns, aggregating across date ranges requires matching the standard 1-31 month layout.
export const generateChecklistPDF = (data, dateRange, title1, title2) => {
    const doc = new jsPDF('l', 'mm', 'a4');

    // Safety check
    if (!data.trans || data.trans.length === 0) {
        doc.setFontSize(14); doc.text("No data found for the selected date range.", 148.5, 40, { align: 'center' });
        doc.save(`${title1}_Bulk_${dateRange.from}_to_${dateRange.to}.pdf`);
        return;
    }

    // Group trans data strictly by DisaMachine to separate pages properly
    const machines = [...new Set(data.trans.map(t => t.DisaMachine))].sort();
    let isFirstPage = true;

    machines.forEach(machine => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        const machineTrans = data.trans.filter(t => t.DisaMachine === machine);
        const machineNc = data.ncr ? data.ncr.filter(n => n.DisaMachine === machine) : [];

        // Build histories
        const historyMap = {};
        const holidayDays = new Set();
        const vatDays = new Set();
        const naDays = new Set(); // For LPA
        const operatorMap = {};

        // Let's gather the checklist structure inherently from the first available day's mappings
        const checklistMaster = [];
        const masterSet = new Set();

        machineTrans.forEach(log => {
            const dateObj = new Date(log.LogDate);
            const logDay = dateObj.getDate();
            const key = String(log.MasterId);

            if (!masterSet.has(key)) {
                masterSet.add(key);
                checklistMaster.push({
                    MasterId: key,
                    SlNo: log.SlNo,
                    CheckPointDesc: log.CheckPointDesc,
                    CheckMethod: log.CheckMethod || 'VISUAL/VERIFICATION'
                });
            }

            if (log.IsHoliday == 1) holidayDays.add(logDay);
            if (log.IsVatCleaning == 1) vatDays.add(logDay);
            if (log.IsNa == 1) naDays.add(logDay); // specific to LPA

            operatorMap[logDay] = log.Sign || '';

            if (!historyMap[key]) historyMap[key] = {};
            if (log.ReadingValue) historyMap[key][logDay] = log.ReadingValue;
            else historyMap[key][logDay] = log.IsDone == 1 ? 'Y' : 'N';
        });

        checklistMaster.sort((a, b) => a.SlNo - b.SlNo);

        doc.setLineWidth(0.3);
        doc.rect(10, 10, 40, 20); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text("SAKTHI", 30, 18, { align: 'center' }); doc.text("AUTO", 30, 26, { align: 'center' });
        doc.rect(50, 10, 180, 20); doc.setFontSize(16);
        doc.text(title1, 140, 22, { align: 'center' });
        doc.rect(230, 10, 57, 20); doc.setFontSize(11);
        doc.text(`${machine}`, 258, 18, { align: 'center' });
        doc.line(230, 22, 287, 22);
        doc.setFontSize(10); doc.text(`Month: ${getReportMonthYear(dateRange.from)}`, 235, 27);

        const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

        const tableBody = checklistMaster.map((item, rowIndex) => {
            const row = [String(item.SlNo), item.CheckPointDesc, item.CheckMethod];
            for (let i = 1; i <= 31; i++) {
                if (holidayDays.has(i)) {
                    if (rowIndex === 0) row.push({ content: 'H\nO\nL\nI\nD\nA\nY', rowSpan: checklistMaster.length, styles: { halign: 'center', valign: 'middle', fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [100, 100, 100] } });
                } else if (vatDays.has(i)) {
                    if (rowIndex === 0) row.push({ content: 'V\nA\nT\nC\nL\nE\nA\nN\nI\nN\nG', rowSpan: checklistMaster.length, styles: { halign: 'center', valign: 'middle', fillColor: [210, 230, 255], fontStyle: 'bold', textColor: [50, 100, 150] } });
                } else if (naDays.has(i)) {
                    if (rowIndex === 0) row.push({ content: 'N\n/\nA', rowSpan: checklistMaster.length, styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 200], fontStyle: 'bold', textColor: [150, 150, 0] } });
                } else {
                    row.push(historyMap[item.MasterId]?.[i] || '');
                }
            }
            return row;
        });

        const emptyDays = Array(31).fill("");
        const operatorRow = ["", "NAME", ""];
        for (let i = 1; i <= 31; i++) {
            if (holidayDays.has(i) || vatDays.has(i) || naDays.has(i)) operatorRow.push("");
            else {
                let r = operatorMap[i] || "";
                operatorRow.push(r.substring(0, 6) + (r.length > 6 ? '\n' + r.substring(6, 12) : ''));
            }
        }

        const footerRows = [["", "SIGNATURE", "", ...emptyDays], operatorRow, ["", "HOD", "", ...emptyDays]];
        const dynamicColumnStyles = {};
        for (let i = 3; i < 34; i++) { dynamicColumnStyles[i] = { cellWidth: 5, halign: 'center' }; }

        autoTable(doc, {
            startY: 35,
            head: [['Sl.No', 'CHECK POINTS', 'CHECK METHOD', ...days]],
            body: [...tableBody, ...footerRows],
            theme: 'grid', styles: { fontSize: 6, cellPadding: 0.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'middle' },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
            columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 55 }, 2: { cellWidth: 20 }, ...dynamicColumnStyles },
            didParseCell: function (data) {
                if (data.row.index >= tableBody.length && data.column.index === 1) data.cell.styles.fontStyle = 'bold';
                if (data.column.index > 2) {
                    const text = data.cell.text?.[0] || '';
                    if (data.row.index === tableBody.length + 1) { data.cell.styles.fontSize = 3.5; data.cell.styles.halign = 'center'; }
                    else if (data.row.index < tableBody.length) {
                        if (text === 'Y') { data.cell.styles.font = 'ZapfDingbats'; data.cell.text = '3'; data.cell.styles.textColor = [0, 100, 0]; }
                        else if (text === 'N') { data.cell.styles.textColor = [255, 0, 0]; data.cell.text = 'X'; data.cell.styles.fontStyle = 'bold'; }
                    }
                }
            }
        });

        doc.setFontSize(8); doc.text("QF/07/FBP-13, Rev.No:06 dt 08.10.2025", 10, 200);

        // PAGE 2 For NC Reports
        if (machineNc.length > 0) {
            doc.addPage();
            doc.setLineWidth(0.3);
            doc.rect(10, 10, 40, 20); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text("SAKTHI", 30, 18, { align: 'center' }); doc.text("AUTO", 30, 26, { align: 'center' });
            doc.rect(50, 10, 237, 20); doc.setFontSize(16);
            doc.text(title2, 168, 18, { align: 'center' }); doc.setFontSize(14);
            doc.text("Non-Conformance Report", 168, 26, { align: 'center' });

            const ncRows = machineNc.map((report, index) => [
                index + 1, formatDate(report.ReportDate), report.NonConformityDetails || '', report.Correction || '',
                report.RootCause || '', report.CorrectiveAction || '', report.TargetDate ? formatDate(report.TargetDate) : '',
                report.Responsibility || '', report.Sign || '', report.Status || ''
            ]);

            autoTable(doc, {
                startY: 35, head: [['S.No', 'Date', 'Non-Conformities Details', 'Correction', 'Root Cause', 'Corrective Action', 'Target Date', 'Responsibility', 'Name', 'Status']],
                body: ncRows, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'top', overflow: 'linebreak' },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 40 }, 3: { cellWidth: 35 }, 4: { cellWidth: 35 }, 5: { cellWidth: 35 }, 6: { cellWidth: 20, halign: 'center' }, 7: { cellWidth: 25 }, 8: { cellWidth: 20 }, 9: { cellWidth: 20, halign: 'center' } }
            });
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text("QF/07/FBP-13, Rev.No:06 dt 08.10.2025", 10, 200);
        }
    });

    const safeTitle = title1.replace(/\\s+/g, '_');
    doc.save(`${safeTitle}_Bulk_${dateRange.from}_to_${dateRange.to}.pdf`);
};

// --- 5. Error Proof Verification ---
export const generateErrorProofPDF = (data, dateRange) => {
    const doc = new jsPDF('l', 'mm', 'a4');

    if (!data.verifications || data.verifications.length === 0) {
        doc.setFontSize(14); doc.text("No data found for the selected date range.", 148.5, 40, { align: 'center' });
        doc.save(`ErrorProof_Bulk_${dateRange.from}_to_${dateRange.to}.pdf`);
        return;
    }

    const groupedByDateAndMachine = {};
    data.verifications.forEach(row => {
        const dateKey = String(row.RecordDate).split('T')[0];
        const machine = row.DisaMachine;
        if (!groupedByDateAndMachine[dateKey]) groupedByDateAndMachine[dateKey] = {};
        if (!groupedByDateAndMachine[dateKey][machine]) groupedByDateAndMachine[dateKey][machine] = { v: [], r: [] };
        groupedByDateAndMachine[dateKey][machine].v.push(row);
    });

    data.plans.forEach(plan => {
        const assocV = data.verifications.find(v => v.Id === plan.VerificationId);
        if (assocV) {
            const dateKey = String(assocV.RecordDate).split('T')[0];
            const machine = assocV.DisaMachine;
            if (groupedByDateAndMachine[dateKey] && groupedByDateAndMachine[dateKey][machine]) {
                groupedByDateAndMachine[dateKey][machine].r.push(plan);
            }
        }
    });

    let isFirstPage = true;
    Object.keys(groupedByDateAndMachine).sort().forEach(dateKey => {
        Object.keys(groupedByDateAndMachine[dateKey]).sort().forEach(machine => {
            if (!isFirstPage) doc.addPage();
            isFirstPage = false;

            const records = groupedByDateAndMachine[dateKey][machine];
            const headerData = { date: dateKey, disaMachine: machine, reviewedBy: records.v[0]?.ReviewedByHOF || '', approvedBy: records.v[0]?.ApprovedBy || '' };

            doc.setLineWidth(0.3);
            doc.rect(10, 10, 40, 20); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text("SAKTHI", 30, 18, { align: 'center' }); doc.text("AUTO", 30, 26, { align: 'center' });
            doc.rect(50, 10, 180, 20); doc.setFontSize(16);
            doc.text("ERROR PROOF VERIFICATION REPORT", 140, 22, { align: 'center' });
            doc.rect(230, 10, 57, 20); doc.setFontSize(11);
            doc.text(`${machine}`, 258, 18, { align: 'center' });
            doc.line(230, 22, 287, 22);
            doc.setFontSize(10); doc.text(`DATE: ${formatDate(dateKey)}`, 235, 27);

            const vRows = records.v.map((item, index) => [
                index + 1, item.Line, item.ErrorProofName, item.NatureOfErrorProof, item.Frequency,
                item.Date1_Shift1_Res === 1 ? 'OK' : item.Date1_Shift1_Res === 0 ? 'NOT OK' : '-',
                item.Date1_Shift2_Res === 1 ? 'OK' : item.Date1_Shift2_Res === 0 ? 'NOT OK' : '-',
                item.Date1_Shift3_Res === 1 ? 'OK' : item.Date1_Shift3_Res === 0 ? 'NOT OK' : '-'
            ]);

            autoTable(doc, {
                startY: 35,
                head: [[{ content: 'S.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Line', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Error Proof Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Nature of Error Proof', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Frequency', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Verification Result', colSpan: 3, styles: { halign: 'center' } }], ['I - Shift', 'II - Shift', 'III - Shift']],
                body: vRows, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'middle' },
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontStyle: 'bold' }
            });

            let currentY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text("Reaction Plan", 148.5, currentY, { align: 'center' });
            currentY += 5;

            const rRows = records.r.map((item, index) => [index + 1, item.ErrorProofNo, item.ErrorProofName, item.VerificationDateShift, item.Problem, item.RootCause, item.CorrectiveAction, item.Status, item.Remarks]);
            autoTable(doc, {
                startY: currentY,
                head: [['S.No', 'Ep.No', 'Error Proof Name', 'Verification \n Date & Shift', 'Problem', 'Root Cause', 'Corrective action taken \n (Temporary)', 'Status', 'Remarks']],
                body: rRows, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 15 }, 2: { cellWidth: 35 }, 3: { cellWidth: 25 }, 4: { cellWidth: 35 }, 5: { cellWidth: 35 }, 6: { cellWidth: 40 }, 7: { cellWidth: 20 }, 8: { cellWidth: 20 } }
            });

            currentY = doc.lastAutoTable.finalY + 15;
            autoTable(doc, {
                startY: currentY, margin: { left: 10, right: 10 }, head: [['REVIEWED BY HOF', 'APPROVED BY']], body: [[headerData.reviewedBy || '', headerData.approvedBy || '']], theme: 'grid',
                styles: { fontSize: 10, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', minCellHeight: 15 }, headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text("QF/07/FBP-13, Rev.No:06 dt 08.10.2025", 10, 200);
        });
    });

    doc.save(`ErrorProof_Verification_Bulk_${dateRange.from}_to_${dateRange.to}.pdf`);
};
