import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// =========================================================
// BUILT-IN CLINICAL REFERENCE RANGE DICTIONARY
// =========================================================
const STANDARD_CLINICAL_RANGES = {
  // Complete Urine Analysis
  albumin: { refRange: "Nil / Absent", unit: "" },
  "urine albumin": { refRange: "Nil / Absent", unit: "" },
  "sugar (fasting)": { refRange: "Nil (70 - 100)", unit: "mg/dL" },
  "sugar (p.p.)": { refRange: "Nil (< 140)", unit: "mg/dL" },
  "sugar random": { refRange: "70 - 140", unit: "mg/dL" },
  "urine sugar": { refRange: "Nil / Absent", unit: "" },
  "urine sugar random": { refRange: "Nil / Absent", unit: "" },
  "bile salts": { refRange: "Absent (Negative)", unit: "" },
  "bile pigments": { refRange: "Absent (Negative)", unit: "" },
  urobilinogen: { refRange: "Normal (0.2 - 1.0)", unit: "mg/dL" },
  "occult blood": { refRange: "Negative (Absent)", unit: "" },
  "pregnancy test": { refRange: "Negative", unit: "" },
  "urine pregnancy test": { refRange: "Negative", unit: "" },
  "microscopic exam": { refRange: "WBC: 0-5/hpf, RBC: Nil", unit: "/hpf" },
  "urine microscopy": { refRange: "WBC: 0-5/hpf, RBC: Nil", unit: "/hpf" },
  "pus cells": { refRange: "0 - 5", unit: "/hpf" },
  "epithelial cells": { refRange: "Few (1 - 4)", unit: "/hpf" },
  "ketone bodies": { refRange: "Absent (Negative)", unit: "" },
  "specific gravity": { refRange: "1.005 - 1.030", unit: "" },
  ph: { refRange: "4.5 - 8.0", unit: "" },

  // Diabetes & Blood Sugar
  "fasting blood sugar": { refRange: "70 - 100", unit: "mg/dL" },
  "fasting blood sugar (fbs)": { refRange: "70 - 100", unit: "mg/dL" },
  fbs: { refRange: "70 - 100", unit: "mg/dL" },
  "post prandial blood sugar": { refRange: "70 - 140", unit: "mg/dL" },
  "post prandial blood sugar (ppbs)": { refRange: "70 - 140", unit: "mg/dL" },
  ppbs: { refRange: "70 - 140", unit: "mg/dL" },
  "random blood sugar": { refRange: "70 - 140", unit: "mg/dL" },
  "random blood sugar (rbs)": { refRange: "70 - 140", unit: "mg/dL" },
  rbs: { refRange: "70 - 140", unit: "mg/dL" },
  hba1c: { refRange: "4.0 - 5.6", unit: "%" },
  "hba1c (glycosylated haemoglobin)": { refRange: "4.0 - 5.6", unit: "%" },

  // Lipid Profile
  "total cholesterol": { refRange: "< 200", unit: "mg/dL" },
  triglycerides: { refRange: "< 150", unit: "mg/dL" },
  "hdl cholesterol": { refRange: "40 - 60", unit: "mg/dL" },
  "h.d.l.": { refRange: "40 - 60", unit: "mg/dL" },
  "ldl cholesterol": { refRange: "< 100", unit: "mg/dL" },
  "l.d.l.": { refRange: "80 - 130", unit: "mg/dL" },
  "vldl cholesterol": { refRange: "5 - 40", unit: "mg/dL" },
  "v.l.d.l.": { refRange: "5 - 40", unit: "mg/dL" },

  // Complete Blood Count (CBC) & Hematology
  haemoglobin: { refRange: "13.0 - 17.0", unit: "g/dL" },
  "haemoglobin (hb)": { refRange: "13.0 - 17.0", unit: "g/dL" },
  hemoglobin: { refRange: "13.0 - 17.0", unit: "g/dL" },
  "total rbc count": { refRange: "4.5 - 5.5", unit: "mill/cumm" },
  "rbc count": { refRange: "4.5 - 5.5", unit: "mill/cumm" },
  "total wbc count": { refRange: "4000 - 11000", unit: "/cumm" },
  "wbc count": { refRange: "4000 - 11000", unit: "/cumm" },
  "platelet count": { refRange: "1.5 - 4.5", unit: "Lakhs/cumm" },
  platelets: { refRange: "1.5 - 4.5", unit: "Lakhs/cumm" },
  pcv: { refRange: "40 - 50", unit: "%" },
  "packed cell volume (pcv)": { refRange: "40 - 50", unit: "%" },
  mcv: { refRange: "80 - 100", unit: "fL" },
  mch: { refRange: "27 - 32", unit: "pg" },
  mchc: { refRange: "32 - 36", unit: "g/dL" },
  neutrophils: { refRange: "40 - 75", unit: "%" },
  lymphocytes: { refRange: "20 - 40", unit: "%" },
  eosinophils: { refRange: "1 - 6", unit: "%" },
  monocytes: { refRange: "2 - 10", unit: "%" },
  basophils: { refRange: "0 - 1", unit: "%" },
  esr: { refRange: "0 - 20", unit: "mm/hr" },
  "esr (erythrocyte sedimentation rate)": { refRange: "0 - 20", unit: "mm/hr" },

  // Liver Function Test (LFT)
  "total bilirubin": { refRange: "0.2 - 1.2", unit: "mg/dL" },
  "direct bilirubin": { refRange: "0.0 - 0.3", unit: "mg/dL" },
  "indirect bilirubin": { refRange: "0.2 - 0.9", unit: "mg/dL" },
  "sgpt (alt)": { refRange: "7 - 56", unit: "U/L" },
  sgpt: { refRange: "7 - 56", unit: "U/L" },
  "sgot (ast)": { refRange: "8 - 48", unit: "U/L" },
  sgot: { refRange: "8 - 48", unit: "U/L" },
  "alkaline phosphatase": { refRange: "44 - 147", unit: "U/L" },
  "total protein": { refRange: "6.0 - 8.3", unit: "g/dL" },
  "serum albumin": { refRange: "3.5 - 5.0", unit: "g/dL" },
  globulin: { refRange: "2.0 - 3.5", unit: "g/dL" },
  "a/g ratio": { refRange: "1.0 - 2.1", unit: "" },

  // Renal / Kidney Function Test (RFT)
  "blood urea": { refRange: "15 - 40", unit: "mg/dL" },
  urea: { refRange: "15 - 40", unit: "mg/dL" },
  "serum creatinine": { refRange: "0.6 - 1.2", unit: "mg/dL" },
  creatinine: { refRange: "0.6 - 1.2", unit: "mg/dL" },
  "uric acid": { refRange: "3.5 - 7.2", unit: "mg/dL" },
  "serum calcium": { refRange: "8.5 - 10.2", unit: "mg/dL" },
  calcium: { refRange: "8.5 - 10.2", unit: "mg/dL" },
  sodium: { refRange: "135 - 145", unit: "mEq/L" },
  potassium: { refRange: "3.5 - 5.1", unit: "mEq/L" },
  chloride: { refRange: "96 - 106", unit: "mEq/L" },

  // Thyroid Profile
  t3: { refRange: "80 - 200", unit: "ng/dL" },
  "t3 (triiodothyronine)": { refRange: "80 - 200", unit: "ng/dL" },
  t4: { refRange: "5.1 - 14.1", unit: "ug/dL" },
  "t4 (thyroxine)": { refRange: "5.1 - 14.1", unit: "ug/dL" },
  tsh: { refRange: "0.4 - 4.5", unit: "uIU/mL" },
  "tsh (ultra sensitive)": { refRange: "0.4 - 4.5", unit: "uIU/mL" },

  // Serology / Fever Profile
  "dengue n.s.1": { refRange: "Negative", unit: "" },
  "dengue ns1": { refRange: "Negative", unit: "" },
  "dengue igg": { refRange: "Negative", unit: "" },
  "dengue igm": { refRange: "Negative", unit: "" },
  "malaria parasite": { refRange: "Not Detected", unit: "" },
  "widal test": { refRange: "< 1:80 (Non-Reactive)", unit: "Titre" },
  crp: { refRange: "< 6.0", unit: "mg/L" },
  "c-reactive protein (crp)": { refRange: "< 6.0", unit: "mg/L" }
};

