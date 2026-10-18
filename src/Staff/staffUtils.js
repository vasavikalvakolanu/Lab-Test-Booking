import jsPDF from "jspdf";
import "jspdf-autotable";

const LOGO_BASE64 = "";

export const getTestKey = (t, idx) => {
  if (t && t.id) return String(t.id);
  if (t && t.name) return String(t.name).trim();
  return "test_" + idx;
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

export const generatePDF = (patient, tests, results, useLetterhead) => {
  const docPdf = new jsPDF();

  if (useLetterhead) {
    if (LOGO_BASE64 && LOGO_BASE64.length > 100) {
      docPdf.addImage(LOGO_BASE64, "PNG", 14, 10, 25, 25);
    }
    docPdf.setFontSize(22);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text("SRI BALAJI DIAGNOSTICS", 105, 20, { align: "center" });
    docPdf.setFontSize(10);
    docPdf.setTextColor(100, 116, 139);
    docPdf.text(
      "123 Health Avenue, Medical District | Ph: +91 98765 43210",
      105,
      28,
      { align: "center" }
    );
    docPdf.setDrawColor(200, 200, 200);
    docPdf.line(14, 38, 196, 38);
  }

  const startY = useLetterhead ? 45 : 20;
  docPdf.setFontSize(10);
  docPdf.setTextColor(0, 0, 0);

  docPdf.text(`Patient Name: ${patient.name}`, 14, startY);
  docPdf.text(
    `Age / Gender: ${patient.age || "N/A"} Yrs / ${patient.gender || "N/A"}`,
    14,
    startY + 7
  );
  docPdf.text(`Contact: ${patient.phone || "Walk-in"}`, 14, startY + 14);

  docPdf.text(`Clinical ID: ${patient.clinicalId || "N/A"}`, 130, startY);
  docPdf.text(`Date: ${patient.date}`, 130, startY + 7);
  docPdf.text(
    `Ref Doctor: ${patient.doctorName || "Self Walk-in"}`,
    130,
    startY + 14
  );

  const tableData = (tests || []).map((t, idx) => {
    const key = getTestKey(t, idx);
    const res = (results && (results[key] || results[t.name])) || {
      value: "-",
      flag: "Normal"
    };
    const displayName = t.parentPackage
      ? `${t.name} (${t.parentPackage})`
      : t.name;
    return [
      displayName,
      res.value || "-",
      res.flag === "Normal" ? "" : res.flag,
      t.refRange || "-",
      t.unit || ""
    ];
  });

  docPdf.autoTable({
    startY: startY + 22,
    head: [
      ["Test Description", "Result Value", "Flag", "Reference Range", "Unit"]
    ],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
    didParseCell: function (data) {
      if (
        data.section === "body" &&
        (data.column.index === 1 || data.column.index === 2)
      ) {
        const flag = tableData[data.row.index][2];
        if (flag === "High" || flag === "Low" || flag === "Critical") {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  });

  const finalY = docPdf.lastAutoTable.finalY + 30;
  docPdf.text("_________________________", 140, finalY);
  docPdf.text("Chief Pathologist", 148, finalY + 6);
  docPdf.setFontSize(8);
  docPdf.text("Electronically Verified Report", 146, finalY + 11);

  docPdf.save(`${patient.clinicalId || "Report"}_${patient.name}.pdf`);
};
