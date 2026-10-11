import jsPDF from "jspdf";
import "jspdf-autotable";

// 1. Paste your Base64 string here (starting with data:image/png;base64,...)
const LOGO_BASE64 = ""; 

export const generatePDF = (patient, tests, results, useLetterhead, isPreview) => {
  const doc = new jsPDF();

  // --- Feature 4: Letterhead Generation ---
  if (useLetterhead) {
    if (LOGO_BASE64 && LOGO_BASE64.length > 100) {
      doc.addImage(LOGO_BASE64, "PNG", 14, 10, 25, 25);
    }
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("SRI BALAJI DIAGNOSTICS", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("123 Health Avenue, Medical District | Ph: +91 98765 43210", 105, 28, { align: "center" });
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 38, 196, 38);
  }

  // --- Feature 3: Patient Demographics & Clinical ID ---
  const startY = useLetterhead ? 45 : 20; 
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  doc.text(`Patient Name: ${patient.name}`, 14, startY);
  doc.text(`Age / Gender: ${patient.age || 'N/A'} Yrs / ${patient.gender || 'N/A'}`, 14, startY + 7);
  doc.text(`Contact: ${patient.phone || 'Walk-in'}`, 14, startY + 14);

  doc.text(`Clinical ID: ${patient.clinicalId || 'N/A'}`, 130, startY);
  doc.text(`Date: ${patient.date}`, 130, startY + 7);
  doc.text(`Ref Doctor: ${patient.doctorName || 'Self Walk-in'}`, 130, startY + 14);

  // --- Feature 2: Abnormal Alert Mapping ---
  const tableData = tests.map(t => {
    const res = results[t.id] || { value: "-", flag: "Normal" };
    return [t.name, res.value, res.flag === "Normal" ? "" : res.flag, t.refRange, t.unit];
  });

  doc.autoTable({
    startY: startY + 22,
    head: [["Test Description", "Result Value", "Flag", "Reference Range", "Unit"]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    didParseCell: function(data) {
      if (data.section === 'body' && (data.column.index === 1 || data.column.index === 2)) {
        const flag = tableData[data.row.index][2];
        if (flag === "High" || flag === "Low" || flag === "Critical") {
          data.cell.styles.textColor = [220, 38, 38]; // Deep Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // --- Digital Signature Block ---
  const finalY = doc.lastAutoTable.finalY + 30;
  doc.text("_________________________", 140, finalY);
  doc.text("Chief Pathologist", 148, finalY + 6);
  doc.setFontSize(8);
  doc.text("Electronically Verified Report", 146, finalY + 11);

  // --- Feature 10: Live PDF Output Handling ---
  if (isPreview) return doc.output('datauristring');
  doc.save(`${patient.clinicalId || 'Report'}_${patient.name}.pdf`);
};
