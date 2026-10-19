import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// =========================================================
// AUTO-PRELOAD "/letterhead.png" IF UPLOADED TO /public
// =========================================================
let preloadedLetterhead = null;
if (typeof window !== "undefined") {
  const img = new window.Image();
  img.crossOrigin = "Anonymous";
  img.src = "/letterhead.png";
  img.onload = () => {
    preloadedLetterhead = img;
  };
}

// =========================================================
// REUSABLE SVG COMPONENT: NAMALU + MICROSCOPE + DNA LOGO
// =========================================================
export function SriBalajiLogoSVG({ size = 76, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Navy & Inner Gold Rings */}
      <circle
        cx="60"
        cy="60"
        r="56"
        stroke="#0f2d4a"
        strokeWidth="4"
        fill="#ffffff"
      />
      <circle
        cx="60"
        cy="60"
        r="49"
        stroke="#c59b46"
        strokeWidth="2"
        fill="none"
      />

      {/* Teal Medical Cross Backdrop (Left/Center) */}
      <path
        d="M24 52 H48 V36 H62 V84 H36 V68 H24 Z"
        fill="#136a94"
        opacity="0.9"
      />

      {/* Top Golden Namalu (Tirunamam) */}
      <path
        d="M49 16 L52 36 C52 41 68 41 68 36 L71 16 L66 16 L64 33 C64 36 56 36 56 33 L54 16 Z"
        fill="#c59b46"
      />
      <path
        d="M60 18 C58 24 57 29 60 33 C63 29 62 24 60 18 Z"
        fill="#d9a74a"
      />

      {/* DNA Double Helix (Left) */}
      <path
        d="M32 34 C42 42, 28 56, 38 66 C46 74, 34 84, 44 90"
        stroke="#0f2d4a"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 30 C32 40, 46 54, 34 64 C26 72, 42 82, 34 90"
        stroke="#c59b46"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Microscope (Right) */}
      <g transform="translate(52, 32)">
        {/* Eyepiece & Body Tube */}
        <rect
          x="18"
          y="2"
          width="7"
          height="18"
          rx="1.5"
          transform="rotate(28 18 2)"
          fill="#0f2d4a"
        />
        {/* Curved Arm */}
        <path
          d="M18 16 C30 22, 32 40, 18 46"
          stroke="#136a94"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Focus Knob */}
        <circle
          cx="20"
          cy="24"
          r="4"
          fill="#c59b46"
          stroke="#0f2d4a"
          strokeWidth="1.5"
        />
        {/* Stage & Base */}
        <rect x="2" y="42" width="22" height="3" rx="1" fill="#0f2d4a" />
        <path d="M6 54 H32 L26 46 H12 Z" fill="#0f2d4a" />
      </g>

      {/* Laurel Wreath (Bottom Rim) */}
      <path
        d="M22 76 C28 94, 44 104, 60 106 C76 104, 92 94, 98 76"
        stroke="#0f2d4a"
        strokeWidth="2.5"
        strokeDasharray="5 3"
        fill="none"
      />
      {/* Bottom Gold Diamond */}
      <polygon points="60,101 64,108 60,115 56,108" fill="#c59b46" />
    </svg>
  );
}

