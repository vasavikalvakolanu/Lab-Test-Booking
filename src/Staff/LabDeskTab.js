import React, { useState, useEffect } from "react";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import {
  getTestKey,
  evaluateAutoFlag,
  resolveTestRefAndUnit,
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

  const itemsPriceSum = editableTests.reduce(
    (sum, t) => sum + Number(t.discountedPrice || t.price || 0),
    0
  );
  const liveGrossSubtotal =
    itemsPriceSum > 0
      ? itemsPriceSum
      : Number(
          (processingBooking &&
            (processingBooking.subtotal || processingBooking.total)) ||
            0
        );
  const liveDiscount = Math.min(
    liveGrossSubtotal,
    Math.max(0, Number(editPayment.discount || 0))
  );
  const liveDiscountedNetPrice = Math.max(0, liveGrossSubtotal - liveDiscount);
  const liveDeliveryFee =
    editPatient.collectionType === "home"
      ? Number(editPayment.deliveryFee || 0)
      : 0;
  const liveFinalTotal = liveDiscountedNetPrice + liveDeliveryFee;
  const liveTotalPaid =
    Number(editPayment.cashPaid || 0) + Number(editPayment.upiPaid || 0);
  const liveBalanceDue = Math.max(0, liveFinalTotal - liveTotalPaid);

  const handleUpdateRecord = async () => {
    if (!editPatient.name) {
      return alert("Patient Name is required.");
    }
    if (editableTests.length === 0) {
      return alert("At least one test or package is required.");
    }

    const newFlatTests = expandTests(editableTests);

    const logEntry = {
      action: `Modified Record & Billing (Gross: ₹${liveGrossSubtotal}, Discount: ₹${liveDiscount}, Discounted Total: ₹${liveDiscountedNetPrice})`,
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
      subtotal: liveGrossSubtotal,
      discount: liveDiscount,
      discountedTotal: liveDiscountedNetPrice,
      deliveryFee: liveDeliveryFee,
      total: liveFinalTotal,
      cashPaid: Number(editPayment.cashPaid || 0),
      upiPaid: Number(editPayment.upiPaid || 0),
      balanceDue: liveBalanceDue
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
    alert("Patient details, tests, and discount updated!");
  };

  const saveResults = async () => {
    if (!window.confirm("Lock these results and finalize the report?")) return;

    // Ensure resolved refRange and unit are saved onto each test object
    const enrichedTests = (processingBooking.tests || []).map((t, idx) => {
      const key = getTestKey(t, idx);
      const resObj = (results && (results[key] || results[t.name])) || {};
      const resolved = resolveTestRefAndUnit(t);
      return {
        ...t,
        refRange: resObj.customRefRange || resolved.refRange || "-",
        unit:
          resObj.customUnit !== undefined ? resObj.customUnit : resolved.unit
      };
    });

    await updateDoc(doc(db, "bookings", processingBooking.id), {
      tests: enrichedTests,
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
              <th className="p-4 font-bold text-slate-600">
                Billing &amp; Discount
              </th>
              <th className="p-4 font-bold text-slate-600">Required Tests</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processingBookings.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
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
                  <td className="p-4 text-xs">
                    <span className="font-bold text-slate-800 block">
                      Net: ₹{b.total || 0}
                    </span>
                    {Number(b.discount || 0) > 0 && (
                      <span className="text-amber-700 font-bold">
                        Disc: &minus;₹{b.discount}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-600 max-w-xs truncate">
                    {(b.cartItems || b.tests || [])
                      .map((t) => t.name)
                      .join(", ")}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        openPatientRecord(b);
                        setEditMode(true);
                      }}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded font-bold text-xs transition"
                    >
                      🏷️ Add Discount / Edit
                    </button>
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
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6 bg-slate-50 p-4 border rounded shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {processingBooking.name}
          </h2>
          <div className="flex flex-wrap gap-2.5 mt-2 text-xs font-medium text-slate-600">
            <span className="bg-white px-2.5 py-1 rounded border">
              ID: <b>{processingBooking.clinicalId}</b>
            </span>
            <span className="bg-white px-2.5 py-1 rounded border">
              Phone: {processingBooking.phone || "N/A"}
            </span>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded border border-amber-200">
              {processingBooking.age || "N/A"} Yrs /{" "}
              {processingBooking.gender || "N/A"}
            </span>
            <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-200 font-bold">
              Ref: {getDoctorName(processingBooking)}
            </span>
            <span className="bg-white px-2.5 py-1 rounded border font-bold text-slate-800">
              Net Bill: ₹{processingBooking.total || 0}
              {Number(processingBooking.discount || 0) > 0 && (
                <span className="text-amber-700 ml-1">
                  (Discount: &minus;₹{processingBooking.discount})
                </span>
              )}
            </span>
            <span
              className={`px-2.5 py-1 rounded border font-bold ${
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
              className="text-amber-900 font-bold border border-amber-300 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded shadow-sm text-sm transition"
            >
              🏷️ Modify Patient, Discount &amp; Billing
            </button>
          )}
        </div>
      </div>

      {/* MODIFY STAGE PANEL */}
      {editMode && (
        <div className="mb-6 border-2 border-emerald-500 bg-emerald-50/70 rounded-xl p-5 shadow-inner">
          <div className="flex justify-between items-center border-b border-emerald-200 pb-2 mb-4">
            <h3 className="font-bold text-emerald-950 text-base">
              Modify Patient Details, Referring Doctor, Tests &amp; Late-Stage
              Discount
            </h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
              Syncs automatically with Doctor Ledger
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-lg border">
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
                className="w-full p-2 border rounded text-sm font-bold outline-none focus:border-emerald-500 bg-blue-50/50"
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

              <div className="space-y-1 max-h-52 overflow-y-auto pr-2">
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

            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg mb-4 flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-amber-900 block">
                    🏷️ PATIENT DISCOUNT AMOUNT (₹)
                  </label>
                  <span className="text-[11px] text-amber-800">
                    Updates patient bill &amp; Doctor Referral Ledger
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={liveGrossSubtotal}
                  value={editPayment.discount}
                  onChange={(e) =>
                    setEditPayment({
                      ...editPayment,
                      discount: e.target.value
                    })
                  }
                  className="w-28 p-2 border-2 border-amber-400 rounded text-right font-extrabold text-base text-amber-950 bg-white outline-none"
                />
              </div>

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
              </div>

              <div className="border-t pt-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Tests Subtotal:</span>
                  <span className="font-bold">₹{liveGrossSubtotal}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Discount Applied:</span>
                  <span>&minus; ₹{liveDiscount}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm bg-slate-50 p-1.5 rounded border">
                  <span>Discounted Price (Doctor Ledger):</span>
                  <span className="text-emerald-700">
                    ₹{liveDiscountedNetPrice}
                  </span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-red-600 pt-1">
                  <span>Updated Balance Due:</span>
                  <span>₹{liveBalanceDue}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded font-bold border text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRecord}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-sm text-sm"
                >
                  Save Discount &amp; Modifications
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULT ENTRY TABLE WITH VISIBLE & EDITABLE REFERENCE RANGES */}
      <table className="w-full text-left text-sm border rounded overflow-hidden mb-6 shadow-sm">
        <thead className="bg-slate-800 text-white border-b">
          <tr>
            <th className="p-3">Test Parameter</th>
            <th className="p-3 w-64">Reference Range &amp; Unit</th>
            <th className="p-3 w-72">Result Value</th>
            <th className="p-3">Abnormal Flagging</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {(processingBooking.tests || []).map((t, idx) => {
            const testKey = getTestKey(t, idx);
            const resObj =
              (results && (results[testKey] || results[t.name])) || {};
            const currentFlag = resObj.flag || "Normal";

            const resolved = resolveTestRefAndUnit(t);
            const displayRefRange =
              resObj.customRefRange !== undefined
                ? resObj.customRefRange
                : resolved.refRange;
            const displayUnit =
              resObj.customUnit !== undefined
                ? resObj.customUnit
                : resolved.unit;

            let rowClass = "hover:bg-slate-50";
            if (currentFlag === "Critical") rowClass = "bg-red-50";
            else if (currentFlag !== "Normal") rowClass = "bg-amber-50";

            return (
              <tr key={testKey} className={rowClass}>
                <td className="p-4">
                  <span className="font-bold text-slate-800 block text-sm">
                    {t.name}
                  </span>
                  {t.parentPackage && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 mt-1 inline-block">
                      {t.parentPackage}
                    </span>
                  )}
                </td>

                {/* VISIBLE & EDITABLE REFERENCE RANGE COLUMN */}
                <td className="p-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Normal Range
                      </span>
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                        {displayRefRange || "-"}{" "}
                        {displayUnit ? `(${displayUnit})` : ""}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <input
                        type="text"
                        value={displayRefRange}
                        onChange={(e) => {
                          const newRange = e.target.value;
                          const reFlag = evaluateAutoFlag(
                            resObj.value,
                            newRange
                          );
                          setResults({
                            ...results,
                            [testKey]: {
                              ...resObj,
                              customRefRange: newRange,
                              flag: reFlag
                            }
                          });
                        }}
                        placeholder="Ref Range"
                        className="w-2/3 px-1.5 py-1 text-[11px] font-mono border rounded bg-white text-slate-700 outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        value={displayUnit}
                        onChange={(e) => {
                          setResults({
                            ...results,
                            [testKey]: {
                              ...resObj,
                              customUnit: e.target.value
                            }
                          });
                        }}
                        placeholder="Unit"
                        className="w-1/3 px-1.5 py-1 text-[11px] border rounded bg-white text-slate-700 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </td>

                {/* RESULT VALUE INPUT WITH LIVE RANGE PROMPT */}
                <td className="p-4">
                  <input
                    type="text"
                    placeholder={`Enter Value (Normal: ${displayRefRange})`}
                    value={resObj.value || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const autoFlag = evaluateAutoFlag(val, displayRefRange);
                      setResults({
                        ...results,
                        [testKey]: {
                          ...resObj,
                          value: val,
                          flag: autoFlag
                        }
                      });
                    }}
                    className={`w-full p-2.5 border-2 rounded-lg outline-none font-bold text-sm ${
                      currentFlag === "Critical"
                        ? "border-red-500 text-red-700 bg-white"
                        : currentFlag !== "Normal"
                        ? "border-amber-400 text-amber-900 bg-white"
                        : "border-slate-300 focus:border-emerald-500"
                    }`}
                  />
                  <span className="block text-[11px] text-slate-500 mt-1 font-mono">
                    Ref:{" "}
                    <b className="text-slate-700">{displayRefRange || "-"}</b>{" "}
                    {displayUnit || ""}
                  </span>
                </td>

                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
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
                          className={`px-2.5 py-1.5 text-xs font-bold rounded border transition ${btnClass}`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
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

      {/* READ-ONLY PREVIEW MODAL */}
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
              <div className="bg-white max-w-[760px] mx-auto shadow-lg border border-slate-300 min-h-[1040px] flex flex-col justify-between relative overflow-hidden">
                {/* CENTER BALAJI LAB LOGO WATERMARK */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0">
                  <SriBalajiLogoSVG size={310} />
                </div>

                <div className="px-8 md:px-12 pt-6 pb-12 relative z-10">
                  <div className="flex items-center justify-center gap-3.5 mb-2">
                    <SriBalajiLogoSVG size={62} />
                    <div className="text-left">
                      <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-[#0f2d4a] tracking-wide leading-none">
                        SRI BALAJI
                      </h1>
                      <p className="text-xs md:text-sm font-extrabold text-[#0d5c85] tracking-[0.18em] mt-1">
                        CLINICAL LABORATORY
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center my-1.5">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#0f2d4a] to-[#c59b46]"></div>
                    <span className="text-[#c59b46] mx-2 text-xs leading-none">
                      ◆
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#0f2d4a] to-[#c59b46]"></div>
                  </div>

                  <p className="text-center text-[10.5px] font-medium text-[#0f2d4a] mb-4">
                    Sathiraju Complex, Main Road, Kothapeta &bull; Ph: +91
                    9849923729 &bull; Email: prasad balajilab@gmail.com
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-800 mb-5 bg-white/85 p-3.5 rounded-md border border-slate-300">
                    <div className="space-y-1">
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
                    <div className="space-y-1">
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

                  <table className="w-full text-left text-xs border border-slate-300 bg-transparent">
                    <thead className="bg-[#0f2d4a] text-white">
                      <tr>
                        <th className="p-2 border border-slate-700">
                          Test Description
                        </th>
                        <th className="p-2 border border-slate-700">
                          Result Value
                        </th>
                        <th className="p-2 border border-slate-700">Flag</th>
                        <th className="p-2 border border-slate-700">
                          Reference Range
                        </th>
                        <th className="p-2 border border-slate-700">Unit</th>
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
                        const resolved = resolveTestRefAndUnit(t);
                        const finalRange =
                          res.customRefRange !== undefined
                            ? res.customRefRange
                            : resolved.refRange;
                        const finalUnit =
                          res.customUnit !== undefined
                            ? res.customUnit
                            : resolved.unit;

                        const isAbnormal =
                          res.flag === "High" ||
                          res.flag === "Low" ||
                          res.flag === "Critical";

                        return (
                          <tr key={key} className="bg-transparent">
                            <td className="p-2 border border-slate-200 font-medium text-slate-800">
                              {t.name}
                              {t.parentPackage ? (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({t.parentPackage})
                                </span>
                              ) : null}
                            </td>
                            <td
                              className={`p-2 border border-slate-200 ${
                                isAbnormal
                                  ? "text-red-600 font-bold"
                                  : "text-slate-800"
                              }`}
                            >
                              {res.value || "-"}
                            </td>
                            <td
                              className={`p-2 border border-slate-200 ${
                                isAbnormal
                                  ? "text-red-600 font-bold"
                                  : "text-slate-500"
                              }`}
                            >
                              {res.flag === "Normal" ? "" : res.flag}
                            </td>
                            <td className="p-2 border border-slate-200 font-mono text-slate-600">
                              {finalRange || "-"}
                            </td>
                            <td className="p-2 border border-slate-200 text-slate-600">
                              {finalUnit || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* SLIM SIGNATURE & FOOTER */}
                <div className="relative z-10">
                  <div className="px-12 pb-6 flex justify-end">
                    <div className="text-center">
                      <div className="w-44 border-b border-[#0f2d4a] mb-1"></div>
                      <p className="text-[11px] font-bold text-[#0f2d4a]">
                        Authorized Signatory
                      </p>
                      <p className="text-[9.5px] text-slate-500">
                        Sri Balaji Clinical Laboratory
                      </p>
                    </div>
                  </div>

                  <div className="px-8 flex items-center gap-4 mb-1.5">
                    <div className="h-[1px] flex-1 bg-[#0f2d4a]"></div>
                    <span className="text-[9.5px] font-bold tracking-[0.22em] text-[#0f2d4a]">
                      TRUST &bull; ACCURACY &bull; CARE
                    </span>
                    <div className="h-[1px] flex-1 bg-[#0f2d4a]"></div>
                  </div>
                  <div className="h-[2.5px] w-full bg-[#c59b46]"></div>
                  <div className="h-[5px] w-full bg-[#0f2d4a]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
