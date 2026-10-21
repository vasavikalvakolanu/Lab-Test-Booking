import React, { useState, useMemo } from "react";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const getSmartGroupName = (cat, idx = 0) => {
  if (!cat) return `Test Group ${idx + 1}`;
  const raw =
    cat.name ||
    cat.categoryName ||
    cat.groupName ||
    cat.title ||
    cat.category ||
    cat.label ||
    "";
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  if (Array.isArray(cat.tests) && cat.tests.length > 0 && cat.tests[0]?.name) {
    return `${cat.tests[0].name} Group`;
  }
  return `Test Group ${idx + 1}`;
};

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
  const [payment, setPayment] = useState({
    discount: 0,
    cash: 0,
    upi: 0
  });
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [pkgGroupPinned, setPkgGroupPinned] = useState(true);

  // Unified Test Groups: Packages sit inside Test Groups, Pinned Groups appear on top
  const unifiedGroups = useMemo(() => {
    const groupMap = new Map();

    (categories || []).forEach((c, idx) => {
      const title = getSmartGroupName(c, idx);
      groupMap.set(title.toLowerCase(), {
        id: c.id || `group_${idx}`,
        firestoreId: c.id || null,
        title,
        isPinned: Boolean(c.isPinned),
        items: (c.tests || []).map((t) => ({
          ...t,
          isPackage: false,
          isPinned: Boolean(t.isPinned)
        }))
      });
    });

    const defaultPkgGroupItems = [];

    (packages || []).forEach((p) => {
      const pkgItem = {
        ...p,
        isPackage: true,
        isPinned: Boolean(p.isPinned)
      };
      const assignedGroup = (p.groupName || "").trim();
      const assignedKey = assignedGroup.toLowerCase();

      if (assignedGroup && groupMap.has(assignedKey)) {
        groupMap.get(assignedKey).items.push(pkgItem);
      } else {
        defaultPkgGroupItems.push(pkgItem);
      }
    });

    const finalGroups = Array.from(groupMap.values());

    if (defaultPkgGroupItems.length > 0) {
      finalGroups.unshift({
        id: "__packages_group__",
        firestoreId: null,
        title: "Health Packages & Profiles",
        isPinned: pkgGroupPinned,
        items: defaultPkgGroupItems
      });
    }

    // Sort items inside each group: Pinned first, then Packages, then alphabetical
    finalGroups.forEach((g) => {
      g.items.sort((a, b) => {
        if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
          return b.isPinned ? 1 : -1;
        }
        if (Boolean(b.isPackage) !== Boolean(a.isPackage)) {
          return b.isPackage ? 1 : -1;
        }
        return (a.name || "").localeCompare(b.name || "");
      });
    });

    // Sort groups: Pinned groups at the very top, then alphabetical
    finalGroups.sort((a, b) => {
      if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
        return b.isPinned ? 1 : -1;
      }
      return a.title.localeCompare(b.title);
    });

    return finalGroups;
  }, [categories, packages, pkgGroupPinned]);

  const activeGroup =
    unifiedGroups.find((g) => g.id === activeGroupId) ||
    unifiedGroups[0] ||
    null;

  const handleToggleGroupPin = async (e, group) => {
    e.stopPropagation();
    if (group.id === "__packages_group__") {
      setPkgGroupPinned(!pkgGroupPinned);
      return;
    }
    if (group.firestoreId) {
      await updateDoc(doc(db, "testCategories", group.firestoreId), {
        isPinned: !group.isPinned
      });
      fetchData();
    }
  };

  const searchResults = useMemo(() => {
    if (!staffSearch.trim()) return [];
    const q = staffSearch.toLowerCase();
    return (allCatalogItems || [])
      .filter(
        (item) => item && item.name && item.name.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
          return b.isPinned ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [staffSearch, allCatalogItems]);

  const subtotal = selectedTests.reduce(
    (sum, t) => sum + Number(t.discountedPrice || t.price || 0),
    0
  );
  const discountAmount = Math.min(
    subtotal,
    Math.max(0, Number(payment.discount || 0))
  );
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const totalPaid = Number(payment.cash || 0) + Number(payment.upi || 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  const toggleTestSelection = (item) => {
    const exists = selectedTests.some(
      (t) =>
        t.name === item.name && Boolean(t.isPackage) === Boolean(item.isPackage)
    );
    if (exists) {
      setSelectedTests(
        selectedTests.filter(
          (t) =>
            !(
              t.name === item.name &&
              Boolean(t.isPackage) === Boolean(item.isPackage)
            )
        )
      );
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
      subtotal: subtotal,
      discount: discountAmount,
      discountedTotal: grandTotal,
      total: grandTotal,
      cashPaid: Number(payment.cash || 0),
      upiPaid: Number(payment.upi || 0),
      balanceDue,
      collectionType: "lab",
      status: "processing",
      date: new Date().toISOString().slice(0, 10),
      timeSlot: "Walk-in",
      history: [
        {
          action:
            discountAmount > 0
              ? `Registered Walk-in (Subtotal: ₹${subtotal}, Discount: ₹${discountAmount}, Net Total: ₹${grandTotal})`
              : `Registered Walk-in (Total: ₹${grandTotal})`,
          by: userEmail,
          time: new Date().toISOString()
        }
      ],
      downloadLogs: []
    });

    setPatient({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
    setSelectedTests([]);
    setPayment({ discount: 0, cash: 0, upi: 0 });
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

        <h3 className="text-sm font-bold mb-2">Test &amp; Package Selection</h3>

        <input
          type="text"
          placeholder="Search for any individual test or package..."
          value={staffSearch}
          onChange={(e) => setStaffSearch(e.target.value)}
          className="w-full p-2 mb-3 border rounded text-sm outline-none focus:border-emerald-500"
        />

        {staffSearch ? (
          <div className="h-72 overflow-y-auto border rounded bg-white p-2 mb-4">
            {searchResults.length === 0 ? (
              <p className="text-slate-400 text-sm text-center mt-10">
                No matching tests or packages found.
              </p>
            ) : (
              searchResults.map((t, idx) => {
                const isSelected = selectedTests.some(
                  (st) =>
                    st.name === t.name &&
                    Boolean(st.isPackage) === Boolean(t.isPackage)
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
                      <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                        {t.isPinned && <span title="Pinned">📌</span>}
                        <span>{t.name}</span>
                        {t.isPackage && (
                          <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                            Package
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
          <div className="flex h-72 border rounded bg-white overflow-hidden mb-4 shadow-sm">
            {/* LEFT PANEL: UNIFIED TEST GROUPS (Including Packages, Pinned on Top) */}
            <div className="w-1/2 border-r bg-slate-50 overflow-y-auto">
              <div className="p-2.5 text-[10px] font-bold text-slate-500 bg-slate-200 border-b sticky top-0 uppercase tracking-wider flex justify-between">
                <span>Test Groups ({unifiedGroups.length})</span>
                <span>Click 📌 to Pin</span>
              </div>
              {unifiedGroups.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">
                  No test groups found.
                </p>
              ) : (
                unifiedGroups.map((g) => {
                  const isActive = activeGroup && activeGroup.id === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setActiveGroupId(g.id)}
                      className={`p-2.5 text-xs cursor-pointer border-b flex items-center justify-between transition ${
                        isActive
                          ? "bg-emerald-100 font-bold border-l-4 border-emerald-600 text-emerald-950"
                          : "hover:bg-emerald-50 text-slate-700"
                      }`}
                    >
                      <div className="truncate pr-1.5 flex items-center gap-1.5">
                        <span>
                          {g.id === "__packages_group__" ? "📦" : "📁"}
                        </span>
                        <span className="truncate">{g.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleGroupPin(e, g)}
                          title={
                            g.isPinned ? "Unpin Group" : "Pin Group to Top"
                          }
                          className={`px-1.5 py-0.5 rounded border text-[10px] transition ${
                            g.isPinned
                              ? "bg-amber-400 text-white border-amber-500"
                              : "bg-white text-slate-300 hover:text-slate-600"
                          }`}
                        >
                          📌
                        </button>
                        <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-500">
                          {g.items.length}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RIGHT PANEL: TESTS & PACKAGES INSIDE SELECTED GROUP */}
            <div className="w-1/2 overflow-y-auto p-2.5 bg-white">
              {!activeGroup ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic text-center p-4">
                  Select a test group on the left to view tests.
                </div>
              ) : (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase flex justify-between">
                    <span className="truncate pr-2">{activeGroup.title}</span>
                    <span className="shrink-0">
                      {activeGroup.items.length} Item(s)
                    </span>
                  </div>

                  {activeGroup.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">
                      No tests added to this group yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeGroup.items.map((item, idx) => {
                        const isSelected = selectedTests.some(
                          (st) =>
                            st.name === item.name &&
                            Boolean(st.isPackage) === Boolean(item.isPackage)
                        );
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleTestSelection(item)}
                            className={`flex justify-between items-center p-2.5 border rounded-lg cursor-pointer transition ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50"
                                : item.isPackage
                                ? "border-amber-200 bg-amber-50/40 hover:border-amber-400"
                                : "hover:border-emerald-300"
                            }`}
                          >
                            <div className="pr-2">
                              <div className="font-semibold text-slate-800 text-xs flex flex-wrap items-center gap-1">
                                {item.isPinned && <span>📌</span>}
                                <span>{item.name}</span>
                                {item.isPackage && (
                                  <span className="bg-amber-500 text-white text-[9px] uppercase font-bold px-1.5 py-0.5 rounded">
                                    Pkg ({(item.tests || []).length})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                                ₹{item.discountedPrice || item.price || 0}
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
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Test & Package Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTests.length === 0 && (
            <span className="text-xs text-slate-400">
              No tests selected yet.
            </span>
          )}
          {selectedTests.map((t, idx) => {
            const isPackageTag = Boolean(t.isPackage);
            return (
              <span
                key={idx}
                className={`px-2.5 py-1 text-xs font-bold rounded border flex items-center ${
                  isPackageTag
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                }`}
              >
                {t.name} (₹{t.discountedPrice || t.price || 0})
                <button
                  type="button"
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

      {/* Right Column: Financial Counter with Discount Support */}
      <div className="bg-slate-50 p-6 border rounded shadow-inner">
        <h3 className="text-sm font-bold mb-4">Financial Counter</h3>

        <div className="space-y-2 mb-4 border-b pb-4 max-h-48 overflow-y-auto">
          {selectedTests.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Cart is empty...</p>
          ) : (
            selectedTests.map((t, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm text-slate-600"
              >
                <span>
                  {t.name}{" "}
                  {t.isPackage && (
                    <span className="text-[10px] font-bold text-amber-700">
                      (Package)
                    </span>
                  )}
                </span>
                <span className="font-semibold">
                  ₹{t.discountedPrice || t.price || 0}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 mb-5 border-b pb-4">
          <div className="flex justify-between text-sm font-semibold text-slate-600">
            <span>Subtotal:</span>
            <span>₹{subtotal}</span>
          </div>

          <div className="flex items-center justify-between gap-4 bg-white p-2.5 rounded-lg border border-amber-300">
            <div>
              <label className="text-xs font-extrabold text-amber-900 block">
                DISCOUNT AMOUNT (₹)
              </label>
              <span className="text-[10px] text-slate-500">
                Deducted from total &amp; doctor ledger
              </span>
            </div>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={payment.discount}
              onChange={(e) =>
                setPayment({ ...payment, discount: e.target.value })
              }
              className="w-28 p-2 border rounded text-right font-extrabold text-amber-900 outline-none focus:border-amber-500"
              placeholder="0"
            />
          </div>

          <div className="flex justify-between font-extrabold text-xl text-slate-900 pt-1">
            <span>Discounted Total:</span>
            <span className="text-emerald-700">₹{grandTotal}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-500">
              CASH TENDERED (₹)
            </label>
            <input
              type="number"
              value={payment.cash}
              onChange={(e) => setPayment({ ...payment, cash: e.target.value })}
              className="w-full p-2 border rounded text-lg font-medium outline-none mt-1 focus:border-emerald-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">
              UPI / CARD (₹)
            </label>
            <input
              type="number"
              value={payment.upi}
              onChange={(e) => setPayment({ ...payment, upi: e.target.value })}
              className="w-full p-2 border rounded text-lg font-medium outline-none mt-1 focus:border-emerald-500 bg-white"
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
          type="button"
          onClick={handleWalkInRegistration}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 transition text-white rounded font-bold shadow-sm"
        >
          Generate Clinical ID &amp; Bill Patient
        </button>
      </div>
    </div>
  );
}