export const resolveTestRefAndUnit = (testObj, catalogMatch = null) => {
  if (!testObj) return { refRange: "-", unit: "" };

  const rawRange =
    testObj.refRange ||
    testObj.normalRange ||
    testObj.referenceRange ||
    testObj.range ||
    (catalogMatch &&
      (catalogMatch.refRange ||
        catalogMatch.normalRange ||
        catalogMatch.referenceRange ||
        catalogMatch.range)) ||
    "";

  const rawUnit =
    testObj.unit ||
    testObj.units ||
    (catalogMatch && (catalogMatch.unit || catalogMatch.units)) ||
    "";

  const cleanRange = String(rawRange).trim();
  const cleanUnit = String(rawUnit).trim();

  if (cleanRange && cleanRange !== "-") {
    return {
      refRange: cleanRange,
      unit: cleanUnit === "-" ? "" : cleanUnit
    };
  }

  const nameKey = String(testObj.name || "")
    .trim()
    .toLowerCase();
  const strippedKey = nameKey.replace(/\s*\(.*?\)\s*/g, "").trim();

  const dictHit =
    STANDARD_CLINICAL_RANGES[nameKey] || STANDARD_CLINICAL_RANGES[strippedKey];

  if (dictHit) {
    return {
      refRange: dictHit.refRange,
      unit: cleanUnit && cleanUnit !== "-" ? cleanUnit : dictHit.unit
    };
  }

  return {
    refRange: cleanRange || "-",
    unit: cleanUnit === "-" ? "" : cleanUnit
  };
};

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

