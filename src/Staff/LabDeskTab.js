import React, { useState, useEffect } from "react";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import {
  getTestKey,
  evaluateAutoFlag,
  SriBalajiLogoSVG
} from "./staffUtils";

export function LabDeskTab({
  processingBookings,
  processingBooking,
  setProcessingBooking,
  startInEditMode,
  clearStartEditFlag,
  referrals,
  allCatalogItems,
  expandTests,
  getDoctorName,
  userEmail,
  fetchData,
  onReportFinalized
}) {
  const [results, setResults] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [letterheadBgFailed, setLetterheadBgFailed] = useState(false);
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

  useEffect(() => {
    if (processingBooking) {
      setResults(processingBooking.results || {});
      populateEditState(processingBooking);
      if (startInEditMode) {
        setEditMode(true);
        clearStartEditFlag();
      } else {
        setEditMode(false);
      }
    }
  }, [processingBooking, startInEditMode, clearStartEditFlag]);

  const openPatientRecord = (b) => {
    const rawSource =
      b.tests && b.tests.length > 0 ? b.tests : b.cartItems || [];
    const unpackedTests = expandTests(rawSource);
    setProcessingBooking({
      ...b,
      tests: unpackedTests
    });
  };

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

    const newFlatTests = expandTests(editableTests);

    const logEntry = {
      action: `Modified Record Details, Tests & Billing (Patient: ${editPatient.name}, Total: ₹${newTotal})`,
      by: userEmail,
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
      ...updatedFields,
      results
    });

    setEditMode(false);
    fetchData();
    alert("Patient details, tests, and billing updated successfully.");
  };

  const saveResults = async () => {
    if (!window.confirm("Lock these results and finalize the report?")) return;

    await updateDoc(doc(db, "bookings", processingBooking.id), {
      tests: processingBooking.tests,
      results,
      status: "completed",
      history: arrayUnion({
        action: "Results Locked & Verified",
        by: userEmail,
        time: new Date().toISOString()
      })
    });

    setProcessingBooking(null);
    onReportFinalized();
    fetchData();
  };

  if (!processingBooking) {
    return (
      <div className="overflow-hidden rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="p-4 font-bold text-slate-600">Clinical ID</th>
              <th className="p-4 font-bold text-slate-600">Patient</th>
              <th className="p-4 font-bold text-slate-600">Required Tests</th>
              <th className="p-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processingBookings.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400">
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
                      onClick={() => openPatientRecord(b)}
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
    );
  }

  return (
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
            Save Draft &amp; Close
          </button>
          {!editMode && (
            <button
              onClick={() => {
                populateEditState(processingBooking);
                setEditMode(true);
              }}
              className="text-emerald-700 font-bold border border-emerald-200 bg-emerald-50 px-4 py-2 rounded shadow-sm text-sm"
            >
              ⚙️ Modify Patient, Tests &amp; Billing
            </button>
          )}
        </div>
      </div>

      {editMode && (
        <div className="mb-6 border-2 border-emerald-400 bg-emerald-50 rounded-lg p-5 shadow-inner">
          <h3 className="font-bold text-emerald-900 mb-4 text-base border-b border-emerald-200 pb-2">
            Modify Patient Demographics, Referral, Tests &amp; Billing
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded border">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                PATIENT FULL NAME
              </label>
              <input
                type="text"
                value={editPatient.name}
                onChange={(e) =>
                  setEditPatient({ ...editPatient, name: e.target.value })
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
                  setEditPatient({ ...editPatient, phone: e.target.value })
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
                    setEditPatient({ ...editPatient, age: e.target.value })
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
                    setEditPatient({ ...editPatient, gender: e.target.value })
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
                  setEditPatient({ ...editPatient, doctorId: e.target.value })
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
                  setEditPatient({ ...editPatient, date: e.target.value })
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
                    setEditPatient({ ...editPatient, address: e.target.value })
                  }
                  className="w-full p-2 border rounded text-sm outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                ADD OR REMOVE TESTS &amp; PACKAGES
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
                <option value="">Search &amp; Add Any Test or Package...</option>
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

      {/* RESULT ENTRY TABLE */}
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
                      const val = e.target.value;
                      const autoFlag = evaluateAutoFlag(val, t.refRange);
                      setResults({
                        ...results,
                        [testKey]: {
                          ...resObj,
                          value: val,
                          flag: autoFlag
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
          🔒 Lock, Sign &amp; Finalize Report
        </button>
      </div>

      {/* READ-ONLY HTML PREVIEW MODAL (FIXED HEADER CLEARANCE & TRANSPARENT WATERMARK) */}
      {showPreviewModal && (
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

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="bg-white max-w-[760px] mx-auto shadow-lg border border-slate-300 min-h-[1075px] flex flex-col justify-between relative overflow-hidden">
                {/* Pinned aspect-ratio letterhead image so header never stretches */}
                {!letterheadBgFailed && (
                  <img
                    src="/letterhead.png"
                    alt=""
                    onError={() => setLetterheadBgFailed(true)}
                    className="absolute top-0 left-0 w-full h-auto pointer-events-none z-0"
                  />
                )}

                <div
                  style={{
                    paddingTop: !letterheadBgFailed ? "28.5%" : "2rem"
                  }}
                  className="px-8 md:px-12 pb-20 relative z-10"
                >
                  {/* Fallback Header ONLY if /letterhead.png is missing */}
                  {letterheadBgFailed && (
                    <div className="mb-6">
                      <div className="flex items-center justify-center gap-4 mb-3">
                        <SriBalajiLogoSVG size={78} />
                        <div className="text-left">
                          <h1 className="text-3xl font-serif font-extrabold text-[#0f2d4a] tracking-wide leading-none">
                            SRI BALAJI
                          </h1>
                          <p className="text-sm font-extrabold text-[#0d5c85] tracking-[0.18em] mt-1">
                            CLINICAL LABORATORY
                          </p>
                        </div>
                      </div>
                      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#0f2d4a] to-transparent my-2"></div>
                      <p className="text-center text-[11px] font-semibold text-[#0f2d4a]">
                        Sathiraju Complex, Main Road, Kothapeta &bull; Ph: +91
                        9849923729 &bull; Email: prasad balajilab@gmail.com
                      </p>
                    </div>
                  )}

                  {/* Patient Demographics Box (Sits cleanly below contact line) */}
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-800 mb-5 bg-white/80 p-3.5 rounded-md border border-slate-300">
                    <div className="space-y-1.5">
                      <p>
                        <span className="font-bold text-[#0f2d4a]">
                          Patient Name :
                        </span>{" "}
                        {processingBooking.name}
                      </p>
                      <p>
                        <span className="font-bold text-[#0f2d4a]">
                          Age / Gender :
                        </span>{" "}
                        {processingBooking.age || "N/A"} Yrs /{" "}
                        {processingBooking.gender || "N/A"}
                      </p>
                      <p>
                        <span className="font-bold text-[#0f2d4a]">
                          Contact No :
                        </span>{" "}
                        {processingBooking.phone || "Walk-in"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p>
                        <span className="font-bold text-[#0f2d4a]">
                          Clinical ID :
                        </span>{" "}
                        {processingBooking.clinicalId || "N/A"}
                      </p>
                      <p>
                        <span className="font-bold text-[#0f2d4a]">
                          Report Date :
                        </span>{" "}
                        {processingBooking.date}
                      </p>
                      <p>
                        <span className="font-bold text-[#0f2d4a]">
                          Ref. By Dr. :
                        </span>{" "}
                        {getDoctorName(processingBooking)}
                      </p>
                    </div>
                  </div>

                  {/* Results Table with Transparent Rows for Watermark Visibility */}
                  <table className="w-full text-left text-xs border border-slate-300 bg-transparent">
                    <thead className="bg-[#0f2d4a] text-white">
                      <tr>
                        <th className="p-2.5 border border-slate-700">
                          Test Description
                        </th>
                        <th className="p-2.5 border border-slate-700">
                          Result Value
                        </th>
                        <th className="p-2.5 border border-slate-700">Flag</th>
                        <th className="p-2.5 border border-slate-700">
                          Reference Range
                        </th>
                        <th className="p-2.5 border border-slate-700">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-transparent">
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
                          <tr key={key} className="bg-transparent">
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
                <div className="relative z-10 pb-16 px-12 flex justify-end">
                  <div className="text-center">
                    <div className="w-48 border-b border-[#0f2d4a] mb-1"></div>
                    <p className="text-xs font-bold text-[#0f2d4a]">
                      Authorized Signatory
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Sri Balaji Clinical Laboratory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
