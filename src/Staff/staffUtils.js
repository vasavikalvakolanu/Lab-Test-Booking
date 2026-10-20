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

let logoDataUrl = null;
let logoWatermarkDataUrl = null;
let fallbackCrestDataUrl = null;
let fallbackWatermarkDataUrl = null;

const convertCrestToDataUrl = (img, alpha = 1.0, targetSize = 600) => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");
    ctx.globalAlpha = alpha;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const sourceSize = w > h * 1.35 ? h : Math.min(w, h);
    ctx.drawImage(
      img,
      0,
      0,
      sourceSize,
      sourceSize,
      0,
      0,
      targetSize,
      targetSize
    );
    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
};

if (typeof window !== "undefined") {
  const lgImg = new window.Image();
  lgImg.crossOrigin = "Anonymous";
  lgImg.onload = () => {
    if (lgImg.naturalWidth > 40) {
      logoDataUrl = convertCrestToDataUrl(lgImg, 1.0, 600);
      logoWatermarkDataUrl = convertCrestToDataUrl(lgImg, 0.03, 700);
    }
  };
  lgImg.src = "/logo.png";

  const svgImg = new window.Image();
  const svgBlob = new Blob([FALLBACK_CREST_SVG], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  svgImg.onload = () => {
    fallbackCrestDataUrl = convertCrestToDataUrl(svgImg, 1.0, 480);
    fallbackWatermarkDataUrl = convertCrestToDataUrl(svgImg, 0.03, 600);
    URL.revokeObjectURL(svgUrl);
  };
  svgImg.src = svgUrl;
}

// =========================================================
// REACT COMPONENT EXPORT (FIXES BUILD ERROR)
// =========================================================
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
// DIRECT IN-PORTAL PRINT ENGINE (NO DOWNLOAD REQUIRED)
// =========================================================
const triggerDirectBrowserPrint = (docPdf) => {
  try {
    docPdf.autoPrint();
    const blob = docPdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);

    let printFrame = document.getElementById("sbd_direct_print_frame");
    if (printFrame) {
      document.body.removeChild(printFrame);
    }

    printFrame = document.createElement("iframe");
    printFrame.id = "sbd_direct_print_frame";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.src = blobUrl;

    printFrame.onload = () => {
      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (err) {
          window.open(blobUrl, "_blank");
        }
      }, 250);
    };

    document.body.appendChild(printFrame);
  } catch (error) {
    console.error("Direct print error:", error);
    const fallbackUrl = docPdf.output("bloburl");
    window.open(fallbackUrl, "_blank");
  }
};

