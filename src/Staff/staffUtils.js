import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

const FALLBACK_CREST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <circle cx="200" cy="200" r="186" fill="#ffffff" stroke="#0f2d4a" stroke-width="14" />
  <circle cx="200" cy="200" r="156" fill="#ffffff" stroke="#c59b46" stroke-width="5" />
  <path d="M72 172 H145 V125 H205 V315 H125 V245 H72 Z" fill="#136a94" />
  <path d="M164 62 L172 142 C174 166, 226 166, 228 142 L236 62 L221 62 L215 136 C214 150, 186 150, 185 136 L179 62 Z" fill="#cfa349" stroke="#ffffff" stroke-width="3" />
  <path d="M200 72 C192 98, 190 124, 200 139 C210 124, 208 98, 200 72 Z" fill="#dfa93a" />
  <g transform="rotate(-24 148 215)">
    <path d="M126 115 C166 145, 110 185, 150 215 C186 245, 126 285, 164 310" stroke="#0f2d4a" stroke-width="10" stroke-linecap="round" fill="none" />
    <path d="M164 115 C124 145, 180 185, 140 215 C104 245, 164 285, 126 310" stroke="#cfa349" stroke-width="10" stroke-linecap="round" fill="none" />
  </g>
  <path d="M258 164 C308 182, 312 252, 260 274" stroke="#136a94" stroke-width="20" stroke-linecap="round" fill="none" />
  <rect x="194" y="294" width="96" height="12" rx="5" fill="#0f2d4a" />
  <path d="M200 344 L214 368 L200 392 L186 368 Z" fill="#cfa349" />
</svg>`;

let letterheadDataUrl = null;
let logoDataUrl = null;
let logoWatermarkDataUrl = null;
let fallbackCrestDataUrl = null;
let fallbackWatermarkDataUrl = null;

const convertImgToDataUrl = (img, alpha = 1.0, maxDim = 1600) => {
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      maxDim / Math.max(img.naturalWidth, img.naturalHeight)
    );
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
};

if (typeof window !== "undefined") {
  const lhImg = new window.Image();
  lhImg.crossOrigin = "Anonymous";
  lhImg.onload = () => {
    if (lhImg.naturalWidth > 100) {
      letterheadDataUrl = convertImgToDataUrl(lhImg, 1.0, 2000);
    }
  };
  lhImg.src = "/letterhead.png";

  const lgImg = new window.Image();
  lgImg.crossOrigin = "Anonymous";
  lgImg.onload = () => {
    if (lgImg.naturalWidth > 50) {
      logoDataUrl = convertImgToDataUrl(lgImg, 1.0, 600);
      logoWatermarkDataUrl = convertImgToDataUrl(lgImg, 0.06, 600);
    }
  };
  lgImg.src = "/logo.png";

  const svgImg = new window.Image();
  const svgBlob = new Blob([FALLBACK_CREST_SVG], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  svgImg.onload = () => {
    fallbackCrestDataUrl = convertImgToDataUrl(svgImg, 1.0, 480);
    fallbackWatermarkDataUrl = convertImgToDataUrl(svgImg, 0.06, 600);
    URL.revokeObjectURL(svgUrl);
  };
  svgImg.src = svgUrl;
}

export function SriBalajiLogoSVG({ size = 80, width, className = "" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const finalSize = width || size;

  if (!imgFailed) {
    return (
      <img
        src="/logo.png"
        alt="Sri Balaji Clinical Laboratory"
        onError={() => setImgFailed(true)}
        style={{ width: `${finalSize}px`, height: `${finalSize}px` }}
        className={`object-contain inline-block shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: finalSize, height: finalSize }}
      className={`inline-block shrink-0 ${className}`}
      dangerouslySetInnerHTML={{
        __html: FALLBACK_CREST_SVG.replace(
          'width="400" height="400"',
          'width="100%" height="100%"'
        )
      }}
    />
  );
}

