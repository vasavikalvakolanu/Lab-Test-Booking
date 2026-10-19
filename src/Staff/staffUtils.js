import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// =========================================================
// AUTO-PRELOAD PUBLIC ASSETS FROM GITHUB (/public/)
// =========================================================
let preloadedLetterhead = null;
let preloadedLogo = null;

if (typeof window !== "undefined") {
  const lhImg = new window.Image();
  lhImg.crossOrigin = "Anonymous";
  lhImg.src = "/letterhead.png";
  lhImg.onload = () => {
    if (lhImg.naturalWidth > 100) preloadedLetterhead = lhImg;
  };

  const logoImg = new window.Image();
  logoImg.crossOrigin = "Anonymous";
  logoImg.src = "/logo.png";
  logoImg.onload = () => {
    if (logoImg.naturalWidth > 50) preloadedLogo = logoImg;
  };
}

// React component to display your exact logo anywhere in portals
export function SriBalajiLogoImg({ width = 180, className = "" }) {
  return (
    <img
      src="/logo.png"
      alt="Sri Balaji Clinical Laboratory Logo"
      style={{ width: `${width}px`, height: "auto" }}
      className={`object-contain inline-block ${className}`}
    />
  );
}

// =========================================================
// MASTER LETTERHEAD DRAWER FOR JSPDF
// =========================================================
export const drawSriBalajiLetterhead = (docPdf, useLetterhead = true) => {
  if (!useLetterhead) return;

  // If letterhead.png exists in /public, stamp the exact high-res template
  if (preloadedLetterhead) {
    try {
      docPdf.addImage(preloadedLetterhead, "PNG", 0, 0, 210, 297);
      return;
    } catch (e) {
      // Fall through if any canvas taint occurs
    }
  }

  // Fallback layout if image hasn't loaded yet
  if (preloadedLogo) {
    try {
      docPdf.addImage(preloadedLogo, "PNG", 14, 8, 55, 22);
    } catch (e) {}
  }

  docPdf.setFont("times", "bold");
  docPdf.setFontSize(22);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("SRI BALAJI CLINICAL LABORATORY", 75, 18);

  docPdf.setDrawColor(197, 155, 70);
  docPdf.setLineWidth(0.5);
  docPdf.line(14, 32, 196, 32);

  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8.5);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(
    "Sathiraju Complex, Main Road, Kothapeta  •  Ph: +91 9849923729  •  Email: prasad balajilab@gmail.com",
    105,
    37,
    { align: "center" }
  );

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(10);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("TRUST  •  ACCURACY  •  CARE", 105, 288, { align: "center" });
};

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

  const dashMatch = cleanRange.match(
    /(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/i
  );
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

  const lessMatch = cleanRange.match(/<\s*=?\s*(\d+(?:\.\d+)?)/);
  if (lessMatch) {
    const max = parseFloat(lessMatch[1]);
    if (numVal > max) {
      return numVal > max * 1.5 ? "Critical" : "High";
    }
    return "Normal";
  }

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
export const generatePDF = (patient, tests, results, useLetterhead = true) => {
  const docPdf = new jsPDF();

  drawSriBalajiLetterhead(docPdf, useLetterhead);

  const startY = useLetterhead ? 48 : 20;

  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, startY - 3, 182, 19, 2, 2, "S");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9);
  docPdf.setTextColor(15, 45, 74);

  docPdf.text(`Patient Name : ${patient.name || "N/A"}`, 18, startY + 2);
  docPdf.text(
    `Age / Gender : ${patient.age || "N/A"} Yrs / ${patient.gender || "N/A"}`,
    18,
    startY + 8
  );
  docPdf.text(`Contact No   : ${patient.phone || "Walk-in"}`, 18, startY + 14);

  docPdf.text(`Clinical ID : ${patient.clinicalId || "N/A"}`, 122, startY + 2);
  docPdf.text(`Report Date : ${patient.date || "N/A"}`, 122, startY + 8);
  docPdf.text(
    `Ref. By Dr. : ${patient.doctorName || "Self Walk-in"}`,
    122,
    startY + 14
  );

  const tableRows = [];
  let lastGroup = null;

  (tests || []).forEach((t, idx) => {
    const groupName = t.parentPackage || "LABORATORY INVESTIGATION REPORT";
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
    startY: startY + 19,
    margin: { top: 48, bottom: 26, left: 14, right: 14 },
    head: [
      ["Test Description", "Result Value", "Flag", "Reference Range", "Unit"]
    ],
    body: tableRows.map((r) => r.cells),
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74], textColor: [255, 255, 255] },
    styles: {
      fillColor: false,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    didParseCell: function (data) {
      if (data.section === "body") {
        const rowMeta = tableRows[data.row.index];
        if (rowMeta && rowMeta.isHeader) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [13, 92, 133];
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
    },
    didDrawPage: function (data) {
      if (data.pageNumber > 1 && useLetterhead) {
        drawSriBalajiLetterhead(docPdf, true);
      }
    }
  });

  const finalY = Math.min(docPdf.lastAutoTable.finalY + 22, 265);
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9.5);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("_________________________", 142, finalY);
  docPdf.text("Authorized Signatory", 148, finalY + 5);
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8);
  docPdf.setTextColor(100, 116, 139);
  docPdf.text("Sri Balaji Clinical Laboratory", 146, finalY + 9.5);

  docPdf.save(`${patient.clinicalId || "Report"}_${patient.name}.pdf`);
};