export const drawSriBalajiLetterhead = (docPdf, useLetterhead = true) => {
  if (!useLetterhead) return;

  const activeCrest = logoDataUrl || fallbackCrestDataUrl;
  const activeWatermark = logoWatermarkDataUrl || fallbackWatermarkDataUrl;

  if (activeWatermark) {
    try {
      docPdf.addImage(activeWatermark, "PNG", 66, 112, 78, 78);
    } catch (e) {}
  }

  if (activeCrest) {
    try {
      docPdf.addImage(activeCrest, "PNG", 50, 7, 21, 21);
    } catch (e) {}
  }

  docPdf.setFont("times", "bold");
  docPdf.setFontSize(21);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("SRI BALAJI", 74, 16.5);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9.8);
  docPdf.setTextColor(13, 92, 133);
  docPdf.text("CLINICAL LABORATORY", 74.5, 22.5);

  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(0.35);
  docPdf.line(14, 30.5, 102.5, 30.5);
  docPdf.line(107.5, 30.5, 196, 30.5);

  docPdf.setDrawColor(197, 155, 70);
  docPdf.setLineWidth(0.25);
  docPdf.line(30, 31.1, 102.5, 31.1);
  docPdf.line(107.5, 31.1, 180, 31.1);

  docPdf.setFillColor(197, 155, 70);
  docPdf.triangle(103.2, 30.8, 105, 29.6, 105, 32.0, "F");
  docPdf.triangle(106.8, 30.8, 105, 29.6, 105, 32.0, "F");

  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(7.8);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(
    "Sathiraju Complex, Main Road, Kothapeta  •  Ph: +91 9849923729  •  Email: prasad balajilab@gmail.com",
    105,
    35.2,
    { align: "center" }
  );

  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(0.45);
  docPdf.line(14, 290.5, 68, 290.5);
  docPdf.line(142, 290.5, 196, 290.5);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(7.5);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("TRUST   •   ACCURACY   •   CARE", 105, 291.3, {
    align: "center"
  });

  docPdf.setFillColor(197, 155, 70);
  docPdf.rect(0, 294.2, 210, 0.8, "F");
  docPdf.setFillColor(15, 45, 74);
  docPdf.rect(0, 295.0, 210, 2.0, "F");
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
  const standaloneTests = [];

  (categories || []).forEach((c, idx) => {
    const groupTitle =
      c.name ||
      c.categoryName ||
      c.groupName ||
      c.title ||
      `Test Group ${idx + 1}`;
    const tests = c.tests || [];
    tests.forEach((t) => {
      if (t && t.name) {
        const itemObj = {
          ...t,
          id: t.id ? String(t.id) : t.name.trim(),
          category: groupTitle,
          isPinned: Boolean(t.isPinned || c.isPinned),
          isPackage: false
        };
        testMap.set(t.name.trim().toLowerCase(), itemObj);
        standaloneTests.push(itemObj);
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

  const formattedPackages = (packages || []).map((p) => ({
    ...p,
    isPinned: Boolean(p.isPinned),
    isPackage: true
  }));

  const allCatalogItems = [...formattedPackages, ...standaloneTests].sort(
    (a, b) => {
      if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
        return b.isPinned ? 1 : -1;
      }
      return (a.name || "").localeCompare(b.name || "");
    }
  );

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
      const cName = (
        c.name ||
        c.categoryName ||
        c.groupName ||
        c.title ||
        ""
      )
        .trim()
        .toLowerCase();
      return cName === rawName.toLowerCase() || cName === cleanNameLower;
    });

    if (matchedCat && matchedCat.tests && matchedCat.tests.length > 0) {
      matchedCat.tests.forEach((sub) =>
        processItem(sub, matchedCat.name || matchedCat.categoryName)
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
// INTERNAL BUILDERS FOR REPORT & BILL PDF
// ==========================================
const buildReportPdfDocument = (patient, tests, results, useLetterhead = true) => {
  const docPdf = new jsPDF();

  drawSriBalajiLetterhead(docPdf, useLetterhead);

  const startY = useLetterhead ? 43 : 20;

  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, startY - 4, 182, 18.5, 2, 2, "S");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9);
  docPdf.setTextColor(15, 45, 74);

  docPdf.text(`Patient Name : ${patient.name || "N/A"}`, 18, startY + 0.5);
  docPdf.text(
    `Age / Gender : ${patient.age || "N/A"} Yrs / ${patient.gender || "N/A"}`,
    18,
    startY + 6
  );
  docPdf.text(
    `Contact No   : ${patient.phone || "Walk-in"}`,
    18,
    startY + 11.5
  );

  docPdf.text(`Clinical ID : ${patient.clinicalId || "N/A"}`, 120, startY + 0.5);
  docPdf.text(`Report Date : ${patient.date || "N/A"}`, 120, startY + 6);
  docPdf.text(
    `Ref. By Dr. : ${patient.doctorName || "Self Walk-in"}`,
    120,
    startY + 11.5
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
    startY: startY + 18,
    margin: { top: 43, bottom: 20, left: 14, right: 14 },
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
      lineWidth: 0.2,
      fontSize: 9
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

  const finalY = Math.min(docPdf.lastAutoTable.finalY + 18, 272);
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("_________________________", 142, finalY);
  docPdf.text("Authorized Signatory", 148, finalY + 4.5);
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(7.5);
  docPdf.setTextColor(100, 116, 139);
  docPdf.text("Sri Balaji Clinical Laboratory", 146, finalY + 8.5);

  return docPdf;
};

const buildBillPdfDocument = (booking) => {
  const docPdf = new jsPDF();

  drawSriBalajiLetterhead(docPdf, true);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(11);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("PATIENT BILL / PAYMENT RECEIPT", 105, 43, { align: "center" });

  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, 46, 182, 18.5, 2, 2, "S");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(`Patient Name : ${booking.name || "N/A"}`, 18, 51);
  docPdf.text(
    `Age / Gender : ${booking.age || "N/A"} Yrs / ${booking.gender || "N/A"}`,
    18,
    56.5
  );
  docPdf.text(`Phone        : ${booking.phone || "N/A"}`, 18, 62);

  docPdf.text(
    `Receipt / ID : ${booking.clinicalId || booking.bookingRef || "N/A"}`,
    120,
    51
  );
  docPdf.text(`Date         : ${booking.date || "N/A"}`, 120, 56.5);
  docPdf.text(
    `Collection   : ${booking.collectionType === "home" ? "Home Visit" : "Lab Visit"}`,
    120,
    62
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
    startY: 68,
    margin: { top: 43, bottom: 20, left: 14, right: 14 },
    head: [["#", "Test / Health Package Description", "Amount"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74] },
    styles: { fillColor: false, textColor: [15, 23, 42], fontSize: 9 },
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
    startY: docPdf.lastAutoTable.finalY + 5,
    margin: { left: 110, right: 14, bottom: 20 },
    body: summaryRows,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 1.5,
      textColor: [15, 45, 74]
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "right" },
      1: { fontStyle: "bold", halign: "right" }
    },
    didParseCell: function (data) {
      const label = summaryRows[data.row.index][0];
      if (label === "Grand Total") {
        data.cell.styles.fontSize = 11;
      }
      if (label === "Balance Due" && computedBalance > 0) {
        data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  return docPdf;
};

// ==========================================
// EXPORTED PRINT & DOWNLOAD FUNCTIONS
// ==========================================
export const printPDFDirectly = (
  patient,
  tests,
  results,
  useLetterhead = true
) => {
  const docPdf = buildReportPdfDocument(patient, tests, results, useLetterhead);
  triggerDirectBrowserPrint(docPdf);
};

export const generatePDF = (patient, tests, results, useLetterhead = true) => {
  const docPdf = buildReportPdfDocument(patient, tests, results, useLetterhead);
  docPdf.save(`${patient.clinicalId || "Report"}_${patient.name}.pdf`);
};

export const printBillPDFDirectly = (booking) => {
  const docPdf = buildBillPdfDocument(booking);
  triggerDirectBrowserPrint(docPdf);
};

export const generateBillPDF = (booking) => {
  const docPdf = buildBillPdfDocument(booking);
  docPdf.save(`Bill_${booking.clinicalId || "Receipt"}_${booking.name}.pdf`);
};