// =========================================================
// VECTOR LETTERHEAD & WATERMARK DRAWER FOR JSPDF
// =========================================================
const drawVectorLogoAndWatermark = (docPdf, cx, cy, radius, isWatermark) => {
  const navy = isWatermark ? [226, 232, 240] : [15, 45, 74];
  const teal = isWatermark ? [228, 238, 245] : [19, 106, 148];
  const gold = isWatermark ? [242, 234, 214] : [197, 155, 70];

  // Outer Navy Ring & Inner Gold Ring
  docPdf.setDrawColor(...navy);
  docPdf.setLineWidth(isWatermark ? 1.8 : 1.1);
  docPdf.circle(cx, cy, radius, "S");

  docPdf.setDrawColor(...gold);
  docPdf.setLineWidth(isWatermark ? 1.0 : 0.5);
  docPdf.circle(cx, cy, radius * 0.87, "S");

  // Top Namalu (U-shape + central drop)
  const namaluTop = cy - radius * 0.72;
  const namaluBottom = cy - radius * 0.25;
  const namaluHalfW = radius * 0.18;
  docPdf.setDrawColor(...gold);
  docPdf.setLineWidth(isWatermark ? 2.5 : 1.1);
  docPdf.line(
    cx - namaluHalfW,
    namaluTop,
    cx - namaluHalfW * 0.75,
    namaluBottom
  );
  docPdf.line(
    cx + namaluHalfW,
    namaluTop,
    cx + namaluHalfW * 0.75,
    namaluBottom
  );
  docPdf.line(
    cx - namaluHalfW * 0.75,
    namaluBottom,
    cx + namaluHalfW * 0.75,
    namaluBottom
  );
  docPdf.line(cx, namaluTop + radius * 0.06, cx, namaluBottom - radius * 0.06);

  // Left Medical Cross Block
  docPdf.setFillColor(...teal);
  docPdf.rect(
    cx - radius * 0.55,
    cy - radius * 0.12,
    radius * 0.42,
    radius * 0.28,
    "F"
  );

  // Microscope Tube & Base (Right Side)
  docPdf.setDrawColor(...navy);
  docPdf.setLineWidth(isWatermark ? 3.0 : 1.3);
  docPdf.line(
    cx + radius * 0.35,
    cy - radius * 0.38,
    cx + radius * 0.08,
    cy + radius * 0.08
  );
  // Microscope Arm Curve
  docPdf.setDrawColor(...teal);
  docPdf.line(
    cx + radius * 0.25,
    cy - radius * 0.18,
    cx + radius * 0.42,
    cy + radius * 0.12
  );
  docPdf.line(
    cx + radius * 0.42,
    cy + radius * 0.12,
    cx + radius * 0.18,
    cy + radius * 0.32
  );
  // Microscope Base Stage
  docPdf.setDrawColor(...navy);
  docPdf.line(
    cx - radius * 0.02,
    cy + radius * 0.36,
    cx + radius * 0.48,
    cy + radius * 0.36
  );

  // DNA Helix Crossings (Left Side)
  docPdf.setDrawColor(...gold);
  docPdf.setLineWidth(isWatermark ? 2.0 : 0.9);
  docPdf.line(
    cx - radius * 0.45,
    cy - radius * 0.35,
    cx - radius * 0.18,
    cy + radius * 0.35
  );
  docPdf.setDrawColor(...navy);
  docPdf.line(
    cx - radius * 0.18,
    cy - radius * 0.35,
    cx - radius * 0.45,
    cy + radius * 0.35
  );
};