// ==========================================
// PATIENT BILL / RECEIPT PDF GENERATOR
// ==========================================
export const generateBillPDF = (booking) => {
  const docPdf = new jsPDF();

  drawSriBalajiLetterhead(docPdf, true);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("PATIENT BILL / PAYMENT RECEIPT", 105, 46, { align: "center" });

  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, 50, 182, 19, 2, 2, "S");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(`Patient Name : ${booking.name || "N/A"}`, 18, 55);
  docPdf.text(
    `Age / Gender : ${booking.age || "N/A"} Yrs / ${booking.gender || "N/A"}`,
    18,
    61
  );
  docPdf.text(`Phone        : ${booking.phone || "N/A"}`, 18, 67);

  docPdf.text(
    `Receipt / ID : ${booking.clinicalId || booking.bookingRef || "N/A"}`,
    120,
    55
  );
  docPdf.text(`Date         : ${booking.date || "N/A"}`, 120, 61);
  docPdf.text(
    `Collection   : ${booking.collectionType === "home" ? "Home Visit" : "Lab Visit"}`,
    120,
    67
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
    startY: 72,
    head: [["#", "Test / Health Package Description", "Amount"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74] },
    styles: { fillColor: false, textColor: [15, 23, 42] }
  });

  const grandTotal = Number(booking.total || booking.subtotal || 0);
  const cashPaid = Number(booking.cashPaid || 0);
  const upiPaid = Number(booking.upiPaid || 0);
  const totalPaid = cashPaid + upiPaid;
  const computedBalance =
    booking.balanceDue !== undefined && booking.balanceDue !== null
      ? Number(booking.balanceDue)
      : Math.max(0, grandTotal - totalPaid);

  const summaryRows = [
    ["Subtotal", `Rs. ${booking.subtotal || grandTotal}`]
  ];
  if (Number(booking.discount || 0) > 0) {
    summaryRows.push(["Promo Discount", `- Rs. ${booking.discount}`]);
  }
  if (Number(booking.deliveryFee || 0) > 0) {
    summaryRows.push(["Home Visit Fee", `+ Rs. ${booking.deliveryFee}`]);
  }
  summaryRows.push(["Grand Total", `Rs. ${grandTotal}`]);
  summaryRows.push([
    "Amount Paid",
    `Rs. ${totalPaid} (Cash: ${cashPaid}, UPI: ${upiPaid})`
  ]);
  summaryRows.push(["Balance Due", `Rs. ${computedBalance}`]);

  docPdf.autoTable({
    startY: docPdf.lastAutoTable.finalY + 6,
    margin: { left: 110, right: 14 },
    body: summaryRows,
    theme: "plain",
    styles: {
      fontSize: 9.5,
      cellPadding: 1.8,
      textColor: [15, 45, 74]
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "right" },
      1: { fontStyle: "bold", halign: "right" }
    },
    didParseCell: function (data) {
      const label = summaryRows[data.row.index][0];
      if (label === "Grand Total") {
        data.cell.styles.fontSize = 11.5;
      }
      if (label === "Balance Due" && computedBalance > 0) {
        data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  docPdf.save(`Bill_${booking.clinicalId || "Receipt"}_${booking.name}.pdf`);
};
