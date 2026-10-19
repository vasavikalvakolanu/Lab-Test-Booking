import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// =========================================================
// HIGH-PRECISION SVG MARKUP (NAMALU + MICROSCOPE + DNA + WREATH)
// =========================================================
const DETAILED_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="600" height="600">
  <defs>
    <clipPath id="innerCircleClip">
      <circle cx="200" cy="200" r="154" />
    </clipPath>
  </defs>

  <!-- Outer Navy Circle & Inner Gold Ring -->
  <circle cx="200" cy="200" r="186" fill="#ffffff" stroke="#0f2d4a" stroke-width="14" />
  <circle cx="200" cy="200" r="156" fill="#ffffff" stroke="#c59b46" stroke-width="4.5" />

  <!-- Side Gold Accent Notches -->
  <polygon points="44,200 56,191 52,200 56,209" fill="#c59b46" />
  <polygon points="356,200 344,191 348,200 344,209" fill="#c59b46" />

  <!-- Top Crown Gold Drop -->
  <circle cx="200" cy="40" r="12" fill="#ffffff" />
  <path d="M200 24 C193 34, 192 43, 200 49 C208 43, 207 34, 200 24 Z" fill="#c59b46" />

  <!-- Laurel Wreath Leaves (Left & Right Lower Rim) -->
  <g fill="#0f2d4a">
    <!-- Left Wreath -->
    <path d="M54 255 C46 244, 52 232, 62 242 C60 250, 56 254, 54 255 Z" />
    <path d="M65 278 C55 269, 60 256, 71 265 C70 273, 67 277, 65 278 Z" />
    <path d="M80 300 C69 292, 73 279, 85 287 C84 295, 82 299, 80 300 Z" />
    <path d="M98 320 C87 313, 90 300, 102 307 C102 315, 100 319, 98 320 Z" />
    <path d="M120 337 C108 331, 111 318, 123 324 C123 332, 121 336, 120 337 Z" />
    <path d="M144 350 C132 346, 134 333, 146 338 C147 345, 145 349, 144 350 Z" />
    <path d="M170 359 C158 356, 159 344, 171 347 C172 354, 171 358, 170 359 Z" />
    <!-- Right Wreath -->
    <path d="M346 255 C354 244, 348 232, 338 242 C340 250, 344 254, 346 255 Z" />
    <path d="M335 278 C345 269, 340 256, 329 265 C330 273, 333 277, 335 278 Z" />
    <path d="M320 300 C331 292, 327 279, 315 287 C316 295, 318 299, 320 300 Z" />
    <path d="M302 320 C313 313, 310 300, 298 307 C298 315, 300 319, 302 320 Z" />
    <path d="M280 337 C292 331, 289 318, 277 324 C277 332, 279 336, 280 337 Z" />
    <path d="M256 350 C268 346, 266 333, 254 338 C253 345, 255 349, 256 350 Z" />
    <path d="M230 359 C242 356, 241 344, 229 347 C228 354, 229 358, 230 359 Z" />
  </g>

  <!-- Clipped Inner Emblem Elements -->
  <g clip-path="url(#innerCircleClip)">
    <!-- Teal Medical Cross Backdrop -->
    <path d="M72 172 H145 V125 H205 V315 H125 V245 H72 Z" fill="#136a94" />
    <path d="M125 285 C155 320, 215 325, 255 302 L245 325 H125 Z" fill="#0f2d4a" />

    <!-- Golden Tirunamam / Namalu (Top Center) -->
    <path d="M164 62 L172 142 C174 166, 226 166, 228 142 L236 62 L221 62 L215 136 C214 150, 186 150, 185 136 L179 62 Z" fill="#cfa349" stroke="#ffffff" stroke-width="3" />
    <!-- Central Flame Drop (Srichurnam) -->
    <path d="M200 72 C192 98, 190 124, 200 139 C210 124, 208 98, 200 72 Z" fill="#dfa93a" />

    <!-- DNA Double Helix (Tilted Left) with White Halo -->
    <g transform="rotate(-24 148 215)">
      <path d="M126 115 C166 145, 110 185, 150 215 C186 245, 126 285, 164 310" stroke="#ffffff" stroke-width="18" stroke-linecap="round" fill="none" />
      <path d="M164 115 C124 145, 180 185, 140 215 C104 245, 164 285, 126 310" stroke="#ffffff" stroke-width="18" stroke-linecap="round" fill="none" />

      <!-- Base Pair Rungs -->
      <line x1="134" y1="132" x2="156" y2="132" stroke="#0f2d4a" stroke-width="4.5" />
      <line x1="132" y1="146" x2="158" y2="146" stroke="#c59b46" stroke-width="4.5" />
      <line x1="133" y1="182" x2="157" y2="182" stroke="#136a94" stroke-width="4.5" />
      <line x1="132" y1="196" x2="158" y2="196" stroke="#c59b46" stroke-width="4.5" />
      <line x1="134" y1="232" x2="156" y2="232" stroke="#0f2d4a" stroke-width="4.5" />
      <line x1="132" y1="246" x2="158" y2="246" stroke="#c59b46" stroke-width="4.5" />
      <line x1="135" y1="282" x2="155" y2="282" stroke="#136a94" stroke-width="4.5" />

      <!-- Intertwined Helix Strands -->
      <path d="M126 115 C166 145, 110 185, 150 215 C186 245, 126 285, 164 310" stroke="#0f2d4a" stroke-width="9" stroke-linecap="round" fill="none" />
      <path d="M164 115 C124 145, 180 185, 140 215 C104 245, 164 285, 126 310" stroke="#cfa349" stroke-width="9" stroke-linecap="round" fill="none" />
    </g>

    <!-- Clinical Microscope (Right Side) -->
    <g>
      <!-- Curved C-Arm Outer (Teal) & Inner (Gold) -->
      <path d="M258 164 C308 182, 312 252, 260 274" stroke="#136a94" stroke-width="20" stroke-linecap="round" fill="none" />
      <path d="M254 176 C288 190, 290 242, 254 260" stroke="#cfa349" stroke-width="7" stroke-linecap="round" fill="none" />

      <!-- Tilted Optical Tube & Eyepiece -->
      <g transform="rotate(32 252 155)">
        <rect x="242" y="96" width="20" height="10" rx="3" fill="#0f2d4a" />
        <rect x="245" y="106" width="14" height="16" fill="#136a94" />
        <rect x="239" y="122" width="26" height="58" rx="4" fill="#0f2d4a" stroke="#ffffff" stroke-width="2" />
        <rect x="244" y="128" width="6" height="46" rx="2" fill="#136a94" />
        <!-- Objective Lenses -->
        <path d="M236 180 H268 C268 190, 236 190, 236 180 Z" fill="#0f2d4a" />
        <rect x="241" y="186" width="8" height="16" rx="2" fill="#136a94" />
        <rect x="253" y="186" width="9" height="22" rx="2" fill="#0f2d4a" />
      </g>

      <!-- Coaxial Focus Knob -->
      <circle cx="262" cy="176" r="15" fill="#ffffff" stroke="#0f2d4a" stroke-width="5" />
      <circle cx="262" cy="176" r="7" fill="#cfa349" />

      <!-- Mechanical Stage & Condenser -->
      <rect x="196" y="242" width="66" height="9" rx="3" fill="#0f2d4a" />
      <rect x="210" y="237" width="32" height="4" rx="1.5" fill="#cfa349" />
      <path d="M220 251 H244 L238 264 H226 Z" fill="#136a94" />

      <!-- Lower Pillar & Heavy Base -->
      <path d="M238 292 L254 256 L274 282 L284 298 H198 C198 290, 206 286, 218 286 Z" fill="#0f2d4a" />
      <rect x="194" y="294" width="96" height="12" rx="5" fill="#0f2d4a" />
      <circle cx="256" cy="272" r="5" fill="#cfa349" />
    </g>
  </g>

  <!-- Bottom Lotus / Diamond Finial -->
  <path d="M200 344 L214 368 L200 392 L186 368 Z" fill="#cfa349" stroke="#ffffff" stroke-width="3" />
