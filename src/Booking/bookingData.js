export const TIME_SLOTS = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM"
];

export const DEFAULT_EXCLUSIVE_PACKAGES = [
  {
    id: "pkg_basic_checkup",
    name: "Basic Health Checkup",
    originalPrice: 1600,
    price: 799,
    discountedPrice: 799,
    noExtraCoupons: true,
    isPackage: true,
    isExclusive: true,
    fasting: "10-12 Hrs Fasting",
    tat: "Same Day Report",
    highlights: [
      "Sugar Random",
      "HBA1C",
      "Lipid Profile (5)",
      "Liver Profile (5)",
      "Renal Profile (3)",
      "Complete Blood Count (CBC)"
    ],
    tests: [
      { name: "Sugar Random", refRange: "70 - 140", unit: "mg/dL", price: 60 },
      { name: "HBA1C", refRange: "4.0 - 5.6", unit: "%", price: 400 },
      { name: "Total Cholesterol", refRange: "< 200", unit: "mg/dL", price: 150 },
      { name: "Triglycerides", refRange: "< 150", unit: "mg/dL", price: 150 },
      { name: "HDL Cholesterol", refRange: "> 40", unit: "mg/dL", price: 150 },
      { name: "LDL Cholesterol", refRange: "< 100", unit: "mg/dL", price: 150 },
      { name: "VLDL Cholesterol", refRange: "5 - 40", unit: "mg/dL", price: 100 },
      { name: "Total Bilirubin", refRange: "0.2 - 1.2", unit: "mg/dL", price: 120 },
      { name: "SGPT (ALT)", refRange: "7 - 56", unit: "U/L", price: 120 },
      { name: "SGOT (AST)", refRange: "8 - 48", unit: "U/L", price: 120 },
      { name: "Alkaline Phosphatase", refRange: "44 - 147", unit: "U/L", price: 120 },
      { name: "Total Protein", refRange: "6.0 - 8.3", unit: "g/dL", price: 100 },
      { name: "Blood Urea", refRange: "15 - 40", unit: "mg/dL", price: 100 },
      { name: "Serum Creatinine", refRange: "0.6 - 1.2", unit: "mg/dL", price: 120 },
      { name: "Uric Acid", refRange: "3.5 - 7.2", unit: "mg/dL", price: 150 },
      { name: "Haemoglobin", refRange: "13.0 - 17.0", unit: "g/dL", price: 80 },
      { name: "Total WBC Count", refRange: "4000 - 11000", unit: "/cumm", price: 80 },
      { name: "Platelet Count", refRange: "1.5 - 4.5", unit: "Lakhs/cumm", price: 100 }
    ]
  },
  {
    id: "pkg_full_body_checkup",
    name: "Full Body Checkup",
    originalPrice: 2999,
    price: 1499,
    discountedPrice: 1499,
    noExtraCoupons: true,
    isPackage: true,
    isExclusive: true,
    fasting: "10-12 Hrs Fasting",
    tat: "Same Day Report",
    highlights: [
      "68 Parameters",
      "Thyroid Profile (3)",
      "Lipid Profile (10)",
      "Liver Profile (12)",
      "Kidney Profile (8)",
      "CBC (24)",
      "Urine Routine"
    ],
    tests: [
      { name: "Fasting Blood Sugar (FBS)", refRange: "70 - 100", unit: "mg/dL", price: 60 },
      { name: "HBA1C", refRange: "4.0 - 5.6", unit: "%", price: 400 },
      { name: "T3 (Triiodothyronine)", refRange: "80 - 200", unit: "ng/dL", price: 200 },
      { name: "T4 (Thyroxine)", refRange: "5.1 - 14.1", unit: "ug/dL", price: 200 },
      { name: "TSH (Ultra Sensitive)", refRange: "0.4 - 4.5", unit: "uIU/mL", price: 250 },
      { name: "Total Cholesterol", refRange: "< 200", unit: "mg/dL", price: 150 },
      { name: "Triglycerides", refRange: "< 150", unit: "mg/dL", price: 150 },
      { name: "HDL Cholesterol", refRange: "> 40", unit: "mg/dL", price: 150 },
      { name: "LDL Cholesterol", refRange: "< 100", unit: "mg/dL", price: 150 },
      { name: "VLDL Cholesterol", refRange: "5 - 40", unit: "mg/dL", price: 100 },
      { name: "Total Bilirubin", refRange: "0.2 - 1.2", unit: "mg/dL", price: 120 },
      { name: "Direct Bilirubin", refRange: "0.0 - 0.3", unit: "mg/dL", price: 100 },
      { name: "SGPT (ALT)", refRange: "7 - 56", unit: "U/L", price: 120 },
      { name: "SGOT (AST)", refRange: "8 - 48", unit: "U/L", price: 120 },
      { name: "Alkaline Phosphatase", refRange: "44 - 147", unit: "U/L", price: 120 },
      { name: "Total Protein", refRange: "6.0 - 8.3", unit: "g/dL", price: 100 },
      { name: "Serum Albumin", refRange: "3.5 - 5.0", unit: "g/dL", price: 100 },
      { name: "Blood Urea", refRange: "15 - 40", unit: "mg/dL", price: 100 },
      { name: "Serum Creatinine", refRange: "0.6 - 1.2", unit: "mg/dL", price: 120 },
      { name: "Uric Acid", refRange: "3.5 - 7.2", unit: "mg/dL", price: 150 },
      { name: "Serum Calcium", refRange: "8.5 - 10.2", unit: "mg/dL", price: 150 },
      { name: "Haemoglobin", refRange: "13.0 - 17.0", unit: "g/dL", price: 80 },
      { name: "Total RBC Count", refRange: "4.5 - 5.5", unit: "mill/cumm", price: 80 },
      { name: "Total WBC Count", refRange: "4000 - 11000", unit: "/cumm", price: 80 },
      { name: "Platelet Count", refRange: "1.5 - 4.5", unit: "Lakhs/cumm", price: 100 },
      { name: "Urine Sugar Random", refRange: "Nil", unit: "", price: 60 },
      { name: "Urine Albumin", refRange: "Nil", unit: "", price: 60 },
      { name: "Urine Microscopy", refRange: "Normal", unit: "", price: 80 }
    ]
  }
];