// Preserves exact aspect ratio centered inside a square canvas
const convertCrestToDataUrl = (
  img,
  alpha = 1.0,
  targetSize = 600,
  flattenOnWhite = false
) => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");

    if (flattenOnWhite) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetSize, targetSize);
    }

    ctx.globalAlpha = alpha;

    const w = img.naturalWidth || 400;
    const h = img.naturalHeight || 400;
    const scale = Math.min(targetSize / w, targetSize / h);
    const drawW = w * scale;
    const drawH = h * scale;
    const dx = (targetSize - drawW) / 2;
    const dy = (targetSize - drawH) / 2;

    ctx.drawImage(img, 0, 0, w, h, dx, dy, drawW, drawH);
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
      logoDataUrl = convertCrestToDataUrl(lgImg, 1.0, 600, false);
      // Clean 5% opacity watermark flattened on white for dead-center placement
      logoWatermarkDataUrl = convertCrestToDataUrl(lgImg, 0.05, 700, true);
    }
  };
  lgImg.src = "/logo.png";

  const svgImg = new window.Image();
  const svgBlob = new Blob([FALLBACK_CREST_SVG], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  svgImg.onload = () => {
    fallbackCrestDataUrl = convertCrestToDataUrl(svgImg, 1.0, 480, false);
    fallbackWatermarkDataUrl = convertCrestToDataUrl(svgImg, 0.05, 600, true);
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
    printFrame.style.width = "1px";
    printFrame.style.height = "1px";
    printFrame.style.opacity = "0";
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
      }, 400);
    };

    document.body.appendChild(printFrame);
  } catch (error) {
    console.error("Direct print error:", error);
    const fallbackUrl = docPdf.output("bloburl");
    window.open(fallbackUrl, "_blank");
  }
};

