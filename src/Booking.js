import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";

// Built-in fallback Exclusive Packages matching balajilabs.in original design
const DEFAULT_EXCLUSIVE_PACKAGES = [
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

function CustomerPortal() {
  const [exclusivePackages, setExclusivePackages] = useState([]);
  const [searchableItems, setSearchableItems] = useState([]);
  const [categoryNames, setCategoryNames] = useState([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");

  const [coupons, setCoupons] = useState([]);
  const [settings, setSettings] = useState({
    deliveryEnabled: true,
    homeVisitFee: 100,
    freeDeliveryThreshold: 999
  });

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [expandedPkgName, setExpandedPkgName] = useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    date: todayStr,
    timeSlot: "",
    address: ""
  });
  const [collectionType, setCollectionType] = useState("home");

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const timeSlots = [
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

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [catsSnap, pkgsSnap, couponsSnap, settingsSnap] =
          await Promise.all([
            getDocs(collection(db, "testCategories")),
            getDocs(collection(db, "packages")),
            getDocs(collection(db, "coupons")),
            getDoc(doc(db, "settings", "general")).catch(() => null)
          ]);

        setCoupons(couponsSnap.docs.map((d) => d.data()));
        if (settingsSnap && settingsSnap.exists()) {
          setSettings((prev) => ({ ...prev, ...settingsSnap.data() }));
        }

        const exclusiveList = [];
        const routinePkgs = [];

        pkgsSnap.docs.forEach((docSnap) => {
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

        // Merge with built-in Basic & Full Body Checkups if not already in Firestore
        const finalExclusive = [...exclusiveList];
        DEFAULT_EXCLUSIVE_PACKAGES.forEach((defPkg) => {
          const exists = finalExclusive.some(
            (p) => p.name.toLowerCase() === defPkg.name.toLowerCase()
          );
          if (!exists) {
            finalExclusive.push(defPkg);
          }
        });
        setExclusivePackages(finalExclusive);

        // Build searchable map of routine profiles + individual tests
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

        catsSnap.docs.forEach((docSnap) => {
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

        // Also extract individual tests from packages ONLY if they have a valid price > 0
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

        setCategoryNames(Array.from(catSet));
        setSearchableItems(Array.from(searchMap.values()));
      } catch (error) {
        console.error("Error fetching catalog:", error);
        setExclusivePackages(DEFAULT_EXCLUSIVE_PACKAGES);
      }
    };

    fetchCatalog();
  }, []);

  // Filtered list for Section 1 (Select Lab Tests)
  const displayedTests = searchableItems.filter((item) => {
    if (!item || !item.name) return false;
    const matchesSearch = search
      ? item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.category &&
          item.category.toLowerCase().includes(search.toLowerCase()))
      : true;
    const matchesCategory =
      activeCategoryFilter === "All" ||
      item.category === activeCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Cart Toggle Helper
  const isInCart = (itemName) =>
    cart.some((c) => c.name.toLowerCase() === itemName.toLowerCase());

  const toggleCartItem = (item) => {
    if (isInCart(item.name)) {
      setCart(
        cart.filter((c) => c.name.toLowerCase() !== item.name.toLowerCase())
      );
    } else {
      const safePrice = Number(item.discountedPrice || item.price || 0);
      setCart([...cart, { ...item, price: safePrice }]);
    }
  };

  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, idx) => idx !== indexToRemove));
  };

  // Accurate Pricing Calculation (Respects NO EXTRA COUPONS on Exclusive Packages)
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.discountedPrice || item.price || 0),
    0
  );

  const discountableSubtotal = cart.reduce((sum, item) => {
    if (item.noExtraCoupons || item.isExclusive) return sum;
    return sum + Number(item.discountedPrice || item.price || 0);
  }, 0);

  const discountAmount = appliedPromo
    ? Math.round((discountableSubtotal * Number(appliedPromo.discount || 0)) / 100)
    : 0;

  const baseHomeFee = Number(settings.homeVisitFee || 100);
  const freeThreshold = Number(settings.freeDeliveryThreshold || 999);
  const deliveryFee =
    collectionType === "home"
      ? subtotal >= freeThreshold
        ? 0
        : baseHomeFee
      : 0;

  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  const applyPromoCode = () => {
    if (!promoInput.trim()) return;
    const found = coupons.find(
      (c) => (c.code || "").toUpperCase() === promoInput.trim().toUpperCase()
    );
    if (!found) {
      alert("Invalid or expired promo code.");
      setAppliedPromo(null);
      return;
    }
    if (discountableSubtotal === 0 && cart.length > 0) {
      alert(
        "Exclusive Health Packages are already heavily discounted and marked 'No Extra Coupons'. Promo codes apply to individual tests and routine profiles."
      );
      return;
    }
    setAppliedPromo(found);
  };

  const handleBooking = async () => {
    const cleanPhone = (patient.phone || "").replace(/\D/g, "");
    if (!patient.name.trim()) {
      return alert("Please enter the patient's full name.");
    }
    if (cleanPhone.length !== 10) {
      return alert("Please enter a valid 10-digit WhatsApp mobile number.");
    }
    if (!patient.age || Number(patient.age) <= 0) {
      return alert("Please enter the patient's age.");
    }
    if (!patient.date || !patient.timeSlot) {
      return alert("Please select a preferred date and time slot.");
    }
    if (collectionType === "home" && !patient.address.trim()) {
      return alert("Please enter your complete address for Home Collection.");
    }
    if (cart.length === 0) {
      return alert("Please select at least one test or health package.");
    }

    setIsSubmitting(true);
    try {
      const dateCode = patient.date.replace(/-/g, "");
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `WEB-${dateCode}-${randCode}`;

      const flatTests = cart.flatMap((t) =>
        t.isPackage && t.tests && t.tests.length > 0
          ? t.tests.map((sub) => ({ ...sub, parentPackage: t.name }))
          : [t]
      );

      const bookingPayload = {
        bookingRef,
        name: patient.name.trim(),
        phone: cleanPhone,
        age: patient.age,
        gender: patient.gender,
        date: patient.date,
        timeSlot: patient.timeSlot,
        address: collectionType === "home" ? patient.address.trim() : "",
        collectionType,
        tests: flatTests,
        cartItems: cart,
        subtotal,
        discount: discountAmount,
        couponUsed: appliedPromo ? appliedPromo.code : "",
        deliveryFee,
        total: grandTotal,
        balanceDue: grandTotal,
        cashPaid: 0,
        upiPaid: 0,
        status: "pending",
        createdAt: new Date().toISOString(),
        downloadLogs: [],
        history: [
          {
            action: "Online Booking Created by Patient",
            by: "Customer Portal",
            time: new Date().toISOString()
          }
        ]
      };

      await addDoc(collection(db, "bookings"), bookingPayload);

      setConfirmedBooking(bookingPayload);
      setCart([]);
      setPatient({
        name: "",
        phone: "",
        age: "",
        gender: "Male",
        date: todayStr,
        timeSlot: "",
        address: ""
      });
      setPromoInput("");
      setAppliedPromo(null);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Error saving booking. Please check your connection and try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans py-6 px-4 md:px-8">
      {/* ======================================================== */}
      {/* RESTORED ORIGINAL HERO CARD (Matches balajilabs.in)       */}
      {/* ======================================================== */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border-t-4 border-blue-600 p-6 md:p-8 mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#153e90] tracking-tight mb-2">
          Sri Balaji Diagnostics
        </h1>
        <p className="text-slate-600 font-medium text-base md:text-lg mb-5">
          Professional Lab Tests &amp; Home Collection
        </p>

        <div className="inline-flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-full text-sm text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="text-rose-500">📍</span>
            Sathiraju complex, near Ganapathi Bhojanam hotel, Main road,
            Kothapeta
          </span>
          <span className="hidden md:inline text-slate-300">|</span>
          <a
            href="tel:+919849923729"
            className="flex items-center gap-1.5 font-extrabold text-[#153e90] hover:underline"
          >
            <span className="text-rose-500">📞</span> +91 9849923729
          </a>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN 2-COLUMN LAYOUT                                     */}
      {/* ======================================================== */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN (7 Cols): Exclusive Packages + Search Lab Tests */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. EXCLUSIVE HEALTH PACKAGES SHOWCASE */}
          <div className="bg-gradient-to-br from-[#fdf4ff] via-[#faf5ff] to-[#f3e8ff] p-6 md:p-7 rounded-2xl border border-purple-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-extrabold text-[#581c87] flex items-center gap-2">
                <span>✨</span> Exclusive Health Packages
              </h2>
              <span className="text-xs font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                Free Home Sample Collection
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exclusivePackages.map((pkg, idx) => {
                const added = isInCart(pkg.name);
                const finalPrice = Number(pkg.discountedPrice || pkg.price || 0);
                const mrpPrice = Number(
                  pkg.originalPrice || Math.round(finalPrice * 1.6)
                );
                const savingsPercent = Math.round(
                  ((mrpPrice - finalPrice) / mrpPrice) * 100
                );
                const pillList =
                  pkg.highlights && pkg.highlights.length > 0
                    ? pkg.highlights
                    : (pkg.tests || []).map((t) => t.name);

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm hover:shadow-md transition relative flex flex-col justify-between pt-6 px-5 pb-5"
                  >
                    {/* Floating SPECIAL OFFER Pill */}
                    <div className="absolute -top-3.5 right-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-full shadow-sm uppercase tracking-wider">
                      Special Offer
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-[#3b0764] mb-2">
                        {pkg.name}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="bg-orange-100 text-orange-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wide">
                          No Extra Coupons
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                          ⚡ {pkg.tat || "Same Day Report"}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Package Includes:
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {pillList.slice(0, 6).map((label, i) => (
                          <span
                            key={i}
                            className="bg-[#f5f3ff] text-[#5b21b6] border border-[#ddd6fe] px-2.5 py-1 rounded-md text-xs font-semibold"
                          >
                            {label}
                          </span>
                        ))}
                        {pillList.length > 6 && (
                          <button
                            onClick={() =>
                              setExpandedPkgName(
                                expandedPkgName === pkg.name ? null : pkg.name
                              )
                            }
                            className="text-xs font-bold text-purple-700 underline ml-1"
                          >
                            {expandedPkgName === pkg.name
                              ? "Show Less"
                              : `+${pillList.length - 6} More`}
                          </button>
                        )}
                      </div>

                      {expandedPkgName === pkg.name && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg border text-xs text-slate-600 max-h-40 overflow-y-auto">
                          <p className="font-bold text-slate-700 mb-1">
                            Included Parameters:
                          </p>
                          {(pkg.tests || []).map((t, i) => (
                            <span key={i} className="inline-block mr-2 mb-1">
                              • {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 line-through font-semibold">
                            ₹{mrpPrice}
                          </span>
                          {savingsPercent > 0 && (
                            <span className="text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                              {savingsPercent}% OFF
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-extrabold text-[#153e90]">
                          ₹{finalPrice}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleCartItem(pkg)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm ${
                          added
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-[#6d28d9] hover:bg-[#5b21b6] text-white"
                        }`}
                      >
                        {added ? "✓ Added" : "Select Package"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. SELECT LAB TESTS & ROUTINE PROFILES (CBC, Lipid, Individual Tests) */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#153e90]">
                  1. Select Lab Tests
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Search individual tests (e.g., Blood Sugar, Platelet Count) or
                  routine profiles (CBC, Lipid Profile)
                </p>
              </div>
              <a
                href="https://wa.me/919849923729?text=Hello%20Sri%20Balaji%20Diagnostics,%20I%20have%20a%20doctor%20prescription%20and%20need%20help%20booking%20tests."
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 transition inline-flex items-center gap-1.5 self-start"
              >
                <span>📄</span> Have a Prescription? WhatsApp Us
              </a>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <span className="absolute left-4 top-3.5 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Search for a test (e.g., Blood Sugar, CBC, Lipid Profile, Thyroid)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 border-2 border-blue-400 rounded-xl outline-none focus:border-blue-600 text-slate-700 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Category Filter Chips */}
            {categoryNames.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                {categoryNames.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                      activeCategoryFilter === cat
                        ? "bg-[#153e90] text-white border-[#153e90]"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Test List */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {displayedTests.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm font-medium">
                    No matching lab tests found.
                  </p>
                  <p className="text-xs mt-1">
                    Try searching a simpler keyword or clear the category
                    filter.
                  </p>
                </div>
              ) : (
                displayedTests.map((item, idx) => {
                  const added = isInCart(item.name);
                  const price = Number(item.discountedPrice || item.price || 0);
                  const paramCount =
                    item.tests && item.tests.length > 0
                      ? item.tests.length
                      : null;

                  return (
                    <div
                      key={idx}
                      className={`flex justify-between items-center p-4 rounded-xl border transition ${
                        added
                          ? "border-emerald-500 bg-emerald-50/40"
                          : item.isPackage
                          ? "border-amber-200 bg-amber-50/30 hover:border-amber-400"
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-base">
                            {item.name}
                          </h4>
                          {item.isPackage && (
                            <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                              Profile{" "}
                              {paramCount ? `(${paramCount} Tests)` : ""}
                            </span>
                          )}
                          {item.category && !item.isPackage && (
                            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-base font-extrabold text-emerald-600">
                            ₹{price}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • Reports within 6-12 hrs
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleCartItem(item)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm border transition shrink-0 ${
                          added
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white"
                        }`}
                      >
                        {added ? "✓ Added" : "Add +"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN (5 Cols): Patient Details & Booking Summary */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 self-start sticky top-6">
          <h2 className="text-2xl font-extrabold text-[#153e90] mb-5">
            2. Patient Details
          </h2>

          {/* Home Collection vs Lab Visit Toggle */}
          <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-100 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setCollectionType("home")}
              className={`py-2.5 rounded-lg font-bold text-sm transition ${
                collectionType === "home"
                  ? "bg-white text-[#153e90] shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🏠 Home Collection
            </button>
            <button
              type="button"
              onClick={() => setCollectionType("lab")}
              className={`py-2.5 rounded-lg font-bold text-sm transition ${
                collectionType === "lab"
                  ? "bg-white text-[#153e90] shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🏥 Lab Visit
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter patient name"
                value={patient.name}
                onChange={(e) =>
                  setPatient({ ...patient, name: e.target.value })
                }
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  maxLength="10"
                  placeholder="10-digit mobile number"
                  value={patient.phone}
                  onChange={(e) =>
                    setPatient({ ...patient, phone: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Age (Yrs) *
                  </label>
                  <input
                    type="number"
                    placeholder="Age"
                    value={patient.age}
                    onChange={(e) =>
                      setPatient({ ...patient, age: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Gender *
                  </label>
                  <select
                    value={patient.gender}
                    onChange={(e) =>
                      setPatient({ ...patient, gender: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm bg-white"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Child</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={patient.date}
                  onChange={(e) =>
                    setPatient({ ...patient, date: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Preferred Time Slot *
                </label>
                <select
                  value={patient.timeSlot}
                  onChange={(e) =>
                    setPatient({ ...patient, timeSlot: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm bg-white"
                >
                  <option value="">Select Time Slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {collectionType === "home" && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Home Collection Address *
                </label>
                <textarea
                  rows="2"
                  placeholder="Door No, Street Name, Landmark, Area..."
                  value={patient.address}
                  onChange={(e) =>
                    setPatient({ ...patient, address: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Booking Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-extrabold text-slate-800">Booking Summary</h3>
              <span className="text-xs font-bold text-slate-500">
                {cart.length} Item(s)
              </span>
            </div>

            <div className="space-y-2.5 mb-4 border-b border-slate-200 pb-4 max-h-48 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No tests selected yet.
                </p>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-slate-100"
                  >
                    <div className="pr-2">
                      <span className="font-semibold text-slate-800 block">
                        {item.name}
                      </span>
                      {item.noExtraCoupons && (
                        <span className="text-[10px] text-orange-700 font-bold">
                          Special Offer (No Extra Coupon)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-bold text-slate-900">
                        ₹{Number(item.discountedPrice || item.price || 0)}
                      </span>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-rose-500 hover:bg-rose-50 w-6 h-6 rounded-full font-bold flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Promo Code Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Promo Code (if any)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                className="flex-1 p-2.5 border border-slate-300 rounded-lg uppercase text-xs font-bold outline-none focus:border-blue-500 bg-white"
              />
              <button
                type="button"
                onClick={applyPromoCode}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition"
              >
                Apply
              </button>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1.5 text-sm text-slate-600 mb-3">
              <div className="flex justify-between">
                <span>Tests Subtotal</span>
                <span className="font-bold text-slate-800">₹{subtotal}</span>
              </div>
              {appliedPromo && discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Promo Discount ({appliedPromo.code})</span>
                  <span>- ₹{discountAmount}</span>
                </div>
              )}
              {collectionType === "home" && (
                <div className="flex justify-between">
                  <span>Home Collection Fee</span>
                  <span className="font-bold text-slate-800">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="font-extrabold text-[#153e90] text-lg">
                Total Amount
              </span>
              <span className="font-extrabold text-[#153e90] text-2xl">
                ₹{grandTotal}
              </span>
            </div>
          </div>

          <button
            onClick={handleBooking}
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-extrabold rounded-xl transition disabled:bg-slate-400 shadow-md"
          >
            {isSubmitting ? "Confirming Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* POST-BOOKING CONFIRMATION MODAL                          */}
      {/* ======================================================== */}
      {confirmedBooking && (
        <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl border text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ✓
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 mb-1">
              Booking Confirmed!
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reference ID:{" "}
              <span className="font-mono font-bold text-slate-800">
                {confirmedBooking.bookingRef}
              </span>
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border text-left text-xs space-y-2 mb-6">
              <p>
                <span className="font-bold">Patient:</span>{" "}
                {confirmedBooking.name} ({confirmedBooking.age}Y /{" "}
                {confirmedBooking.gender})
              </p>
              <p>
                <span className="font-bold">Schedule:</span>{" "}
                {confirmedBooking.date} | {confirmedBooking.timeSlot}
              </p>
              <p>
                <span className="font-bold">Visit Type:</span>{" "}
                {confirmedBooking.collectionType === "home"
                  ? "Home Sample Collection"
                  : "Lab Visit"}
              </p>
              <p>
                <span className="font-bold">Tests Booked:</span>{" "}
                {(confirmedBooking.cartItems || [])
                  .map((t) => t.name)
                  .join(", ")}
              </p>
              <p className="text-sm font-extrabold text-[#153e90] pt-2 border-t">
                Total Payable: ₹{confirmedBooking.total}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={`https://wa.me/919849923729?text=${encodeURIComponent(
                  `Hello Sri Balaji Diagnostics, I have booked a test.\nBooking ID: ${confirmedBooking.bookingRef}\nName: ${confirmedBooking.name}\nDate:${confirmedBooking.date} (${confirmedBooking.timeSlot})\nTotal: ₹${confirmedBooking.total}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition"
              >
                📲 Send Booking Details on WhatsApp
              </a>
              <button
                onClick={() => setConfirmedBooking(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPortal;
