import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, doc, arrayUnion } from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ==========================================
// HELPER: UNIQUE KEY PER TEST PARAMETER
// ==========================================
const getTestKey = (t, idx) => {
  if (t && t.id) return String(t.id);
  if (t && t.name) return String(t.name).trim();
  return "test_" + idx;
};

// ==========================================
// PDF GENERATION ENGINE (FINAL DOWNLOAD ONLY)
// ==========================================
const LOGO_BASE64 = "";

const generatePDF = (patient, tests, results, useLetterhead) => {
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

// ==========================================
// MAIN STAFF PORTAL UI
// ==========================================
function Staff() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [activeView, setActiveView] = useState("registration");
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [referrals, setReferrals] = useState([]);

  // --- Walk-in Registration State ---
  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    doctorId: ""
  });
  const [selectedTests, setSelectedTests] = useState([]);
  const [payment, setPayment] = useState({ cash: 0, upi: 0 });

  // --- Two-Panel UI State ---
  const [activeSubgroup, setActiveSubgroup] = useState(null);
  const [staffSearch, setStaffSearch] = useState("");

  // --- Processing, Preview & Full Modification State ---
  const [processingBooking, setProcessingBooking] = useState(null);
  const [results, setResults] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editPatient, setEditPatient] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    doctorId: "",
    date: "",
    collectionType: "lab",
    address: ""
  });
  const [editableTests, setEditableTests] = useState([]);
  const [editPayment, setEditPayment] = useState({
    cashPaid: 0,
    upiPaid: 0,
    discount: 0,
    deliveryFee: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchData();
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Authentication failed. Please check credentials.");
    }
  };

  const fetchData = async () => {
    try {
      const [snapBookings, snapCats, snapPkgs, snapRefs] = await Promise.all([
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "testCategories")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "referrals"))
      ]);

      const sortedBookings = snapBookings.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

      setBookings(sortedBookings);
      setCategories(snapCats.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPackages(snapPkgs.docs.map((d) => ({ id: d.id, ...d.data() })));
      setReferrals(snapRefs.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  };

  // --- Pipeline Variables ---
  const pendingBookings = bookings.filter(
    (b) => b.status === "pending" || !b.status
  );
  const processingBookings = bookings.filter((b) => b.status === "processing");
  const pastRecords = bookings.filter(
    (b) => b.status === "completed" || b.status === "done"
  );

  // --- Master Parameter Lookup Map ---
  const testMap = new Map();

  categories.forEach((c) => {
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

  packages.forEach((p) => {
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
  const formattedPackages = packages.map((p) => ({ ...p, isPackage: true }));
  const allCatalogItems = [...formattedPackages, ...allIndividualTests];

  // ==========================================
  // RECURSIVE PACKAGE UNPACKER FOR LAB DESK
  // ==========================================
  const expandToIndividualTests = (rawItems) => {
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

      const matchedPkg = packages.find((p) => {
        const pName = (p.name || "").trim().toLowerCase();
        return pName === rawName.toLowerCase() || pName === cleanNameLower;
      });

      if (matchedPkg && matchedPkg.tests && matchedPkg.tests.length > 0) {
        matchedPkg.tests.forEach((sub) => processItem(sub, matchedPkg.name));
        return;
      }

      const matchedCat = categories.find((c) => {
        const cName = (c.categoryName || "").trim().toLowerCase();
        return cName === rawName.toLowerCase() || cName === cleanNameLower;
      });

      if (matchedCat && matchedCat.tests && matchedCat.tests.length > 0) {
        matchedCat.tests.forEach((sub) =>
          processItem(sub, matchedCat.categoryName)
        );
        return;
      }

      const catalogMatch =
        testMap.get(rawName.toLowerCase()) || testMap.get(cleanNameLower);
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

  const searchResults = staffSearch
    ? allCatalogItems.filter((item) =>
        item.name.toLowerCase().includes(staffSearch.toLowerCase())
      )
    : [];

  const grandTotal = selectedTests.reduce(
    (sum, t) => sum + Number(t.discountedPrice || t.price || 0),
    0
  );
  const balanceDue = grandTotal - (Number(payment.cash) + Number(payment.upi));

  // --- Toggle Selection for Walk-in Cart ---
  const toggleTestSelection = (item) => {
    const exists = selectedTests.some((t) => t.name === item.name);
    if (exists) {
      setSelectedTests(selectedTests.filter((t) => t.name !== item.name));
    } else {
      setSelectedTests([...selectedTests, item]);
    }
  };

  // --- Walk-in Registration ---
  const handleWalkInRegistration = async () => {
    if (!patient.name || !patient.age || selectedTests.length === 0) {
      return alert("Name, Age, and Tests are required.");
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const clinicalId = `SBD-${dateStr}-${randomId}`;

    const flatTests = expandToIndividualTests(selectedTests);

    await addDoc(collection(db, "bookings"), {
      ...patient,
      referralDoctorId: patient.doctorId || "",
      clinicalId,
      tests: flatTests,
      cartItems: selectedTests,
      subtotal: grandTotal,
      total: grandTotal,
      cashPaid: Number(payment.cash),
      upiPaid: Number(payment.upi),
      balanceDue,
      collectionType: "lab",
      status: "processing",
      date: new Date().toISOString().slice(0, 10),
      timeSlot: "Walk-in",
      history: [
        {
          action: "Registered Walk-in",
          by: user.email,
          time: new Date().toISOString()
        }
      ],
      downloadLogs: []
    });

    setPatient({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
    setSelectedTests([]);
    setPayment({ cash: 0, upi: 0 });
    fetchData();
    alert(`Registration Success. Clinical ID: ${clinicalId}`);
  };

  // --- Web Collection Approval ---
  const markSampleCollected = async (b) => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const clinicalId = b.clinicalId || `SBD-${dateStr}-${randomId}`;

    const rawSource =
      b.cartItems && b.cartItems.length > 0 ? b.cartItems : b.tests || [];
    const flatTests = expandToIndividualTests(rawSource);

    await updateDoc(doc(db, "bookings", b.id), {
      status: "processing",
      clinicalId: clinicalId,
      tests: flatTests,
      history: arrayUnion({
        action: "Sample Collected",
        by: user.email,
        time: new Date().toISOString()
      })
    });
    fetchData();
  };

  // --- Populate Full Edit State ---
  const populateEditState = (b) => {
    setEditPatient({
      name: b.name || "",
      phone: b.phone || "",
      age: b.age || "",
      gender: b.gender || "Male",
      doctorId: b.doctorId || b.referralDoctorId || "",
      date: b.date || new Date().toISOString().slice(0, 10),
      collectionType: b.collectionType || "lab",
      address: b.address || ""
    });
    const currentCart =
      b.cartItems && b.cartItems.length > 0 ? b.cartItems : b.tests || [];
    setEditableTests(currentCart);
    setEditPayment({
      cashPaid: Number(b.cashPaid || 0),
      upiPaid: Number(b.upiPaid || 0),
      discount: Number(b.discount || 0),
      deliveryFee: Number(b.deliveryFee || 0)
    });
  };

  // --- Open Patient Record ---
  const openPatientRecord = (b, startInEditMode) => {
    const rawSource =
      b.tests && b.tests.length > 0 ? b.tests : b.cartItems || [];
    const unpackedTests = expandToIndividualTests(rawSource);

    const updatedBooking = {
      ...b,
      tests: unpackedTests
    };

    setProcessingBooking(updatedBooking);
    setResults(b.results || {});
    populateEditState(updatedBooking);
    setEditMode(Boolean(startInEditMode));
  };

  const openEditMode = () => {
    if (!processingBooking) return;
    populateEditState(processingBooking);
    setEditMode(true);
  };

  // --- Save Full Record Modifications (Demographics + Referral + Tests + Billing) ---
  const handleUpdateRecord = async () => {
    if (!editPatient.name) {
      return alert("Patient Name is required.");
    }
    if (editableTests.length === 0) {
      return alert("At least one test or package is required.");
    }

    const newSubtotal = editableTests.reduce(
      (sum, t) => sum + Number(t.discountedPrice || t.price || 0),
      0
    );
    const newDiscount = Number(editPayment.discount || 0);
    const newDeliveryFee =
      editPatient.collectionType === "home"
        ? Number(editPayment.deliveryFee || 0)
        : 0;
    const newTotal = newSubtotal - newDiscount + newDeliveryFee;

    const newCash = Number(editPayment.cashPaid || 0);
    const newUpi = Number(editPayment.upiPaid || 0);
    const newBalance = newTotal - (newCash + newUpi);

    const newFlatTests = expandToIndividualTests(editableTests);

    const logEntry = {
      action: `Modified Record Details, Tests & Billing (Patient: ${editPatient.name}, Total: ₹${newTotal})`,
      by: user.email,
      time: new Date().toISOString()
    };

    const updatedFields = {
      name: editPatient.name,
      phone: editPatient.phone,
      age: editPatient.age,
      gender: editPatient.gender,
      doctorId: editPatient.doctorId,
      referralDoctorId: editPatient.doctorId,
      date: editPatient.date,
      collectionType: editPatient.collectionType,
      address: editPatient.collectionType === "home" ? editPatient.address : "",
      cartItems: editableTests,
      tests: newFlatTests,
      subtotal: newSubtotal,
      discount: newDiscount,
      deliveryFee: newDeliveryFee,
      total: newTotal,
      cashPaid: newCash,
      upiPaid: newUpi,
      balanceDue: newBalance
    };

    await updateDoc(doc(db, "bookings", processingBooking.id), {
      ...updatedFields,
      history: arrayUnion(logEntry)
    });

    setProcessingBooking({
      ...processingBooking,
      ...updatedFields
    });

    setEditMode(false);
    fetchData();
    alert("Patient details, tests, and billing updated successfully.");
  };

  // --- Result Finalization ---
  const saveResults = async () => {
    if (!window.confirm("Lock these results and finalize the report?")) return;

    await updateDoc(doc(db, "bookings", processingBooking.id), {
      tests: processingBooking.tests,
      results,
      status: "completed",
      history: arrayUnion({
        action: "Results Locked & Verified",
        by: user.email,
        time: new Date().toISOString()
      })
    });

    setProcessingBooking(null);
    setActiveView("records");
    fetchData();
  };

  const getDoctorName = (b) => {
    if (!b) return "Self Walk-in";
    const docId = b.doctorId || b.referralDoctorId;
    const matchedDoc = referrals.find((r) => r.id === docId);
    return matchedDoc ? matchedDoc.doctorName : "Self Walk-in";
  };

  const downloadFinalPDF = async (b) => {
    const docName = getDoctorName(b);
    const currentTests = expandToIndividualTests(b.tests || b.cartItems || []);
    const currentResults = b.results || {};

    generatePDF(
      { ...b, doctorName: docName },
      currentTests,
      currentResults,
      true
    );

    const downloadLog = {
      by: user.email,
      time: new Date().toISOString()
    };

    await updateDoc(doc(db, "bookings", b.id), {
      reportGenerated: true,
      reportGeneratedBy: b.reportGeneratedBy || user.email,
      reportGeneratedAt: b.reportGeneratedAt || new Date().toISOString(),
      downloadLogs: arrayUnion(downloadLog),
      history: arrayUnion({
        action: "PDF Downloaded",
        by: user.email,
        time: new Date().toISOString()
      })
    });

    fetchData();
  };

  const unlockRecord = async (b) => {
    const msg =
      "Unlock this record? This will move it back to the Lab Desk so you can modify patient details, tests, billing, and results.";
    if (!window.confirm(msg)) return;

    const unpackedTests = expandToIndividualTests(b.tests || b.cartItems || []);

    await updateDoc(doc(db, "bookings", b.id), {
      status: "processing",
      tests: unpackedTests,
      history: arrayUnion({
        action: "Record Unlocked for Modification",
        by: user.email,
        time: new Date().toISOString()
      })
    });

    const unlockedBooking = { ...b, status: "processing", tests: unpackedTests };
    setActiveView("processing");
    openPatientRecord(unlockedBooking, true);
    fetchData();
  };

  // ==========================================
  // RENDER: LOGIN
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded border shadow-sm w-96"
        >
          <h2 className="text-xl font-bold text-emerald-600 mb-6 text-center">
            Staff Portal Login
          </h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Staff Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-emerald-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-emerald-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded mt-2"
            >
              Login to Desk
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // RENDER: DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Sri Balaji Diagnostics</h1>
            <p className="text-xs text-slate-500 font-medium">
              Laboratory Staff Desk
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border">
              {user.email}
            </span>
            <button
              onClick={() => signOut(auth)}
              className="text-sm font-medium border px-4 py-1.5 rounded hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="bg-white rounded border shadow-sm p-6">
          {/* NAVIGATION TABS */}
          <div className="flex flex-wrap gap-4 mb-6 border-b pb-4">
            <button
              onClick={() => {
                setActiveView("registration");
                setProcessingBooking(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeView === "registration"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              1. Front Desk Walk-In
            </button>
            <button
              onClick={() => {
                setActiveView("collections");
                setProcessingBooking(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded flex items-center ${
                activeView === "collections"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              2. Web Collections
              {pendingBookings.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                  {pendingBookings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView("processing")}
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeView === "processing"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              3. Lab Result Desk ({processingBookings.length})
            </button>
            <button
              onClick={() => {
                setActiveView("records");
                setProcessingBooking(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeView === "records"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              4. Past Records ({pastRecords.length})
            </button>
          </div>

          {/* ========================================== */}
          {/* VIEW 1: REGISTRATION                       */}
          {/* ========================================== */}
          {activeView === "registration" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold mb-4">Patient Demographics</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={patient.name}
                    onChange={(e) =>
                      setPatient({ ...patient, name: e.target.value })
                    }
                    className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={patient.phone}
                    onChange={(e) =>
                      setPatient({ ...patient, phone: e.target.value })
                    }
                    className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2 col-span-2">
                    <input
                      type="number"
                      placeholder="Age"
                      value={patient.age}
                      onChange={(e) =>
                        setPatient({ ...patient, age: e.target.value })
                      }
                      className="w-1/2 p-2 border rounded text-sm outline-none focus:border-emerald-500"
                    />
                    <select
                      value={patient.gender}
                      onChange={(e) =>
                        setPatient({ ...patient, gender: e.target.value })
                      }
                      className="w-1/2 p-2 border rounded text-sm outline-none focus:border-emerald-500"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Child</option>
                    </select>
                  </div>
                  <select
                    value={patient.doctorId}
                    onChange={(e) =>
                      setPatient({ ...patient, doctorId: e.target.value })
                    }
                    className="col-span-2 p-2 border rounded text-sm outline-none bg-slate-50 focus:border-emerald-500"
                  >
                    <option value="">No Referral (Self Walk-in)</option>
                    {referrals.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.doctorName}
                      </option>
                    ))}
                  </select>
                </div>

                <h3 className="text-sm font-bold mb-2">
                  Test & Package Selection
                </h3>

                <input
                  type="text"
                  placeholder="Search for any test or package..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full p-2 mb-3 border rounded text-sm outline-none focus:border-emerald-500"
                />

                {staffSearch ? (
                  <div className="h-64 overflow-y-auto border rounded bg-white p-2 mb-4">
                    {searchResults.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center mt-10">
                        No results found.
                      </p>
                    ) : (
                      searchResults.map((t, idx) => {
                        const isSelected = selectedTests.some(
                          (st) => st.name === t.name
                        );
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleTestSelection(t)}
                            className={`flex justify-between items-center p-3 mb-1 border rounded cursor-pointer transition ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50"
                                : "hover:border-emerald-300"
                            }`}
                          >
                            <div>
                              <div className="font-medium text-slate-800 text-sm">
                                {t.name}
                                {t.isPackage && (
                                  <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-1 py-0.5 rounded ml-1">
                                    Pkg
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                ₹{t.discountedPrice || t.price || 0}
                              </div>
                            </div>
                            {isSelected ? (
                              <span className="text-emerald-600 font-bold text-xl leading-none">
                                ✓
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xl leading-none">
                                +
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="flex h-64 border rounded bg-white overflow-hidden mb-4 shadow-sm">
                    <div className="w-1/2 border-r bg-slate-50 overflow-y-auto">
                      <div className="p-2 text-[10px] font-bold text-slate-500 bg-slate-200 border-b sticky top-0 uppercase tracking-wider">
                        Packages
                      </div>
                      {packages.map((p, i) => {
                        const isActive = activeSubgroup
                          ? activeSubgroup.name === p.name
                          : false;
                        return (
                          <div
                            key={`pkg-${i}`}
                            onClick={() =>
                              setActiveSubgroup({ ...p, type: "package" })
                            }
                            className={`p-3 text-sm cursor-pointer border-b transition ${
                              isActive
                                ? "bg-emerald-100 font-bold border-l-4 border-emerald-500"
                                : "hover:bg-emerald-50"
                            }`}
                          >
                            📦 {p.name}
                          </div>
                        );
                      })}

                      <div className="p-2 text-[10px] font-bold text-slate-500 bg-slate-200 border-b border-t sticky top-0 uppercase tracking-wider">
                        Test Groups
                      </div>
                      {categories.map((c, i) => {
                        const isActive = activeSubgroup
                          ? activeSubgroup.categoryName === c.categoryName
                          : false;
                        return (
                          <div
                            key={`cat-${i}`}
                            onClick={() =>
                              setActiveSubgroup({ ...c, type: "category" })
                            }
                            className={`p-3 text-sm cursor-pointer border-b transition ${
                              isActive
                                ? "bg-emerald-100 font-bold border-l-4 border-emerald-500"
                                : "hover:bg-emerald-50"
                            }`}
                          >
                            📁 {c.categoryName}
                          </div>
                        );
                      })}
                    </div>

                    <div className="w-1/2 overflow-y-auto p-2 bg-white">
                      {!activeSubgroup ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm italic text-center p-4">
                          Select a category or package on the left to view
                          tests.
                        </div>
                      ) : (
                        <div>
                          {activeSubgroup.type === "package" && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded">
                              <div className="font-bold text-amber-800 text-sm mb-1">
                                {activeSubgroup.name}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-amber-700 font-bold">
                                  ₹
                                  {activeSubgroup.discountedPrice ||
                                    activeSubgroup.price}
                                </span>
                                <button
                                  onClick={() =>
                                    toggleTestSelection(activeSubgroup)
                                  }
                                  className={`px-2 py-1 rounded font-bold text-xs transition ${
                                    selectedTests.some(
                                      (t) => t.name === activeSubgroup.name
                                    )
                                      ? "bg-amber-600 text-white"
                                      : "bg-white border border-amber-400 text-amber-700"
                                  }`}
                                >
                                  {selectedTests.some(
                                    (t) => t.name === activeSubgroup.name
                                  )
                                    ? "✓ Added"
                                    : "Add Full Package"}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase">
                            {activeSubgroup.type === "package"
                              ? "Individual Sub-Tests:"
                              : "Available Tests:"}
                          </div>

                          <div className="space-y-1">
                            {(activeSubgroup.tests || []).map((t, idx) => {
                              const isSelected = selectedTests.some(
                                (st) => st.name === t.name
                              );
                              return (
                                <div
                                  key={idx}
                                  onClick={() =>
                                    toggleTestSelection({
                                      ...t,
                                      isPackage: false
                                    })
                                  }
                                  className={`flex justify-between items-center p-2 border rounded cursor-pointer transition ${
                                    isSelected
                                      ? "border-emerald-500 bg-emerald-50"
                                      : "hover:border-emerald-300"
                                  }`}
                                >
                                  <div>
                                    <div className="font-medium text-slate-800 text-xs">
                                      {t.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      ₹{t.discountedPrice || t.price || 0}
                                    </div>
                                  </div>
                                  {isSelected ? (
                                    <span className="text-emerald-600 font-bold text-lg leading-none">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-lg leading-none">
                                      +
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedTests.length === 0 && (
                    <span className="text-xs text-slate-400">
                      No tests selected yet.
                    </span>
                  )}
                  {selectedTests.map((t, idx) => {
                    const isPackageTag = t.isPackage || t.type === "package";
                    return (
                      <span
                        key={idx}
                        className={`px-2 py-1 text-xs font-bold rounded border flex items-center ${
                          isPackageTag
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {t.name}
                        <button
                          onClick={() => toggleTestSelection(t)}
                          className="ml-2 text-red-500 font-bold hover:text-red-700 leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 p-6 border rounded shadow-inner">
                <h3 className="text-sm font-bold mb-4">Financial Counter</h3>

                <div className="space-y-2 mb-6 border-b pb-4">
                  {selectedTests.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Cart is empty...
                    </p>
                  ) : (
                    selectedTests.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm text-slate-600"
                      >
                        <span>{t.name}</span>
                        <span>₹{t.discountedPrice || t.price}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between font-bold text-xl mb-6">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      CASH TENDERED
                    </label>
                    <input
                      type="number"
                      value={payment.cash}
                      onChange={(e) =>
                        setPayment({ ...payment, cash: e.target.value })
                      }
                      className="w-full p-2 border rounded text-lg font-medium outline-none mt-1 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      UPI / CARD
                    </label>
                    <input
                      type="number"
                      value={payment.upi}
                      onChange={(e) =>
                        setPayment({ ...payment, upi: e.target.value })
                      }
                      className="w-full p-2 border rounded text-lg font-medium outline-none mt-1 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div
                  className={`p-4 rounded text-sm font-bold flex justify-between mb-6 border ${
                    balanceDue > 0
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  <span>BALANCE DUE:</span>
                  <span className="text-lg">₹{balanceDue}</span>
                </div>

                <button
                  onClick={handleWalkInRegistration}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 transition text-white rounded font-bold shadow-sm"
                >
                  Generate Clinical ID & Bill Patient
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 2: COLLECTIONS                        */}
          {/* ========================================== */}
          {activeView === "collections" && (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50 border-b border-amber-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-800">Date/Time</th>
                    <th className="p-4 font-bold text-slate-800">
                      Patient Details
                    </th>
                    <th className="p-4 font-bold text-slate-800">
                      Required Tests
                    </th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingBookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-8 text-center text-slate-400"
                      >
                        No pending web bookings.
                      </td>
                    </tr>
                  ) : (
                    pendingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-600">
                          <span className="block font-bold">{b.date}</span>
                          {b.timeSlot}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {b.name}
                          <span className="text-xs font-normal text-slate-500 block">
                            {b.phone} |{" "}
                            {b.collectionType === "home"
                              ? "Home Visit"
                              : "Lab Visit"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-600 max-w-xs truncate">
                          {(b.cartItems || b.tests || [])
                            .map((t) => t.name)
                            .join(", ")}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => markSampleCollected(b)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold transition shadow-sm"
                          >
                            Verify & Collect Sample
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 3: LAB DESK LIST                      */}
          {/* ========================================== */}
          {activeView === "processing" && !processingBooking && (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="p-4 font-bold text-slate-600">
                      Clinical ID
                    </th>
                    <th className="p-4 font-bold text-slate-600">Patient</th>
                    <th className="p-4 font-bold text-slate-600">
                      Required Tests
                    </th>
                    <th className="p-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processingBookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-8 text-center text-slate-400"
                      >
                        No samples pending processing.
                      </td>
                    </tr>
                  ) : (
                    processingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono text-slate-500 font-bold">
                          {b.clinicalId}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {b.name}
                          <span className="text-xs font-normal text-slate-400 block">
                            {b.age || "?"}Y / {b.gender || "?"} |{" "}
                            {b.phone || "No Phone"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-600 max-w-xs truncate">
                          {(b.cartItems || b.tests || [])
                            .map((t) => t.name)
                            .join(", ")}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => openPatientRecord(b, false)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded font-bold transition"
                          >
                            Open Record
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 3B: RESULT ENTRY & FULL MODIFICATION  */}
          {/* ========================================== */}
          {activeView === "processing" && processingBooking && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-start mb-6 bg-slate-50 p-4 border rounded shadow-sm">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    {processingBooking.name}
                  </h2>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm font-medium text-slate-600">
                    <span className="bg-white px-2 py-1 rounded border">
                      ID: {processingBooking.clinicalId}
                    </span>
                    <span className="bg-white px-2 py-1 rounded border">
                      Phone: {processingBooking.phone || "N/A"}
                    </span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">
                      Demographics: {processingBooking.age || "N/A"} Years,{" "}
                      {processingBooking.gender || "N/A"}
                    </span>
                    <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-200">
                      Ref: {getDoctorName(processingBooking)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded border ${
                        processingBooking.balanceDue > 0
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-emerald-100 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      Balance Due: ₹{processingBooking.balanceDue || 0}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setProcessingBooking(null)}
                    className="text-slate-500 hover:text-red-500 font-bold border bg-white px-4 py-2 rounded shadow-sm text-sm"
                  >
                    Save Draft & Close
                  </button>
                  {!editMode && (
                    <button
                      onClick={openEditMode}
                      className="text-emerald-700 font-bold border border-emerald-200 bg-emerald-50 px-4 py-2 rounded shadow-sm text-sm"
                    >
                      ⚙️ Modify Patient, Tests & Billing
                    </button>
                  )}
                </div>
              </div>

              {/* FULL RECORD MODIFICATION PANEL */}
              {editMode && (
                <div className="mb-6 border-2 border-emerald-400 bg-emerald-50 rounded-lg p-5 shadow-inner">
                  <h3 className="font-bold text-emerald-900 mb-4 text-base border-b border-emerald-200 pb-2">
                    Modify Patient Demographics, Referral, Tests & Billing
                  </h3>

                  {/* 1. Patient Demographics & Referral Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded border">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        PATIENT FULL NAME
                      </label>
                      <input
                        type="text"
                        value={editPatient.name}
                        onChange={(e) =>
                          setEditPatient({
                            ...editPatient,
                            name: e.target.value
                          })
                        }
                        className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        PHONE NUMBER
                      </label>
                      <input
                        type="tel"
                        value={editPatient.phone}
                        onChange={(e) =>
                          setEditPatient({
                            ...editPatient,
                            phone: e.target.value
                          })
                        }
                        className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">
                          AGE (YRS)
                        </label>
                        <input
                          type="number"
                          value={editPatient.age}
                          onChange={(e) =>
                            setEditPatient({
                              ...editPatient,
                              age: e.target.value
                            })
                          }
                          className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">
                          GENDER
                        </label>
                        <select
                          value={editPatient.gender}
                          onChange={(e) =>
                            setEditPatient({
                              ...editPatient,
                              gender: e.target.value
                            })
                          }
                          className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Child</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        REFERRING DOCTOR
                      </label>
                      <select
                        value={editPatient.doctorId}
                        onChange={(e) =>
                          setEditPatient({
                            ...editPatient,
                            doctorId: e.target.value
                          })
                        }
                        className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500 bg-slate-50"
                      >
                        <option value="">No Referral (Self Walk-in)</option>
                        {referrals.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.doctorName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        DATE
                      </label>
                      <input
                        type="date"
                        value={editPatient.date}
                        onChange={(e) =>
                          setEditPatient({
                            ...editPatient,
                            date: e.target.value
                          })
                        }
                        className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        COLLECTION TYPE
                      </label>
                      <select
                        value={editPatient.collectionType}
                        onChange={(e) =>
                          setEditPatient({
                            ...editPatient,
                            collectionType: e.target.value
                          })
                        }
                        className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="lab">Lab Visit</option>
                        <option value="home">Home Collection</option>
                      </select>
                    </div>

                    {editPatient.collectionType === "home" && (
                      <div className="md:col-span-3">
                        <label className="text-xs font-bold text-slate-500 block mb-1">
                          HOME COLLECTION ADDRESS
                        </label>
                        <input
                          type="text"
                          value={editPatient.address}
                          onChange={(e) =>
                            setEditPatient({
                              ...editPatient,
                              address: e.target.value
                            })
                          }
                          className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Tests & Financial Adjustments */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">
                        ADD OR REMOVE TESTS & PACKAGES
                      </label>
                      <select
                        onChange={(e) => {
                          const t = allCatalogItems.find(
                            (x) => x.name === e.target.value
                          );
                          if (t) {
                            setEditableTests([...editableTests, t]);
                          }
                        }}
                        className="w-full p-2 border rounded text-sm outline-none mb-4 bg-white"
                      >
                        <option value="">
                          Search & Add Any Test or Package...
                        </option>
                        {allCatalogItems.map((c, i) => (
                          <option key={i} value={c.name}>
                            {c.name} {c.isPackage && "(Pkg)"} - ₹
                            {c.discountedPrice || c.price}
                          </option>
                        ))}
                      </select>

                      <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                        {editableTests.map((t, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-white border p-2 rounded text-sm"
                          >
                            <span>
                              {t.name}{" "}
                              <span className="text-xs text-slate-500 font-bold">
                                (₹{t.discountedPrice || t.price || 0})
                              </span>
                            </span>
                            <button
                              onClick={() =>
                                setEditableTests(
                                  editableTests.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-red-500 font-bold hover:bg-red-50 px-2 rounded"
                            >
                              &times; Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded border shadow-sm">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500">
                            TOTAL CASH PAID (₹)
                          </label>
                          <input
                            type="number"
                            value={editPayment.cashPaid}
                            onChange={(e) =>
                              setEditPayment({
                                ...editPayment,
                                cashPaid: e.target.value
                              })
                            }
                            className="w-full p-2 border rounded font-medium outline-none mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">
                            TOTAL UPI / CARD PAID (₹)
                          </label>
                          <input
                            type="number"
                            value={editPayment.upiPaid}
                            onChange={(e) =>
                              setEditPayment({
                                ...editPayment,
                                upiPaid: e.target.value
                              })
                            }
                            className="w-full p-2 border rounded font-medium outline-none mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">
                            DISCOUNT AMOUNT (₹)
                          </label>
                          <input
                            type="number"
                            value={editPayment.discount}
                            onChange={(e) =>
                              setEditPayment({
                                ...editPayment,
                                discount: e.target.value
                              })
                            }
                            className="w-full p-2 border rounded font-medium outline-none mt-1"
                          />
                        </div>
                        {editPatient.collectionType === "home" && (
                          <div>
                            <label className="text-xs font-bold text-slate-500">
                              HOME VISIT FEE (₹)
                            </label>
                            <input
                              type="number"
                              value={editPayment.deliveryFee}
                              onChange={(e) =>
                                setEditPayment({
                                  ...editPayment,
                                  deliveryFee: e.target.value
                                })
                              }
                              className="w-full p-2 border rounded font-medium outline-none mt-1"
                            />
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-3 mb-4 space-y-1 text-sm">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Adjusted Grand Total:</span>
                          <span>
                            ₹
                            {editableTests.reduce(
                              (sum, t) =>
                                sum + Number(t.discountedPrice || t.price || 0),
                              0
                            ) -
                              Number(editPayment.discount || 0) +
                              (editPatient.collectionType === "home"
                                ? Number(editPayment.deliveryFee || 0)
                                : 0)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-700">
                          <span>Total Paid (Cash + UPI):</span>
                          <span>
                            ₹
                            {Number(editPayment.cashPaid || 0) +
                              Number(editPayment.upiPaid || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditMode(false)}
                          className="flex-1 py-2 bg-slate-100 text-slate-600 rounded font-bold border"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateRecord}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-sm"
                        >
                          Save All Modifications
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* INDIVIDUAL PARAMETER RESULT ENTRY TABLE */}
              <table className="w-full text-left text-sm border rounded overflow-hidden mb-6 shadow-sm">
                <thead className="bg-slate-800 text-white border-b">
                  <tr>
                    <th className="p-3">Test Parameter</th>
                    <th className="p-3">Reference Range</th>
                    <th className="p-3 w-64">Result Value</th>
                    <th className="p-3">Abnormal Flagging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(processingBooking.tests || []).map((t, idx) => {
                    const testKey = getTestKey(t, idx);
                    const resObj =
                      (results && (results[testKey] || results[t.name])) || {};
                    const currentFlag = resObj.flag || "Normal";

                    let rowClass = "hover:bg-slate-50";
                    if (currentFlag === "Critical") rowClass = "bg-red-50";
                    else if (currentFlag !== "Normal") rowClass = "bg-amber-50";

                    return (
                      <tr key={testKey} className={rowClass}>
                        <td className="p-4">
                          <span className="font-bold text-slate-800 block">
                            {t.name}
                          </span>
                          {t.parentPackage && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded border mt-1 inline-block">
                              {t.parentPackage}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-600">
                          {t.refRange || "-"}{" "}
                          <span className="font-bold">{t.unit || ""}</span>
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            placeholder="Enter Value"
                            value={resObj.value || ""}
                            onChange={(e) => {
                              setResults({
                                ...results,
                                [testKey]: {
                                  ...resObj,
                                  value: e.target.value,
                                  flag: currentFlag
                                }
                              });
                            }}
                            className={`w-full p-2 border rounded outline-none font-bold ${
                              currentFlag === "Critical"
                                ? "border-red-400 text-red-700 bg-white"
                                : "focus:border-emerald-500"
                            }`}
                          />
                        </td>
                        <td className="p-4 flex gap-1">
                          {["Normal", "Low", "High", "Critical"].map((f) => {
                            let btnClass =
                              "bg-white text-slate-500 hover:bg-slate-100";
                            if (currentFlag === f) {
                              if (f === "Normal") {
                                btnClass =
                                  "bg-emerald-500 text-white border-emerald-600";
                              } else if (f === "Critical") {
                                btnClass =
                                  "bg-red-600 text-white border-red-700 animate-pulse";
                              } else {
                                btnClass =
                                  "bg-amber-500 text-white border-amber-600";
                              }
                            }

                            return (
                              <button
                                key={f}
                                onClick={() => {
                                  setResults({
                                    ...results,
                                    [testKey]: {
                                      ...resObj,
                                      value: resObj.value || "",
                                      flag: f
                                    }
                                  });
                                }}
                                className={`px-2 py-1.5 text-xs font-bold rounded border transition ${btnClass}`}
                              >
                                {f}
                              </button>
                            );
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="flex-1 py-4 bg-white text-slate-800 rounded font-bold border-2 border-slate-300 hover:border-slate-800 shadow-sm"
                >
                  👀 Preview Document (Read-Only)
                </button>
                <button
                  onClick={saveResults}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold border-2 border-emerald-700 shadow-sm"
                >
                  🔒 Lock, Sign & Finalize Report
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 4: PAST RECORDS                       */}
          {/* ========================================== */}
          {activeView === "records" && (
            <div className="overflow-hidden rounded border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-600">ID / Date</th>
                    <th className="p-4 font-bold text-slate-600">Patient</th>
                    <th className="p-4 font-bold text-slate-600">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-8 text-center text-slate-400"
                      >
                        No completed records yet.
                      </td>
                    </tr>
                  ) : (
                    pastRecords.map((b) => {
                      const logList = b.downloadLogs || [];
                      const downloadTooltip = logList
                        .map(
                          (log) =>
                            `${log.by} at ${new Date(
                              log.time
                            ).toLocaleString()}`
                        )
                        .join(" | ");

                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-4 font-mono text-slate-500">
                            <span className="block font-bold">
                              {b.clinicalId}
                            </span>
                            {b.date}
                          </td>
                          <td className="p-4 font-semibold text-slate-800">
                            {b.name}
                            <span className="block text-xs font-normal text-slate-500">
                              {b.age || "N/A"}Y / {b.gender || "N/A"} |{" "}
                              {b.phone || "N/A"}
                            </span>
                          </td>
                          <td className="p-4">
                            {b.reportGenerated ? (
                              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold border border-emerald-200">
                                ✅ Generated by {b.reportGeneratedBy}
                              </span>
                            ) : (
                              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold border border-amber-200">
                                ⏳ Pending Generation
                              </span>
                            )}

                            {logList.length > 0 && (
                              <div className="mt-2 text-xs text-slate-500">
                                <span
                                  className="font-bold underline cursor-help"
                                  title={downloadTooltip}
                                >
                                  Downloaded {logList.length} time(s)
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => unlockRecord(b)}
                              className="bg-white border text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded font-bold transition"
                            >
                              Unlock & Modify
                            </button>
                            <button
                              onClick={() => downloadFinalPDF(b)}
                              className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-bold transition shadow-sm"
                            >
                              Download PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================== */}
          {/* READ-ONLY HTML PREVIEW MODAL (NO DOWNLOAD/PRINT) */}
          {/* ========================================== */}
          {showPreviewModal && processingBooking && (
            <div
              onContextMenu={(e) => e.preventDefault()}
              className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm select-none"
            >
              <div className="bg-slate-200 rounded-lg w-full max-w-4xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                  <div>
                    <h2 className="font-bold text-lg text-slate-800">
                      Quality Assurance Preview (View-Only)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Printing and downloading are disabled in preview mode.
                      Finalize the report first to generate the official PDF.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-slate-600 hover:text-red-600 hover:bg-red-50 border px-4 py-2 rounded font-bold transition"
                  >
                    Close Preview
                  </button>
                </div>

                {/* Locked A4 Sheet Replica */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10">
                  <div className="bg-white max-w-3xl mx-auto p-8 md:p-12 shadow-lg border border-slate-300 min-h-[840px] flex flex-col justify-between">
                    <div>
                      {/* Letterhead */}
                      <div className="text-center border-b-2 border-slate-300 pb-4 mb-6">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-wide">
                          SRI BALAJI DIAGNOSTICS
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                          123 Health Avenue, Medical District | Ph: +91 98765
                          43210
                        </p>
                      </div>

                      {/* Patient Demographics */}
                      <div className="grid grid-cols-2 gap-4 text-xs text-slate-800 mb-6 bg-slate-50 p-4 rounded border">
                        <div className="space-y-1.5">
                          <p>
                            <span className="font-bold">Patient Name:</span>{" "}
                            {processingBooking.name}
                          </p>
                          <p>
                            <span className="font-bold">Age / Gender:</span>{" "}
                            {processingBooking.age || "N/A"} Yrs /{" "}
                            {processingBooking.gender || "N/A"}
                          </p>
                          <p>
                            <span className="font-bold">Contact:</span>{" "}
                            {processingBooking.phone || "Walk-in"}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p>
                            <span className="font-bold">Clinical ID:</span>{" "}
                            {processingBooking.clinicalId || "N/A"}
                          </p>
                          <p>
                            <span className="font-bold">Date:</span>{" "}
                            {processingBooking.date}
                          </p>
                          <p>
                            <span className="font-bold">Ref Doctor:</span>{" "}
                            {getDoctorName(processingBooking)}
                          </p>
                        </div>
                      </div>

                      {/* Results Table */}
                      <table className="w-full text-left text-xs border border-slate-300">
                        <thead className="bg-slate-900 text-white">
                          <tr>
                            <th className="p-2.5 border border-slate-700">
                              Test Description
                            </th>
                            <th className="p-2.5 border border-slate-700">
                              Result Value
                            </th>
                            <th className="p-2.5 border border-slate-700">
                              Flag
                            </th>
                            <th className="p-2.5 border border-slate-700">
                              Reference Range
                            </th>
                            <th className="p-2.5 border border-slate-700">
                              Unit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(processingBooking.tests || []).map((t, idx) => {
                            const key = getTestKey(t, idx);
                            const res = (results &&
                              (results[key] || results[t.name])) || {
                              value: "-",
                              flag: "Normal"
                            };
                            const isAbnormal =
                              res.flag === "High" ||
                              res.flag === "Low" ||
                              res.flag === "Critical";

                            return (
                              <tr key={key}>
                                <td className="p-2.5 border border-slate-200 font-medium text-slate-800">
                                  {t.name}
                                  {t.parentPackage ? (
                                    <span className="text-[10px] text-slate-500 ml-1">
                                      ({t.parentPackage})
                                    </span>
                                  ) : null}
                                </td>
                                <td
                                  className={`p-2.5 border border-slate-200 ${
                                    isAbnormal
                                      ? "text-red-600 font-bold"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {res.value || "-"}
                                </td>
                                <td
                                  className={`p-2.5 border border-slate-200 ${
                                    isAbnormal
                                      ? "text-red-600 font-bold"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {res.flag === "Normal" ? "" : res.flag}
                                </td>
                                <td className="p-2.5 border border-slate-200 font-mono text-slate-600">
                                  {t.refRange || "-"}
                                </td>
                                <td className="p-2.5 border border-slate-200 text-slate-600">
                                  {t.unit || ""}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Signature Block */}
                    <div className="mt-16 pt-8 flex justify-end">
                      <div className="text-center">
                        <div className="w-48 border-b border-slate-800 mb-1"></div>
                        <p className="text-xs font-bold text-slate-800">
                          Chief Pathologist
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Electronically Verified Report
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Staff;