export const parseCatalogFromSnapshots = (catsDocs, pkgsDocs) => {
  const exclusiveList = [];
  const routinePkgs = [];

  (pkgsDocs || []).forEach((docSnap) => {
    const data = docSnap.data();
    const nameLower = (data.name || "").toLowerCase();

    const isRoutineProfile =
      nameLower.includes("cbc") ||
      nameLower.includes("blood count") ||
      nameLower.includes("lipid") ||
      nameLower.includes("liver") ||
      nameLower.includes("thyroid") ||
      nameLower.includes("urine") ||
      nameLower.includes("stool") ||
      nameLower.includes("renal") ||
      nameLower.includes("kidney") ||
      nameLower.includes("analysis") ||
      nameLower.includes("examination");

    const isMajorCheckup =
      nameLower.includes("checkup") ||
      nameLower.includes("full body") ||
      nameLower.includes("health") ||
      nameLower.includes("master") ||
      nameLower.includes("comprehensive") ||
      Boolean(data.isExclusive);

    if (isMajorCheckup && !isRoutineProfile) {
      exclusiveList.push({
        ...data,
        id: docSnap.id,
        isPackage: true,
        isExclusive: true,
        noExtraCoupons: true
      });
    } else {
      routinePkgs.push({
        ...data,
        id: docSnap.id,
        isPackage: true,
        isExclusive: false,
        category: "Routine Profiles"
      });
    }
  });

  const finalExclusive = [...exclusiveList];
  DEFAULT_EXCLUSIVE_PACKAGES.forEach((defPkg) => {
    const exists = finalExclusive.some(
      (p) => p.name.toLowerCase() === defPkg.name.toLowerCase()
    );
    if (!exists) {
      finalExclusive.push(defPkg);
    }
  });

  const searchMap = new Map();
  const catSet = new Set(["All", "Routine Profiles"]);

  routinePkgs.forEach((p) => {
    const validPrice = Number(p.discountedPrice || p.price || 0);
    if (validPrice > 0) {
      searchMap.set(p.name.trim().toLowerCase(), {
        ...p,
        price: validPrice
      });
    }
  });

  (catsDocs || []).forEach((docSnap) => {
    const data = docSnap.data();
    const catTitle = data.categoryName || "General Tests";
    catSet.add(catTitle);

    if (data.tests && Array.isArray(data.tests)) {
      data.tests.forEach((t) => {
        if (!t || !t.name) return;
        const validPrice = Number(t.discountedPrice || t.price || 0);
        if (validPrice > 0) {
          searchMap.set(t.name.trim().toLowerCase(), {
            ...t,
            price: validPrice,
            isPackage: false,
            category: catTitle
          });
        }
      });
    }
  });

  [...routinePkgs, ...finalExclusive].forEach((pkg) => {
    if (pkg.tests && Array.isArray(pkg.tests)) {
      pkg.tests.forEach((t) => {
        if (!t || !t.name) return;
        const key = t.name.trim().toLowerCase();
        const validPrice = Number(t.discountedPrice || t.price || 0);
        if (!searchMap.has(key) && validPrice > 0) {
          searchMap.set(key, {
            ...t,
            price: validPrice,
            isPackage: false,
            category: pkg.name
          });
        }
      });
    }
  });

  return {
    exclusivePackages: finalExclusive,
    searchableItems: Array.from(searchMap.values()),
    categoryNames: Array.from(catSet)
  };
};