// =========================================================
// 1. MATHEMATICALLY CENTERED HEADER & MIDDLE WATERMARK
// =========================================================
export const drawSriBalajiLetterhead = (docPdf, useLetterhead = true) => {
  if (!useLetterhead) return;

  const activeCrest = logoDataUrl || fallbackCrestDataUrl;
  const activeWatermark = logoWatermarkDataUrl || fallbackWatermarkDataUrl;

  // A. Exact Middle-of-Page Watermark (Centered at X=105mm, Y=148mm, Size=78x78mm)
  if (activeWatermark) {
    try {
      const wmSize = 78;
      const wmX = (210 - wmSize) / 2; // 66mm
      const wmY = (297 - wmSize) / 2; // 109.5mm (Dead center of A4)
      docPdf.addImage(activeWatermark, "PNG", wmX, wmY, wmSize, wmSize);
    } catch (e) {}
  }

  // B. Dynamically Centered Top Header [Circular Logo + SRI BALAJI / CLINICAL LABORATORY]
  const logoSize = 22;
  const gap = 3.5;

  docPdf.setFont("times", "bold");
  docPdf.setFontSize(24);
  const titleStr = "SRI BALAJI";
  const titleWidth = docPdf.getTextWidth(titleStr);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(10.2);
  const subStr = "CLINICAL LABORATORY";
  const subWidth = docPdf.getTextWidth(subStr);

  const textColWidth = Math.max(titleWidth, subWidth);
  const totalHeaderWidth = logoSize + gap + textColWidth;

  // Exact starting X so the combined [Logo + Text] unit sits dead-center at 105mm
  const headerStartX = (210 - totalHeaderWidth) / 2;
  const textCenterX = headerStartX + logoSize + gap + textColWidth / 2;

  if (activeCrest) {
    try {
      docPdf.addImage(
        activeCrest,
        "PNG",
        headerStartX,
        6.5,
        logoSize,
        logoSize
      );
    } catch (e) {}
  }

  // Draw "SRI BALAJI" centered in the text column
  docPdf.setFont("times", "bold");
  docPdf.setFontSize(24);
  docPdf.setTextColor(15, 45, 74); // Deep Navy #0f2d4a
  docPdf.text(titleStr, textCenterX, 16.5, { align: "center" });

  // Draw "CLINICAL LABORATORY" centered directly underneath "SRI BALAJI"
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(10.2);
  docPdf.setTextColor(13, 92, 133); // Clinical Teal #0d5c85
  docPdf.text(subStr, textCenterX, 23, { align: "center" });

  // C. Centered Ornamental Divider with Gold Diamond at X=105mm
  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(0.35);
  docPdf.line(14, 31, 102.5, 31);
  docPdf.line(107.5, 31, 196, 31);

  docPdf.setDrawColor(197, 155, 70);
  docPdf.setLineWidth(0.25);
  docPdf.line(30, 31.6, 102.5, 31.6);
  docPdf.line(107.5, 31.6, 180, 31.6);

  docPdf.setFillColor(197, 155, 70);
  docPdf.triangle(103.2, 31.3, 105, 30.1, 105, 32.5, "F");
  docPdf.triangle(106.8, 31.3, 105, 30.1, 105, 32.5, "F");

  // D. Centered Contact Strip
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text(
    "Sathiraju Complex, Main Road, Kothapeta  •  Ph: +91 9849923729  •  Email: prasad balajilab@gmail.com",
    105,
    36,
    { align: "center" }
  );
};

