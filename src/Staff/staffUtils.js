import jsPDF from "jspdf";
import "jspdf-autotable";

const LOGO_BASE64 = "";

export const getTestKey = (t, idx) => {
  if (t && t.id) return String(t.id);
  if (t && t.name) return String(t.name).trim();
  return "test_" + idx;
};

// ==========================================
// AUTO-FLAGGING PARSER FOR LAB TECHNICIANS
// ==========================================
export const evaluateAutoFlag = (rawValue, refRange) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return "Normal";
  }
  const numVal = parseFloat(String(rawValue).replace(/,/g, "").trim());
  if (isNaN(numVal) || !refRange) return "Normal";

  const cleanRange = String(refRange).replace(/,/g, "").trim();

  // Pattern 1: "min - max" (e.g., "70 - 110" or "13.0 - 17.0")
  const dashMatch = cleanRange.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/i);
  if (dashMatch) {
    const min = parseFloat(dashMatch[1]);
    const max = parseFloat(dashMatch[2]);
    if (numVal < min) {
      return numVal < min * 0.6 ? "Critical" : "Low";
    }
    if (numVal > max) {
      return numVal > max * 1.6 ? "Critical" : "High";
    }
    return "Normal";
  }

  // Pattern 2: "< max" (e.g., "< 200")
  const lessMatch = cleanRange.match(/<\s*=?\s*(\d+(?:\.\d+)?)/);
  if (lessMatch) {
    const max = parseFloat(lessMatch[1]);
    if (numVal > max) {
      return numVal > max * 1.5 ? "Critical" : "High";
    }
    return "Normal";
  }

  // Pattern 3: "> min" (e.g., "> 40")
  const greaterMatch = cleanRange.match(/>\s*=?\s*(\d+(?:\.\d+)?)/);
  if (greaterMatch) {
    const min = parseFloat(greaterMatch[1]);
    if (numVal < min) {
      return numVal < min * 0.6 ? "Critical" : "Low";
    }
    return "Normal";
  }

  return "Normal";
};

export const buildCatalogMaps = (categories, packages) => {
  const testMap = new Map();

  (categories || []).forEach((c) => {
    const tests = c.tests || [];
    tests.forEach((t) => {
      if (t && t.name) {
        testMap.set(t.name.trim().toLowerCase(), {
          ...t,
          id: t.id ? String(t.id) : t.name.trim(),
          isPackage: false
        });
      }
    });
  });

  (packages || []).forEach((p) => {
    const tests = p.tests || [];
    tests.forEach((t) => {
      if (t && t.name && !testMap.has(t.name.trim().toLowerCase())) {
        testMap.set(t.name.trim().toLowerCase(), {
          ...t,
          id: t.id ? String(t.id) : t.name.trim(),
          isPackage: false
        });
      }
    });
  });

  const allIndividualTests = Array.from(testMap.values());
  const formattedPackages = (packages || []).map((p) => ({
    ...p,
    isPackage: true
  }));
  const allCatalogItems = [...formattedPackages, ...allIndividualTests];

  return { testMap, allCatalogItems };
};

