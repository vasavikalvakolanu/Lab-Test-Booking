import React, { useState, useEffect } from "react";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { getTestKey, evaluateAutoFlag } from "./staffUtils";

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
      <div className="flex justify-between items-start mb-6 bg-slate-5