</svg>`;

// =========================================================
// OFF-SCREEN CANVAS RASTERIZER (300-DPI PNG + WATERMARK)
// =========================================================
let preloadedLetterhead = null;
let rasterizedLogoPng = null;
let rasterizedWatermarkPng = null;

if (typeof window !== "undefined") {
  // 1. Check if user uploaded "/letterhead.png" into /public folder
  const bgImg = new window.Image();
  bgImg.crossOrigin = "Anonymous";
  bgImg.src = "/letterhead.png";
  bgImg.onload = () => {
    if (bgImg.naturalWidth > 100) {
      preloadedLetterhead = bgImg;
    }
  };

  // 2. Rasterize the detailed SVG into crisp PNG Data URLs for jsPDF
  const svgImg = new window.Image();
  const svgBlob = new Blob([DETAILED_LOGO_SVG], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  svgImg.onload = () => {
    try {
      // Full-opacity high-res logo for top header
      const canvasLogo = document.createElement("canvas");
      canvasLogo.width = 480;
      canvasLogo.height = 480;
      const ctxLogo = canvasLogo.getContext("2d");
      ctxLogo.drawImage(svgImg, 0, 0, 480, 480);
      rasterizedLogoPng = canvasLogo.toDataURL("image/png");

      // Subtle 6% opacity watermark for center of page
      const canvasWm = document.createElement("canvas");
      canvasWm.width = 600;
      canvasWm.height = 600;
      const ctxWm = canvasWm.getContext("2d");
      ctxWm.globalAlpha = 0.065;
      ctxWm.drawImage(svgImg, 0, 0, 600, 600);
      rasterizedWatermarkPng = canvasWm.toDataURL("image/png");
    } catch (err) {
      console.error("Canvas logo rasterization error:", err);
    }
    URL.revokeObjectURL(svgUrl);
  };
  svgImg.src = svgUrl;
}

// =========================================================
// REACT COMPONENT FOR PREVIEW MODAL & PORTAL HEADERS
// =========================================================
export function SriBalajiLogoSVG({ size = 80, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 ${className}`}
      dangerouslySetInnerHTML={{
        __html: DETAILED_LOGO_SVG.replace(
          'width="600" height="600"',
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

  // Priority 1: If "/letterhead.png" was uploaded to public/, use the exact image
  if (preloadedLetterhead) {
    try {
      docPdf.addImage(preloadedLetterhead, "PNG", 0, 0, 210, 297);
      return;
    } catch (e) {
      // Fall through to high-res canvas logo if image fails
    }
  }

  // Priority 2: High-Resolution Canvas PNG Logo & Watermark
  if (rasterizedWatermarkPng) {
    // Centered watermark (88mm x 88mm, subtle 6.5% opacity)
    docPdf.addImage(rasterizedWatermarkPng, "PNG", 61, 102, 88, 88);
  }

  if (rasterizedLogoPng) {
    // Crisp top-left circular emblem (28mm x 28mm)
    docPdf.addImage(rasterizedLogoPng, "PNG", 46, 8, 28, 28);
  }

  // Header Typography: SRI BALAJI CLINICAL LABORATORY
  docPdf.setFont("times", "bold");
  docPdf.setFontSize(27);
  docPdf.setTextColor(15, 45, 74); // Deep Navy #0f2d4a
  docPdf.text("SRI BALAJI", 78, 21.5);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12.2);
  docPdf.setTextColor(19, 106, 148); // Clinical Teal #136a94
  docPdf.text("CLINICAL LABORATORY", 78.5, 28.5);

  // Tapered Ornamental Navy & Gold Divider with Center Diamond
  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(0.55);
  docPdf.line(14, 39, 101.5, 39);
  docPdf.line(108.5, 39, 196, 39);

  docPdf.setDrawColor(197, 155, 70);
  docPdf.setLineWidth(0.35);
  docPdf.line(28, 39.7, 101.5, 39.7);
  docPdf.line(108.5, 39.7, 182, 39.7);

  // Center Gold Diamond
  docPdf.setFillColor(197, 155, 70);
  docPdf.triangle(102.5, 39.3, 105, 37.6, 105, 41.0, "F");
  docPdf.triangle(107.5, 39.3, 105, 37.6, 105, 41.0, "F");

  // Contact Line
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8.8);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(
    "Sathiraju Complex, Main Road, Kothapeta  •  Ph: +91 9849923729  •  Email: prasad balajilab@gmail.com",
    105,
    44.5,
    { align: "center" }
  );

  // Bottom Footer: TRUST • ACCURACY • CARE
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

  const startY = useLetterhead ? 53 : 20;

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
    margin: { top: 52, bottom: 26, left: 14, right: 14 },
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
  docPdf.text("PATIENT BILL / PAYMENT RECEIPT", 105, 52, { align: "center" });

  // Patient Demographics Box
  docPdf.setDrawColor(203, 213, 225);
  docPdf.setLineWidth(0.3);
  docPdf.roundedRect(14, 56, 182, 20, 2, 2, "S");

  docPdf.setFontSize(9.5);
  docPdf.text(`Patient Name : ${booking.name || "N/A"}`, 18, 61.5);
  docPdf.text(
    `Age / Gender : ${booking.age || "N/A"} Yrs / ${booking.gender || "N/A"}`,
    18,
    67.5
  );
  docPdf.text(`Phone        : ${booking.phone || "N/A"}`, 18, 73.5);

  docPdf.text(
    `Receipt / ID : ${booking.clinicalId || booking.bookingRef || "N/A"}`,
    120,
    61.5
  );
  docPdf.text(`Date         : ${booking.date || "N/A"}`, 120, 67.5);
  docPdf.text(
    `Collection   : ${booking.collectionType === "home" ? "Home Visit" : "Lab Visit"}`,
    120,
    73.5
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
    startY: 80,
    head: [["#", "Test / Health Package Description", "Amount"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74] },
    styles: { fillColor: false, textColor: [15, 23, 42] }
  });

  // Accurate Financial Summary Calculation (Fixes Balance Due: 0 bug)
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