export const expandToIndividualTests = (
  rawItems,
  packages,
  categories,
  testMap
) => {
  if (!rawItems || !Array.isArray(rawItems)) return [];
  const expanded = [];

  const processItem = (item, parentPkgName) => {
    if (!item) return;

    if (item.tests && Array.isArray(item.tests) && item.tests.length > 0) {
      item.tests.forEach((sub) =>
        processItem(sub, item.name || parentPkgName)
      );
      return;
    }

    const rawName = (item.name || "").trim();
    if (!rawName) return;

    const cleanNameLower = rawName
      .replace(/\(\d+\)/g, "")
      .trim()
      .toLowerCase();

    const matchedPkg = (packages || []).find((p) => {
      const pName = (p.name || "").trim().toLowerCase();
      return pName === rawName.toLowerCase() || pName === cleanNameLower;
    });

    if (matchedPkg && matchedPkg.tests && matchedPkg.tests.length > 0) {
      matchedPkg.tests.forEach((sub) => processItem(sub, matchedPkg.name));
      return;
    }

    const matchedCat = (categories || []).find((c) => {
      const cName = (c.categoryName || "").trim().toLowerCase();
      return cName === rawName.toLowerCase() || cName === cleanNameLower;
    });

    if (matchedCat && matchedCat.tests && matchedCat.tests.length > 0) {
      matchedCat.tests.forEach((sub) =>
        processItem(sub, matchedCat.categoryName)
      );
      return;
    }

    const catalogMatch = testMap
      ? testMap.get(rawName.toLowerCase()) || testMap.get(cleanNameLower)
      : null;
    const uniqueKey = item.id ? String(item.id) : rawName;

    expanded.push({
      ...item,
      id: uniqueKey,
      name: rawName,
      refRange:
        item.refRange || (catalogMatch ? catalogMatch.refRange : "") || "-",
      unit: item.unit || (catalogMatch ? catalogMatch.unit : "") || "",
      parentPackage: item.parentPackage || parentPkgName || ""
    });
  };

  rawItems.forEach((item) => processItem(item, ""));

  const uniqueTests = [];
  const seenNames = new Set();
  expanded.forEach((t) => {
    const key = t.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      uniqueTests.push(t);
    }
  });

  return uniqueTests;
};

