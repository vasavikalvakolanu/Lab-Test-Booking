import React, { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import { db } from "../firebase";

export const getSmartGroupName = (cat, idx = 0) => {
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

// Standard individual tests with separate prices for 1-click seeding
const COMMON_CLINICAL_GROUPS = [
  {
    name: "Hematology & CBC Tests",
    isPinned: true,
    tests: [
      { id: "hem_1", name: "Haemoglobin (Hb)", price: 80, discountedPrice: 80, refRange: "13.0 - 17.0", unit: "g/dL", isPinned: true, isPackage: false },
      { id: "hem_2", name: "Platelet Count", price: 100, discountedPrice: 100, refRange: "1.5 - 4.5", unit: "Lakhs/cumm", isPinned: true, isPackage: false },
      { id: "hem_3", name: "Total WBC Count", price: 80, discountedPrice: 80, refRange: "4000 - 11000", unit: "/cumm", isPinned: false, isPackage: false },
      { id: "hem_4", name: "Total RBC Count", price: 80, discountedPrice: 80, refRange: "4.5 - 5.5", unit: "mill/cumm", isPinned: false, isPackage: false },
      { id: "hem_5", name: "ESR (Erythrocyte Sedimentation Rate)", price: 100, discountedPrice: 100, refRange: "0 - 20", unit: "mm/hr", isPinned: false, isPackage: false }
    ]
  },
  {
    name: "Diabetes & Sugar Tests",
    isPinned: true,
    tests: [
      { id: "dia_1", name: "Fasting Blood Sugar (FBS)", price: 60, discountedPrice: 60, refRange: "70 - 100", unit: "mg/dL", isPinned: true, isPackage: false },
      { id: "dia_2", name: "Post Prandial Blood Sugar (PPBS)", price: 60, discountedPrice: 60, refRange: "70 - 140", unit: "mg/dL", isPinned: true, isPackage: false },
      { id: "dia_3", name: "Random Blood Sugar (RBS)", price: 60, discountedPrice: 60, refRange: "70 - 140", unit: "mg/dL", isPinned: true, isPackage: false },
      { id: "dia_4", name: "HbA1c (Glycosylated Haemoglobin)", price: 400, discountedPrice: 400, refRange: "4.0 - 5.6", unit: "%", isPinned: true, isPackage: false }
    ]
  },
  {
    name: "Lipid / Cholesterol Tests",
    isPinned: false,
    tests: [
      { id: "lip_1", name: "Total Cholesterol", price: 150, discountedPrice: 150, refRange: "< 200", unit: "mg/dL", isPinned: true, isPackage: false },
      { id: "lip_2", name: "Triglycerides", price: 150, discountedPrice: 150, refRange: "< 150", unit: "mg/dL", isPinned: false, isPackage: false },
      { id: "lip_3", name: "HDL Cholesterol", price: 150, discountedPrice: 150, refRange: "> 40", unit: "mg/dL", isPinned: false, isPackage: false },
      { id: "lip_4", name: "LDL Cholesterol", price: 150, discountedPrice: 150, refRange: "< 100", unit: "mg/dL", isPinned: false, isPackage: false }
    ]
  },
  {
    name: "Urine & Stool Analysis Tests",
    isPinned: false,
    tests: [
      { id: "uri_1", name: "Urine Sugar Random", price: 60, discountedPrice: 60, refRange: "Nil", unit: "", isPinned: true, isPackage: false },
      { id: "uri_2", name: "Urine Albumin", price: 60, discountedPrice: 60, refRange: "Nil", unit: "", isPinned: false, isPackage: false },
      { id: "uri_3", name: "Urine Routine & Microscopy", price: 120, discountedPrice: 120, refRange: "Normal", unit: "", isPinned: true, isPackage: false }
    ]
  }
];

// ==========================================
// TAB 1: TEST GROUPS & INDIVIDUAL TESTS
// ==========================================
export function CatalogTab({ categories, fetchData }) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPinned, setNewGroupPinned] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [testForm, setTestForm] = useState({
    name: "",
    price: "",
    refRange: "",
    unit: "",
    isPinned: false
  });

  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const [editingTestIdx, setEditingTestIdx] = useState(null);
  const [editingTestData, setEditingTestData] = useState({
    name: "",
    price: "",
    refRange: "",
    unit: ""
  });
  const [isSeeding, setIsSeeding] = useState(false);

  const sortedCategories = [...(categories || [])].sort((a, b) => {
    if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
      return b.isPinned ? 1 : -1;
    }
    return getSmartGroupName(a).localeCompare(getSmartGroupName(b));
  });

  const activeGroup =
    sortedCategories.find((c) => c.id === selectedGroupId) ||
    sortedCategories[0] ||
    null;

  const handleAddGroup = async (e) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return alert("Please enter a Test Group name.");

    const docRef = await addDoc(collection(db, "testCategories"), {
      name: trimmed,
      categoryName: trimmed,
      isPinned: Boolean(newGroupPinned),
      tests: [],
      createdAt: new Date().toISOString()
    });

    setNewGroupName("");
    setNewGroupPinned(false);
    setSelectedGroupId(docRef.id);
    fetchData();
  };

  const handleSeedCommonGroups = async () => {
    if (
      !window.confirm(
        "Add standard individual test groups (CBC parameters, Sugar, Lipid, Urine tests) with default individual prices? You can edit or remove any of them afterward."
      )
    ) {
      return;
    }

    setIsSeeding(true);
    try {
      const existingNames = new Set(
        (categories || []).map((c) => getSmartGroupName(c).toLowerCase())
      );

      for (const grp of COMMON_CLINICAL_GROUPS) {
        if (!existingNames.has(grp.name.toLowerCase())) {
          await addDoc(collection(db, "testCategories"), {
            name: grp.name,
            categoryName: grp.name,
            isPinned: grp.isPinned,
            tests: grp.tests,
            createdAt: new Date().toISOString()
          });
        }
      }
      await fetchData();
      alert("Common individual test groups added!");
    } catch (e) {
      console.error("Error seeding groups:", e);
    }
    setIsSeeding(false);
  };

  const toggleGroupPin = async (group) => {
    await updateDoc(doc(db, "testCategories", group.id), {
      isPinned: !group.isPinned
    });
    fetchData();
  };

  const saveGroupRename = async (group) => {
    const trimmed = editingGroupName.trim();
    if (!trimmed) return alert("Group name cannot be empty.");

    await updateDoc(doc(db, "testCategories", group.id), {
      name: trimmed,
      categoryName: trimmed
    });
    setEditingGroupId(null);
    setEditingGroupName("");
    fetchData();
  };

  const handleDeleteGroup = async (group, idx) => {
    const title = getSmartGroupName(group, idx);
    if (
      !window.confirm(`Delete test group "${title}" and all tests inside it?`)
    ) {
      return;
    }
    await deleteDoc(doc(db, "testCategories", group.id));
    if (selectedGroupId === group.id) setSelectedGroupId("");
    fetchData();
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    if (!activeGroup)
      return alert("Please create or select a Test Group first.");
    if (!testForm.name.trim() || !testForm.price) {
      return alert("Test Name and Price are required.");
    }

    const newTestObj = {
      id: `test_${Date.now()}`,
      name: testForm.name.trim(),
      price: Number(testForm.price),
      discountedPrice: Number(testForm.price),
      refRange: testForm.refRange.trim() || "-",
      unit: testForm.unit.trim() || "",
      isPinned: Boolean(testForm.isPinned),
      isPackage: false
    };

    const updatedTests = [...(activeGroup.tests || []), newTestObj];

    await updateDoc(doc(db, "testCategories", activeGroup.id), {
      tests: updatedTests
    });

    setTestForm({
      name: "",
      price: "",
      refRange: "",
      unit: "",
      isPinned: false
    });
    fetchData();
  };

  const toggleTestPin = async (group, testIndex) => {
    const updatedTests = (group.tests || []).map((t, idx) =>
      idx === testIndex ? { ...t, isPinned: !t.isPinned } : t
    );
    await updateDoc(doc(db, "testCategories", group.id), {
      tests: updatedTests
    });
    fetchData();
  };

  const saveEditedTest = async (group, testIndex) => {
    if (!editingTestData.name.trim() || !editingTestData.price) {
      return alert("Test Name and Price are required.");
    }
    const updatedTests = (group.tests || []).map((t, idx) =>
      idx === testIndex
        ? {
            ...t,
            name: editingTestData.name.trim(),
            price: Number(editingTestData.price),
            discountedPrice: Number(editingTestData.price),
            refRange: editingTestData.refRange.trim() || "-",
            unit: editingTestData.unit.trim() || ""
          }
        : t
    );
    await updateDoc(doc(db, "testCategories", group.id), {
      tests: updatedTests
    });
    setEditingTestIdx(null);
    fetchData();
  };

  const handleDeleteTest = async (group, testIndex) => {
    const target = (group.tests || [])[testIndex];
    if (!window.confirm(`Delete test "${target ? target.name : ""}"?`)) return;

    const updatedTests = (group.tests || []).filter(
      (_, idx) => idx !== testIndex
    );
    await updateDoc(doc(db, "testCategories", group.id), {
      tests: updatedTests
    });
    fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT COLUMN (5 Cols): Test Groups List & Pinning */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800">Create New Test Group</h3>
            <button
              type="button"
              disabled={isSeeding}
              onClick={handleSeedCommonGroups}
              className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded hover:bg-blue-100 transition"
            >
              {isSeeding ? "Adding..." : "⚡ + Seed Common Tests"}
            </button>
          </div>
          <form onSubmit={handleAddGroup} className="space-y-3">
            <input
              type="text"
              placeholder="e.g. Biochemistry, Hematology, Urine Analysis..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm outline-none focus:border-slate-800"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newGroupPinned}
                  onChange={(e) => setNewGroupPinned(e.target.checked)}
                />
                📌 Pin group on top in Staff Desk
              </label>
              <button
                type="submit"
                className="bg-[#0f2d4a] hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition"
              >
                + Add Group
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">
              Test Groups ({sortedCategories.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              📌 Pinned groups show at top
            </span>
          </div>

          <div className="divide-y max-h-[540px] overflow-y-auto">
            {sortedCategories.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">
                No test groups created yet.
              </p>
            ) : (
              sortedCategories.map((group, idx) => {
                const isSelected =
                  activeGroup && activeGroup.id === group.id;
                const title = getSmartGroupName(group, idx);
                const isMissingDbName =
                  !group.name && !group.categoryName && !group.groupName;

                return (
                  <div
                    key={group.id}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setEditingTestIdx(null);
                    }}
                    className={`p-3.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                      isSelected
                        ? "bg-emerald-50 border-l-4 border-emerald-600"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {editingGroupId === group.id ? (
                        <div
                          className="flex gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            placeholder="Enter Group Name"
                            value={editingGroupName}
                            onChange={(e) =>
                              setEditingGroupName(e.target.value)
                            }
                            className="flex-1 p-1.5 border rounded text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => saveGroupRename(group)}
                            className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGroupId(null)}
                            className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-800 truncate">
                            📁 {title}
                          </span>
                          {group.isPinned && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                              📌 PINNED
                            </span>
                          )}
                          {isMissingDbName && (
                            <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Click Rename
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            ({(group.tests || []).length} Tests)
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title={
                          group.isPinned ? "Unpin Group" : "Pin Group to Top"
                        }
                        onClick={() => toggleGroupPin(group)}
                        className={`px-2 py-1 rounded text-xs font-bold border transition ${
                          group.isPinned
                            ? "bg-amber-500 text-white border-amber-600"
                            : "bg-white text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        📌
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingGroupName(title);
                        }}
                        className="px-2 py-1 rounded text-xs font-bold border bg-white text-slate-600 hover:bg-slate-100"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group, idx)}
                        className="px-2 py-1 rounded text-xs font-bold border bg-white text-red-500 hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (7 Cols): Individual Tests in Selected Group */}
      <div className="lg:col-span-7 space-y-6">
        {!activeGroup ? (
          <div className="bg-white p-10 rounded-xl border text-center text-slate-400">
            Create or select a Test Group on the left to add individual tests.
          </div>
        ) : (
          <>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <h3 className="font-bold text-slate-800 mb-1">
                Add Individual Test to:{" "}
                <span className="text-emerald-700">
                  {getSmartGroupName(activeGroup)}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Add any standalone test (including individual parameters like
                Total Cholesterol or Haemoglobin) with its separate price.
              </p>

              <form
                onSubmit={handleAddTest}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input
                  type="text"
                  placeholder="Test Name (e.g. Total Cholesterol, Platelet Count)"
                  value={testForm.name}
                  onChange={(e) =>
                    setTestForm({ ...testForm, name: e.target.value })
                  }
                  className="sm:col-span-2 p-2.5 border rounded-lg text-sm outline-none focus:border-slate-800"
                  required
                />
                <input
                  type="number"
                  placeholder="Separate Price (₹)"
                  value={testForm.price}
                  onChange={(e) =>
                    setTestForm({ ...testForm, price: e.target.value })
                  }
                  className="p-2.5 border rounded-lg text-sm outline-none focus:border-slate-800"
                  required
                />
                <input
                  type="text"
                  placeholder="Reference Range (e.g. 70 - 110 or < 200)"
                  value={testForm.refRange}
                  onChange={(e) =>
                    setTestForm({ ...testForm, refRange: e.target.value })
                  }
                  className="sm:col-span-2 p-2.5 border rounded-lg text-sm outline-none focus:border-slate-800"
                />
                <input
                  type="text"
                  placeholder="Unit (e.g. mg/dL, g/dL, %)"
                  value={testForm.unit}
                  onChange={(e) =>
                    setTestForm({ ...testForm, unit: e.target.value })
                  }
                  className="p-2.5 border rounded-lg text-sm outline-none focus:border-slate-800"
                />

                <div className="sm:col-span-3 flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testForm.isPinned}
                      onChange={(e) =>
                        setTestForm({ ...testForm, isPinned: e.target.checked })
                      }
                    />
                    📌 Pin this test to top of group &amp; search results
                  </label>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    + Add Individual Test
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <h4 className="font-bold text-slate-800 text-sm">
                  Individual Tests in {getSmartGroupName(activeGroup)} (
                  {(activeGroup.tests || []).length})
                </h4>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b text-xs text-slate-600">
                  <tr>
                    <th className="p-3">Test Name</th>
                    <th className="p-3">Ref Range &amp; Unit</th>
                    <th className="p-3">Price</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(activeGroup.tests || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="p-8 text-center text-slate-400"
                      >
                        No individual tests in this group yet.
                      </td>
                    </tr>
                  ) : (
                    (activeGroup.tests || []).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {editingTestIdx === idx ? (
                          <td colSpan="4" className="p-3 bg-emerald-50/50">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                              <input
                                type="text"
                                value={editingTestData.name}
                                onChange={(e) =>
                                  setEditingTestData({
                                    ...editingTestData,
                                    name: e.target.value
                                  })
                                }
                                className="sm:col-span-2 p-1.5 border rounded text-xs font-bold"
                                placeholder="Test Name"
                              />
                              <input
                                type="number"
                                value={editingTestData.price}
                                onChange={(e) =>
                                  setEditingTestData({
                                    ...editingTestData,
                                    price: e.target.value
                                  })
                                }
                                className="p-1.5 border rounded text-xs"
                                placeholder="Price"
                              />
                              <input
                                type="text"
                                value={editingTestData.refRange}
                                onChange={(e) =>
                                  setEditingTestData({
                                    ...editingTestData,
                                    refRange: e.target.value
                                  })
                                }
                                className="p-1.5 border rounded text-xs"
                                placeholder="Ref Range"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <input
                                type="text"
                                value={editingTestData.unit}
                                onChange={(e) =>
                                  setEditingTestData({
                                    ...editingTestData,
                                    unit: e.target.value
                                  })
                                }
                                className="p-1.5 border rounded text-xs w-40"
                                placeholder="Unit (mg/dL)"
                              />
                              <div className="space-x-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    saveEditedTest(activeGroup, idx)
                                  }
                                  className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTestIdx(null)}
                                  className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="p-3 font-bold text-slate-800">
                              {t.name}
                              {t.isPinned && (
                                <span className="ml-2 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-extrabold">
                                  📌 PINNED
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-xs font-mono text-slate-600">
                              {t.refRange || "-"} {t.unit || ""}
                            </td>
                            <td className="p-3 font-bold text-emerald-700">
                              ₹{t.discountedPrice || t.price || 0}
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => toggleTestPin(activeGroup, idx)}
                                className={`px-2 py-1 rounded text-xs font-bold border transition ${
                                  t.isPinned
                                    ? "bg-amber-500 text-white border-amber-600"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                📌
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTestIdx(idx);
                                  setEditingTestData({
                                    name: t.name || "",
                                    price: t.discountedPrice || t.price || "",
                                    refRange: t.refRange || "",
                                    unit: t.unit || ""
                                  });
                                }}
                                className="px-2 py-1 rounded text-xs font-bold border bg-white text-slate-600 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteTest(activeGroup, idx)
                                }
                                className="px-2 py-1 rounded text-xs font-bold border bg-white text-red-500 hover:bg-red-50"
                              >
                                ✕
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// TAB 2: HEALTH PACKAGES & PROFILES MANAGER (WITH FULL EDITING)
// ==========================================
export function PackagesTab({ packages, categories, fetchData }) {
  const [editingPkgId, setEditingPkgId] = useState(null);
  const [pkgForm, setPkgForm] = useState({
    name: "",
    price: "",
    discountedPrice: "",
    groupName: "Health Packages & Profiles",
    isPinned: true,
    isExclusive: false
  });
  const [subTests, setSubTests] = useState([]);
  const [paramInput, setParamInput] = useState({
    name: "",
    refRange: "",
    unit: ""
  });

  const sortedPackages = [...(packages || [])].sort((a, b) => {
    if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
      return b.isPinned ? 1 : -1;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  const resetPackageForm = () => {
    setEditingPkgId(null);
    setPkgForm({
      name: "",
      price: "",
      discountedPrice: "",
      groupName: "Health Packages & Profiles",
      isPinned: true,
      isExclusive: false
    });
    setSubTests([]);
    setParamInput({ name: "", refRange: "", unit: "" });
  };

  const loadPackageForEdit = (pkg) => {
    setEditingPkgId(pkg.id);
    setPkgForm({
      name: pkg.name || "",
      price: pkg.price || "",
      discountedPrice: pkg.discountedPrice || pkg.price || "",
      groupName: pkg.groupName || "Health Packages & Profiles",
      isPinned: Boolean(pkg.isPinned),
      isExclusive: Boolean(pkg.isExclusive)
    });
    setSubTests(
      (pkg.tests || []).map((t, idx) => ({
        id: t.id || `param_${idx}`,
        name: t.name || "",
        refRange: t.refRange || "-",
        unit: t.unit || ""
      }))
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addParameterToList = () => {
    if (!paramInput.name.trim()) return;
    setSubTests([
      ...subTests,
      {
        id: `param_${Date.now()}_${subTests.length}`,
        name: paramInput.name.trim(),
        refRange: paramInput.refRange.trim() || "-",
        unit: paramInput.unit.trim() || ""
      }
    ]);
    setParamInput({ name: "", refRange: "", unit: "" });
  };

  const updateSubTestField = (idx, field, val) => {
    setSubTests(
      subTests.map((st, i) => (i === idx ? { ...st, [field]: val } : st))
    );
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!pkgForm.name.trim() || !pkgForm.price) {
      return alert("Package Name and Price are required.");
    }
    if (subTests.length === 0) {
      return alert("Please add at least one parameter to the package.");
    }

    const payload = {
      name: pkgForm.name.trim(),
      price: Number(pkgForm.price),
      discountedPrice: pkgForm.discountedPrice
        ? Number(pkgForm.discountedPrice)
        : Number(pkgForm.price),
      groupName: pkgForm.groupName || "Health Packages & Profiles",
      isPinned: Boolean(pkgForm.isPinned),
      isExclusive: Boolean(pkgForm.isExclusive),
      isPackage: true,
      tests: subTests
    };

    if (editingPkgId) {
      await updateDoc(doc(db, "packages", editingPkgId), payload);
    } else {
      await addDoc(collection(db, "packages"), {
        ...payload,
        createdAt: new Date().toISOString()
      });
    }

    resetPackageForm();
    fetchData();
  };

  const togglePackagePin = async (pkg) => {
    await updateDoc(doc(db, "packages", pkg.id), {
      isPinned: !pkg.isPinned
    });
    fetchData();
  };

  const togglePackageExclusive = async (pkg) => {
    await updateDoc(doc(db, "packages", pkg.id), {
      isExclusive: !pkg.isExclusive
    });
    fetchData();
  };

  const updatePackageGroup = async (pkg, newGroup) => {
    await updateDoc(doc(db, "packages", pkg.id), {
      groupName: newGroup
    });
    fetchData();
  };

  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`Delete package "${pkg.name}"?`)) return;
    await deleteDoc(doc(db, "packages", pkg.id));
    if (editingPkgId === pkg.id) resetPackageForm();
    fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT: Create or Edit Package */}
      <div className="lg:col-span-5 bg-white p-6 rounded-xl border shadow-sm self-start">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">
            {editingPkgId
              ? "✏️ Edit Health Package / Profile"
              : "Create Health Package / Profile"}
          </h3>
          {editingPkgId && (
            <button
              type="button"
              onClick={resetPackageForm}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 border px-2.5 py-1 rounded"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSavePackage} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              PACKAGE / PROFILE NAME
            </label>
            <input
              type="text"
              placeholder="e.g. Lipid Profile, CBC, Full Body Checkup"
              value={pkgForm.name}
              onChange={(e) =>
                setPkgForm({ ...pkgForm, name: e.target.value })
              }
              className="w-full p-2.5 border rounded-lg text-sm outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                MRP PRICE (₹)
              </label>
              <input
                type="number"
                value={pkgForm.price}
                onChange={(e) =>
                  setPkgForm({ ...pkgForm, price: e.target.value })
                }
                className="w-full p-2.5 border rounded-lg text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                OFFER PRICE (₹)
              </label>
              <input
                type="number"
                placeholder="Optional"
                value={pkgForm.discountedPrice}
                onChange={(e) =>
                  setPkgForm({ ...pkgForm, discountedPrice: e.target.value })
                }
                className="w-full p-2.5 border rounded-lg text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              PLACE INSIDE TEST GROUP (IN STAFF DESK)
            </label>
            <select
              value={pkgForm.groupName}
              onChange={(e) =>
                setPkgForm({ ...pkgForm, groupName: e.target.value })
              }
              className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none"
            >
              <option value="Health Packages & Profiles">
                📦 Health Packages &amp; Profiles (Default Group)
              </option>
              {(categories || []).map((c, i) => {
                const title = getSmartGroupName(c, i);
                return (
                  <option key={c.id} value={title}>
                    📁 {title}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={pkgForm.isPinned}
                onChange={(e) =>
                  setPkgForm({ ...pkgForm, isPinned: e.target.checked })
                }
              />
              📌 Pin Package to Top in Staff Desk
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-purple-800 cursor-pointer">
              <input
                type="checkbox"
                checked={pkgForm.isExclusive}
                onChange={(e) =>
                  setPkgForm({ ...pkgForm, isExclusive: e.target.checked })
                }
              />
              ✨ Show in "Exclusive Health Packages" Showcase on Customer Page
            </label>
          </div>

          {/* Sub-Parameters Builder & Inline Editor */}
          <div className="border-t pt-4">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              INCLUDED PARAMETERS ({subTests.length})
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              These parameters unpack in the Lab Result Desk when this package
              is booked.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                placeholder="Parameter Name"
                value={paramInput.name}
                onChange={(e) =>
                  setParamInput({ ...paramInput, name: e.target.value })
                }
                className="col-span-3 p-2 border rounded text-xs"
              />
              <input
                type="text"
                placeholder="Ref Range (e.g. 70-110)"
                value={paramInput.refRange}
                onChange={(e) =>
                  setParamInput({ ...paramInput, refRange: e.target.value })
                }
                className="col-span-2 p-2 border rounded text-xs"
              />
              <input
                type="text"
                placeholder="Unit (mg/dL)"
                value={paramInput.unit}
                onChange={(e) =>
                  setParamInput({ ...paramInput, unit: e.target.value })
                }
                className="p-2 border rounded text-xs"
              />
            </div>
            <button
              type="button"
              onClick={addParameterToList}
              className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-bold transition mb-3"
            >
              + Add Parameter to Package
            </button>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {subTests.map((st, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 p-1.5 rounded border text-xs"
                >
                  <input
                    type="text"
                    value={st.name}
                    onChange={(e) =>
                      updateSubTestField(i, "name", e.target.value)
                    }
                    className="col-span-5 p-1 border rounded bg-white font-semibold"
                    placeholder="Parameter"
                  />
                  <input
                    type="text"
                    value={st.refRange}
                    onChange={(e) =>
                      updateSubTestField(i, "refRange", e.target.value)
                    }
                    className="col-span-4 p-1 border rounded bg-white font-mono"
                    placeholder="Range"
                  />
                  <input
                    type="text"
                    value={st.unit}
                    onChange={(e) =>
                      updateSubTestField(i, "unit", e.target.value)
                    }
                    className="col-span-2 p-1 border rounded bg-white"
                    placeholder="Unit"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSubTests(subTests.filter((_, idx) => idx !== i))
                    }
                    className="col-span-1 text-red-500 font-bold text-center hover:bg-red-50 rounded py-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#0f2d4a] hover:bg-slate-900 text-white font-bold rounded-lg text-sm transition"
          >
            {editingPkgId ? "Update Package Changes" : "Save New Package"}
          </button>
        </form>
      </div>

      {/* RIGHT: Package List */}
      <div className="lg:col-span-7 bg-white rounded-xl border shadow-sm overflow-hidden self-start">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">
            Configured Packages &amp; Profiles ({sortedPackages.length})
          </h3>
        </div>

        <div className="divide-y">
          {sortedPackages.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">
              No packages created yet.
            </p>
          ) : (
            sortedPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`p-4 flex flex-wrap justify-between items-start gap-4 transition ${
                  editingPkgId === pkg.id ? "bg-amber-50/60" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex-1 min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-base">
                      📦 {pkg.name}
                    </h4>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      ₹{pkg.discountedPrice || pkg.price}
                    </span>
                    {pkg.isPinned && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        📌 PINNED
                      </span>
                    )}
                    {pkg.isExclusive && (
                      <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        ✨ EXCLUSIVE SHOWCASE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500 font-bold">
                      Test Group:
                    </span>
                    <select
                      value={pkg.groupName || "Health Packages & Profiles"}
                      onChange={(e) => updatePackageGroup(pkg, e.target.value)}
                      className="text-xs border rounded p-1 bg-white font-semibold text-slate-700"
                    >
                      <option value="Health Packages & Profiles">
                        📦 Health Packages &amp; Profiles
                      </option>
                      {(categories || []).map((c, i) => {
                        const title = getSmartGroupName(c, i);
                        return (
                          <option key={c.id} value={title}>
                            📁 {title}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {(pkg.tests || []).map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => loadPackageForEdit(pkg)}
                    className="px-2.5 py-1 rounded text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePackagePin(pkg)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                      pkg.isPinned
                        ? "bg-amber-500 text-white border-amber-600"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pkg.isPinned ? "📌 Pinned" : "📌 Pin"}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePackageExclusive(pkg)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                      pkg.isExclusive
                        ? "bg-purple-600 text-white border-purple-700"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pkg.isExclusive ? "✨ Exclusive" : "Routine Profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePackage(pkg)}
                    className="px-2.5 py-1 rounded text-xs font-bold border bg-white text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