// =========================================================
// 2. SAFE-MARGIN BOTTOM FOOTER (VISIBLE IN ALL PRINT & PDF TABS)
// Drawn at Y=275mm–282mm so printers never clip it!
// =========================================================
export const drawSriBalajiFooter = (
  docPdf,
  useLetterhead = true,
  includeSignature = true
) => {
  if (includeSignature) {
    const sigY = 261;
    docPdf.setDrawColor(15, 45, 74);
    docPdf.setLineWidth(0.35);
    docPdf.line(142, sigY, 194, sigY);

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(9);
    docPdf.setTextColor(15, 45, 74);
    docPdf.text("Authorized Signatory", 168, sigY + 4.5, { align: "center" });

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(7.5);
    docPdf.setTextColor(100, 116, 139);
    docPdf.text("Sri Balaji Clinical Laboratory", 168, sigY + 8.5, {
      align: "center"
    });
  }

  if (!useLetterhead) return;

  // Side Navy Lines + TRUST • ACCURACY • CARE (Y = 275.5mm)
  docPdf.setDrawColor(15, 45, 74);
  docPdf.setLineWidth(0.45);
  docPdf.line(14, 275.5, 68, 275.5);
  docPdf.line(142, 275.5, 196, 275.5);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(8);
  docPdf.setTextColor(15, 45, 74);
  docPdf.text("TRUST   •   ACCURACY   •   CARE", 105, 276.4, {
    align: "center"
  });

  // Slim Gold & Navy Bottom Stripes (Y = 279mm - 282mm, 15mm inside paper edge)
  docPdf.setFillColor(197, 155, 70);
  docPdf.rect(14, 279.0, 182, 0.9, "F");
  docPdf.setFillColor(15, 45, 74);
  docPdf.rect(14, 279.9, 182, 2.1, "F");
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
  const strVal = String(rawValue).trim();

  if (
    strVal.includes("+") ||
    /^(positive|reactive|present|detected)$/i.test(strVal)
  ) {
    if (
      refRange &&
      /nil|absent|negative|normal|non-reactive/i.test(String(refRange))
    ) {
      return strVal.includes("+++") ? "Critical" : "High";
    }
  }

  const numVal = parseFloat(strVal.replace(/,/g, ""));
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

  const lessMatch = cleanRange.match(/(?:<|up\s*to)\s*=?\s*(\d+(?:\.\d+)?)/i);
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
        const resolved = resolveTestRefAndUnit(t);
        const itemObj = {
          ...t,
          id: t.id ? String(t.id) : t.name.trim(),
          refRange: resolved.refRange,
          unit: resolved.unit,
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
        const resolved = resolveTestRefAndUnit(t);
        testMap.set(t.name.trim().toLowerCase(), {
          ...t,
          id: t.id ? String(t.id) : t.name.trim(),
          refRange: resolved.refRange,
          unit: resolved.unit,
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

    const resolved = resolveTestRefAndUnit(item, catalogMatch);
    const uniqueKey = item.id ? String(item.id) : rawName;

    expanded.push({
      ...item,
      id: uniqueKey,
      name: rawName,
      refRange: resolved.refRange,
      unit: resolved.unit,
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
const buildReportPdfDocument = (
  patient,
  tests,
  results,
  useLetterhead = true
) => {
  const docPdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

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

  docPdf.text(
    `Clinical ID : ${patient.clinicalId || "N/A"}`,
    120,
    startY + 0.5
  );
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
    const resolved = resolveTestRefAndUnit(t);
    const finalRange = res.customRefRange || resolved.refRange || "-";
    const finalUnit =
      res.customUnit !== undefined ? res.customUnit : resolved.unit;

    tableRows.push({
      isHeader: false,
      flag: res.flag || "Normal",
      cells: [
        t.name,
        res.value || "-",
        res.flag === "Normal" ? "" : res.flag,
        finalRange,
        finalUnit || "-"
      ]
    });
  });

  docPdf.autoTable({
    startY: startY + 18,
    margin: { top: 43, bottom: 40, left: 14, right: 14 },
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
      fontSize: 8.8,
      cellPadding: 2.1
    },
    willDrawPage: function (data) {
      if (data.pageNumber > 1 && useLetterhead) {
        drawSriBalajiLetterhead(docPdf, true);
      }
    },
    didDrawPage: function () {
      // Drawn inside didDrawPage so every page in Print & Download gets the footer!
      drawSriBalajiFooter(docPdf, useLetterhead, true);
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

  return docPdf;
};

const buildBillPdfDocument = (booking) => {
  const docPdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

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
    margin: { top: 43, bottom: 40, left: 14, right: 14 },
    head: [["#", "Test / Health Package Description", "Amount"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [15, 45, 74] },
    styles: { fillColor: false, textColor: [15, 23, 42], fontSize: 9 },
    willDrawPage: function (data) {
      if (data.pageNumber > 1) {
        drawSriBalajiLetterhead(docPdf, true);
      }
    },
    didDrawPage: function () {
      drawSriBalajiFooter(docPdf, true, true);
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
    summaryRows.push(["Discount", `- Rs. ${booking.discount}`]);
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
    margin: { left: 110, right: 14, bottom: 40 },
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
