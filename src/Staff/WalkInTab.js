import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export function WalkInTab({
  categories,
  packages,
  referrals,
  allCatalogItems,
  expandTests,
  userEmail,
  fetchData
}) {
  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    doctorId: ""
  });
  const [selectedTests, setSelectedTests] = useState([]);
  const [payment, setPayment] = useState({ cash: 0, upi: 0 });
  const [activeSubgroup, setActiveSubgroup] = useState(null);
  const [staffSearch, setStaffSearch] = useState("");

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

  const toggleTestSelection = (item) => {
    const exists = selectedTests.some((t) => t.name === item.name);
    if (exists) {
      setSelectedTests(selectedTests.filter((t) => t.name !== item.name));
    } else {
      setSelectedTests([...selectedTests, item]);
    }
  };

  const handleWalkInRegistration = async () => {
    if (!patient.name || !patient.age || selectedTests.length === 0) {
      return alert("Name, Age, and Tests are required.");
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const clinicalId = `SBD-${dateStr}-${randomId}`;

    const flatTests = expandTests(selectedTests);

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
          by: userEmail,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-sm font-bold mb-4">Patient Demographics</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <input
            type="text"
            placeholder="Full Name"
            value={patient.name}
            onChange={(e) => setPatient({ ...patient, name: e.target.value })}
            className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500"
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={patient.phone}
            onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
            className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500"
          />
          <div className="flex gap-2 col-span-2">
            <input
              type="number"
              placeholder="Age"
              value={patient.age}
              onChange={(e) => setPatient({ ...patient, age: e.target.value })}
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

        <h3 className="text-sm font-bold mb-2">Test & Package Selection</h3>

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
            {/* Left Column: Subgroups */}
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
                    onClick={() => setActiveSubgroup({ ...p, type: "package" })}
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

            {/* Right Column: Tests */}
            <div className="w-1/2 overflow-y-auto p-2 bg-white">
              {!activeSubgroup ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic text-center p-4">
                  Select a category or package on the left to view tests.
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
                          onClick={() => toggleTestSelection(activeSubgroup)}
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
                            toggleTestSelection({ ...t, isPackage: false })
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

      {/* Right Column: Financial Counter */}
      <div className="bg-slate-50 p-6 border rounded shadow-inner">
        <h3 className="text-sm font-bold mb-4">Financial Counter</h3>

        <div className="space-y-2 mb-6 border-b pb-4">
          {selectedTests.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Cart is empty...</p>
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
              onChange={(e) => setPayment({ ...payment, cash: e.target.value })}
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
              onChange={(e) => setPayment({ ...payment, upi: e.target.value })}
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
  );
}