// =========================================================
// MASTER LETTERHEAD DRAWER FOR JSPDF
// =========================================================
export const drawSriBalajiLetterhead = (docPdf, useLetterhead = true) => {
  if (!useLetterhead) return;

  // Priority 1: Full-page "/letterhead.png" template
  if (letterheadDataUrl) {
    try {
      docPdf.addImage(letterheadDataUrl, "PNG", 0, 0, 210, 297);
      return;
    } catch (e) {
      console.error("Letterhead image draw error:", e);
    }
  }

  // Priority 2: Circular "/logo.png" emblem + SRI BALAJI CLINICAL LABORATORY text
  const activeCrest = logoDataUrl || fallbackCrestDataUrl;
  const activeWatermark = logoWatermarkDataUrl || fallbackWatermarkDataUrl;

  if (activeWatermark) {
    try {
      docPdf.addImage(activeWatermark, "PNG", 61, 105, 88, 88);
    } catch (e) {}
  }

  if (activeCrest) {
    try {
      docPdf.addImage(activeCrest, "PNG", 44, 8, 27, 27);
    } catch (e) {}
  }

  docPdf.setFont("times", "bold");
  docPdf.setFontSize(26);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("SRI BALAJI", 75, 21);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12);
  docPdf.setTextColor(19, 106, 148);
  docPdf.text("CLINICAL LABORATORY", 75.5, 28);

  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(0.5);
  docPdf.line(14, 39, 102, 39);
  docPdf.line(108, 39, 196, 39);

  docPdf.setFillColor(197, 155, 70);
  docPdf.triangle(103, 39, 105, 37.5, 105, 40.5, "F");
  docPdf.triangle(107, 39, 105, 37.5, 105, 40.5, "F");

  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8.8);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(
    "Sathiraju Complex, Main Road, Kothapeta  •  Ph: +91 9849923729  •  Email: prasad balajilab@gmail.com",
    105,
    44.5,
    { align: "center" }
  );

  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(1.1);
  docPdf.line(0, 286.5, 52, 286.5);
  docPdf.line(158, 286.5, 210, 286.5);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(10.5);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("TRUST  •  ACCURACY  •  CARE", 105, 287.8, { align: "center" });

  docPdf.setFillColor(197, 155, 70);
  docPdf.rect(0, 291.5, 210, 1.5, "F");
  docPdf.setFillColor(15, 45, 74);
  docPdf.rect(0, 293, 210, 4, "F");
};

export const getTestKey = (t, idx) => {
  if (t && t.id) return String(t.id);
  if (t && t.name) return String(t.name).trim();
  return "test_" + idx;
};

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

  // 62mm gives clean spacing below the letterhead contact line
  const startY = useLetterhead ? 62 : 20;

  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, startY - 4, 182, 20, 2, 2, "S");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9.5);
  docPdf.setTextColor(15, 45, 74);

  docPdf.text(`Patient Name : ${patient.name || "N/A"}`, 18, startY + 1);
  docPdf.text(
    `Age / Gender : ${patient.age || "N/A"} Yrs / ${patient.gender || "N/A"}`,
    18,
    startY + 7
  );
  docPdf.text(`Contact No   : ${patient.phone || "Walk-in"}`, 18, startY + 13);

  docPdf.text(`Clinical ID : ${patient.clinicalId || "N/A"}`, 120, startY + 1);
  docPdf.text(`Report Date : ${patient.date || "N/A"}`, 120, startY + 7);
  docPdf.text(
    `Ref. By Dr. : ${patient.doctorName || "Self Walk-in"}`,
    120,
    startY + 13
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
    startY: startY + 20,
    margin: { top: 62, bottom: 30, left: 14, right: 14 },
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
    willDrawPage: function (data) {
      if (data.pageNumber > 1 && useLetterhead) {
        drawSriBalajiLetterhead(docPdf, true);
      }
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
    }
  });

  const finalY = Math.min(docPdf.lastAutoTable.finalY + 20, 260);
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
  docPdf.setFontSize(11.5);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("PATIENT BILL / PAYMENT RECEIPT", 105, 62, { align: "center" });

  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, 65, 182, 20, 2, 2, "S");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9.5);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(`Patient Name : ${booking.name || "N/A"}`, 18, 70.5);
  docPdf.text(
    `Age / Gender : ${booking.age || "N/A"} Yrs / ${booking.gender || "N/A"}`,
    18,
    76.5
  );
  docPdf.text(`Phone        : ${booking.phone || "N/A"}`, 18, 82.5);

  docPdf.text(
    `Receipt / ID : ${booking.clinicalId || booking.bookingRef || "N/A"}`,
    120,
    70.5
  );
  docPdf.text(`Date         : ${booking.date || "N/A"}`, 120, 76.5);
  docPdf.text(
    `Collection   : ${booking.collectionType === "home" ? "Home Visit" : "Lab Visit"}`,
    120,
    82.5
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
    startY: 89,
    margin: { top: 62, bottom: 30, left: 14, right: 14 },
    head: [["#", "Test / Health Package Description", "Amount"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74] },
    styles: { fillColor: false, textColor: [15, 23, 42] },
    willDrawPage: function (data) {
      if (data.pageNumber > 1) {
        drawSriBalajiLetterhead(docPdf, true);
      }
    }
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
    margin: { left: 110, right: 14, bottom: 30 },
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