// ==========================================
// CLINICAL LAB REPORT PDF GENERATOR
// ==========================================
export const generatePDF = (patient, tests, results, useLetterhead) => {
  const docPdf = new jsPDF();

  if (useLetterhead) {
    if (LOGO_BASE64 && LOGO_BASE64.length > 100) {
      docPdf.addImage(LOGO_BASE64, "PNG", 14, 10, 25, 25);
    }
    docPdf.setFontSize(20);
    docPdf.setTextColor(21, 62, 144);
    docPdf.text("SRI BALAJI DIAGNOSTICS", 105, 18, { align: "center" });
    docPdf.setFontSize(9);
    docPdf.setTextColor(100, 116, 139);
    docPdf.text(
      "Sathiraju complex, near Ganapathi Bhojanam hotel, Main road, Kothapeta | Ph: +91 9849923729",
      105,
      25,
      { align: "center" }
    );
    docPdf.setDrawColor(200, 200, 200);
    docPdf.line(14, 32, 196, 32);
  }

  const startY = useLetterhead ? 40 : 20;
  docPdf.setFontSize(10);
  docPdf.setTextColor(0, 0, 0);

  docPdf.text(`Patient Name: ${patient.name || "N/A"}`, 14, startY);
  docPdf.text(
    `Age / Gender: ${patient.age || "N/A"} Yrs / ${patient.gender || "N/A"}`,
    14,
    startY + 6
  );
  docPdf.text(`Contact: ${patient.phone || "Walk-in"}`, 14, startY + 12);

  docPdf.text(`Clinical ID: ${patient.clinicalId || "N/A"}`, 130, startY);
  docPdf.text(`Date: ${patient.date || "N/A"}`, 130, startY + 6);
  docPdf.text(
    `Ref Doctor: ${patient.doctorName || "Self Walk-in"}`,
    130,
    startY + 12
  );

  // Build rows with Profile Section Headers
  const tableRows = [];
  let lastGroup = null;

  (tests || []).forEach((t, idx) => {
    const groupName = t.parentPackage || "GENERAL BIOCHEMISTRY / PATHOLOGY";
    if (groupName !== lastGroup) {
      tableRows.push({
        isHeader: true,
        cells: [groupName.toUpperCase(), "", "", "", ""]
      });
      lastGroup = groupName;
    }

    const key = getTestKey(t, idx);
    const res = (results && (results[key] || results[t.name])) || {
      value: "-",
      flag: "Normal"
    };
    tableRows.push({
      isHeader: false,
      flag: res.flag || "Normal",
      cells: [
        t.name,
        res.value || "-",
        res.flag === "Normal" ? "" : res.flag,
        t.refRange || "-",
        t.unit || ""
      ]
    });
  });

  docPdf.autoTable({
    startY: startY + 18,
    head: [
      ["Test Description", "Result Value", "Flag", "Reference Range", "Unit"]
    ],
    body: tableRows.map((r) => r.cells),
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
    didParseCell: function (data) {
      if (data.section === "body") {
        const rowMeta = tableRows[data.row.index];
        if (rowMeta && rowMeta.isHeader) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [30, 41, 59];
          data.cell.styles.fontStyle = "bold";
        } else if (
          rowMeta &&
          (data.column.index === 1 || data.column.index === 2)
        ) {
          if (
            rowMeta.flag === "High" ||
            rowMeta.flag === "Low" ||
            rowMeta.flag === "Critical"
          ) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    }
  });

  const finalY = docPdf.lastAutoTable.finalY + 25;
  docPdf.text("_________________________", 140, finalY);
  docPdf.text("Authorized Signatory", 146, finalY + 6);
  docPdf.setFontSize(8);
  docPdf.text("Electronically Verified Report", 145, finalY + 11);

  docPdf.save(`${patient.clinicalId || "Report"}_${patient.name}.pdf`);
};

// ==========================================
// PATIENT BILL / RECEIPT PDF GENERATOR
// ==========================================
export const generateBillPDF = (booking) => {
  const docPdf = new jsPDF();

  docPdf.setFontSize(18);
  docPdf.setTextColor(21, 62, 144);
  docPdf.text("SRI BALAJI DIAGNOSTICS - PAYMENT RECEIPT", 105, 18, {
    align: "center"
  });
  docPdf.setFontSize(9);
  docPdf.setTextColor(100, 116, 139);
  docPdf.text(
    "Sathiraju complex, Main road, Kothapeta | Ph: +91 9849923729",
    105,
    24,
    { align: "center" }
  );
  docPdf.line(14, 29, 196, 29);

  docPdf.setFontSize(10);
  docPdf.setTextColor(0, 0, 0);
  docPdf.text(`Patient Name: ${booking.name || "N/A"}`, 14, 38);
  docPdf.text(
    `Age / Gender: ${booking.age || "N/A"} Yrs / ${booking.gender || "N/A"}`,
    14,
    44
  );
  docPdf.text(`Phone: ${booking.phone || "N/A"}`, 14, 50);

  docPdf.text(
    `Receipt / Clinical ID: ${booking.clinicalId || booking.bookingRef || "N/A"}`,
    125,
    38
  );
  docPdf.text(`Date: ${booking.date || "N/A"}`, 125, 44);
  docPdf.text(
    `Collection: ${booking.collectionType === "home" ? "Home Visit" : "Lab Visit"}`,
    125,
    50
  );

  const items =
    booking.cartItems && booking.cartItems.length > 0
      ? booking.cartItems
      : booking.tests || [];

  const bodyData = items.map((item, idx) => [
    idx + 1,
    item.name,
    `Rs. ${Number(item.discountedPrice || item.price || 0)}`
  ]);

  docPdf.autoTable({
    startY: 58,
    head: [["#", "Test / Health Package Description", "Amount"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [21, 62, 144] }
  });

  const y = docPdf.lastAutoTable.finalY + 10;
  const totalPaid =
    Number(booking.cashPaid || 0) + Number(booking.upiPaid || 0);

  docPdf.setFontSize(10);
  docPdf.text(`Subtotal: Rs. ${booking.subtotal || booking.total || 0}`, 135, y);
  if (Number(booking.discount || 0) > 0) {
    docPdf.text(`Discount: - Rs. ${booking.discount}`, 135, y + 6);
  }
  if (Number(booking.deliveryFee || 0) > 0) {
    docPdf.text(`Home Visit Fee: + Rs. ${booking.deliveryFee}`, 135, y + 12);
  }
  docPdf.setFontSize(12);
  docPdf.text(`Grand Total: Rs. ${booking.total || 0}`, 135, y + 20);
  docPdf.setFontSize(10);
  docPdf.text(
    `Amount Paid: Rs. ${totalPaid} (Cash: ${booking.cashPaid || 0}, UPI: ${booking.upiPaid || 0})`,
    110,
    y + 28
  );
  docPdf.text(`Balance Due: Rs. ${booking.balanceDue || 0}`, 135, y + 35);

  docPdf.save(`Bill_${booking.clinicalId || "Receipt"}_${booking.name}.pdf`);
};