export const drawSriBalajiLetterhead = (docPdf, useLetterhead = true) => {
  if (!useLetterhead) return;

  // If "/letterhead.png" exists in public folder, stamp the exact image template
  if (preloadedLetterhead) {
    try {
      docPdf.addImage(preloadedLetterhead, "PNG", 0, 0, 210, 297);
      return;
    } catch (e) {
      // Fallback to crisp vector letterhead if image fails
    }
  }

  // 1. Center Page Watermark
  drawVectorLogoAndWatermark(docPdf, 105, 155, 48, true);

  // 2. Top Circular Crest Logo
  drawVectorLogoAndWatermark(docPdf, 62, 22, 13, false);

  // 3. Header Title: SRI BALAJI CLINICAL LABORATORY
  docPdf.setFont("times", "bold");
  docPdf.setFontSize(26);
  docPdf.setTextColor(15, 45, 74); // Navy #0f2d4a
  docPdf.text("SRI BALAJI", 80, 20);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12.5);
  docPdf.setTextColor(13, 92, 133); // Teal #0d5c85
  docPdf.text("CLINICAL LABORATORY", 80.5, 27.5);

  // 4. Ornamental Navy & Gold Divider with Center Diamond
  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(0.6);
  docPdf.line(14, 38, 102, 38);
  docPdf.line(108, 38, 196, 38);

  docPdf.setDrawColor(197, 155, 70);
  docPdf.setLineWidth(0.4);
  docPdf.line(25, 38.7, 102, 38.7);
  docPdf.line(108, 38.7, 185, 38.7);

  // Center Gold Diamond
  docPdf.setFillColor(197, 155, 70);
  docPdf.triangle(103, 38.3, 105, 36.8, 105, 39.8, "F");
  docPdf.triangle(107, 38.3, 105, 36.8, 105, 39.8, "F");

  // 5. Contact Info Line
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8.8);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(
    "Sathiraju Complex, Main Road, Kothapeta  •  Ph: +91 9849923729  •  Email: prasad balajilab@gmail.com",
    105,
    43.5,
    { align: "center" }
  );

  // 6. Bottom Footer: TRUST • ACCURACY • CARE
  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(1.2);
  docPdf.line(0, 286.5, 50, 286.5);
  docPdf.line(160, 286.5, 210, 286.5);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(10.5);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("TRUST  •  ACCURACY  •  CARE", 105, 287.8, { align: "center" });

  // Bottom Gold & Navy Full-Bleed Bars
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

  // Draw Letterhead on Page 1
  drawSriBalajiLetterhead(docPdf, useLetterhead);

  const startY = useLetterhead ? 52 : 20;

  // Patient Demographics Box
  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, startY - 5, 182, 21, 2, 2, "S");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(9.5);
  docPdf.setTextColor(15, 45, 74);

  docPdf.text(`Patient Name : ${patient.name || "N/A"}`, 18, startY);
  docPdf.text(
    `Age / Gender : ${patient.age || "N/A"} Yrs / ${patient.gender || "N/A"}`,
    18,
    startY + 6
  );
  docPdf.text(`Contact No   : ${patient.phone || "Walk-in"}`, 18, startY + 12);

  docPdf.text(`Clinical ID : ${patient.clinicalId || "N/A"}`, 122, startY);
  docPdf.text(`Report Date : ${patient.date || "N/A"}`, 122, startY + 6);
  docPdf.text(
    `Ref. By Dr. : ${patient.doctorName || "Self Walk-in"}`,
    122,
    startY + 12
  );

  // Build rows with Profile Section Headers
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
    margin: { top: 50, bottom: 26, left: 14, right: 14 },
    head: [
      ["Test Description", "Result Value", "Flag", "Reference Range", "Unit"]
    ],
    body: tableRows.map((r) => r.cells),
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74], textColor: [255, 255, 255] },
    styles: {
      fillColor: false, // Transparent cells so center watermark shows through
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
  docPdf.text("PATIENT BILL / PAYMENT RECEIPT", 105, 51, { align: "center" });

  docPdf.setFontSize(9.5);
  docPdf.text(`Patient Name: ${booking.name || "N/A"}`, 14, 59);
  docPdf.text(
    `Age / Gender: ${booking.age || "N/A"} Yrs / ${booking.gender || "N/A"}`,
    14,
    65
  );
  docPdf.text(`Phone: ${booking.phone || "N/A"}`, 14, 71);

  docPdf.text(
    `Receipt / Clinical ID: ${booking.clinicalId || booking.bookingRef || "N/A"}`,
    125,
    59
  );
  docPdf.text(`Date: ${booking.date || "N/A"}`, 125, 65);
  docPdf.text(
    `Collection: ${booking.collectionType === "home" ? "Home Visit" : "Lab Visit"}`,
    125,
    71
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
    startY: 77,
    head: [["#", "Test / Health Package Description", "Amount"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74] },
    styles: { fillColor: false }
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
