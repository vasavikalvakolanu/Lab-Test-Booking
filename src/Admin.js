import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";

function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [referrals, setReferrals] = useState([]);

  const [settings, setSettings] = useState({
    deliveryEnabled: true,
    maxDistance: 10,
    centers: [{ id: Date.now(), name: "Main Lab", lat: 16.7162, lng: 81.8967 }],
    tiers: [{ id: 1, upTo: 2, fee: 20 }]
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTest, setNewTest] = useState({ name: '', price: '', refRange: '', unit: '', categoryId: '' });
  const [editingTest, setEditingTest] = useState(null);

  const [pkgData, setPkgData] = useState({ name: "", includes: "", price: "", discountedPrice: "", allowCoupons: false });
  const [couponData, setCouponData] = useState({ code: "", discount: "" });
  const [referralData, setReferralData] = useState({ doctorName: "", hospital: "", contact: "", commissionPercentage: "" });

  const [ledgerDoctor, setLedgerDoctor] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

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
      const [snapBookings, snapCats, snapPkgs, snapCoupons, snapRefs, snapSettings] = await Promise.all([
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "testCategories")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "coupons")),
        getDocs(collection(db, "referrals")),
        getDoc(doc(db, "settings", "general"))
      ]);

      setBookings(snapBookings.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setCategories(snapCats.docs.map(d => ({ id: d.id, ...d.data() })));
      setPackages(snapPkgs.docs.map(d => ({ id: d.id, ...d.data() })));
      setCoupons(snapCoupons.docs.map(d => ({ id: d.id, ...d.data() })));
      setReferrals(snapRefs.docs.map(d => ({ id: d.id, ...d.data() })));
      if (snapSettings.exists()) setSettings(snapSettings.data());
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  };

  // --- SMART CATALOG SEEDER (Splits into Packages & Tests) ---
  const seedPredefinedCatalog = async () => {
    if (!window.confirm("This will organize the catalog into Individual Tests and Consolidated Packages. Continue?")) return;
    const batch = writeBatch(db);

    const packagesToSeed = [
      { name: "Complete Urine Analysis", price: 180, includes: "Albumin, Sugar, Bile Salts, Bile Pigments, Urobilinogen, Occult Blood, Microscopic Exam, Pus Cells, RBC, Casts", allowCoupons: false },
      { name: "Lipid Profile", price: 450, includes: "Total Cholesterol, HDL, LDL, VLDL, Triglycerides", allowCoupons: false },
      { name: "Stool Examination", price: 250, includes: "Occult Blood, Ova, Cyst, Glucose", allowCoupons: false },
      { name: "Electrolytes", price: 400, includes: "Sodium (Na+), Potassium (K+), Chlorides", allowCoupons: false },
      { name: "Coagulation Profile", price: 350, includes: "PTT, Control, INR, APTT", allowCoupons: false },
      { name: "Complete Blood Count (CBC)", price: 300, includes: "Total WBC, Differential Count, Platelet Count, Haematocrit (PCV)", allowCoupons: false },
      { name: "Liver Function Test (LFT)", price: 850, includes: "Total Bilirubin, Direct/Indirect Bilirubin, SGPT, SGOT, LFT Vanden Berg", allowCoupons: false }
    ];

    const catsToSeed = [
      { name: "Bio-Chemistry", tests: [
          { id: "t1", name: "Sugar (Fasting)", price: 50, refRange: "70-110", unit: "mg/dL" },
          { id: "t2", name: "Sugar (P.P.)", price: 50, refRange: "110-170", unit: "mg/dL" },
          { id: "t3", name: "Sugar (Random)", price: 50, refRange: "70-140", unit: "mg/dL" },
          { id: "t4", name: "Urea", price: 150, refRange: "15-40", unit: "mg/dL" },
          { id: "t5", name: "Creatinine", price: 150, refRange: "0.9-1.4", unit: "mg/dL" },
          { id: "t6", name: "Total Cholesterol", price: 150, refRange: "150-250", unit: "mg/dL" },
          { id: "t7", name: "Serum Calcium", price: 200, refRange: "8.5-11.0", unit: "mg/dL" },
          { id: "t8", name: "Uric Acid", price: 200, refRange: "3.0-3.60", unit: "mg/dL" }
      ]},
      { name: "Haematology", tests: [
          { id: "t9", name: "Haemoglobin (Hb)", price: 100, refRange: "Men 13.5-16; Women 11.5-15", unit: "g/dL" },
          { id: "t10", name: "ESR (Wintrobe's Method)", price: 100, refRange: "-", unit: "mm/hr" },
          { id: "t11", name: "Bleeding Time", price: 200, refRange: "1-30", unit: "min" },
          { id: "t12", name: "Clotting Time", price: 200, refRange: "3-7", unit: "min" }
      ]},
      { name: "Serology", tests: [
          { id: "t13", name: "Blood Grouping & Rh Typing", price: 100, refRange: "-", unit: "-" },
          { id: "t14", name: "V.D.R.L.", price: 250, refRange: "Negative", unit: "-" },
          { id: "t15", name: "WIDAL (O & H)", price: 300, refRange: "-", unit: "Dils" },
          { id: "t16", name: "R.A. Test", price: 200, refRange: "Negative", unit: "-" },
          { id: "t17", name: "C.R.P.", price: 200, refRange: "Negative", unit: "-" },
          { id: "t18", name: "HBsAg", price: 250, refRange: "Negative", unit: "-" },
          { id: "t19", name: "H.I.V. 1 & 2", price: 300, refRange: "Negative", unit: "-" },
          { id: "t20", name: "Dengue N.S.1", price: 500, refRange: "Negative", unit: "-" }
      ]}
    ];

    catsToSeed.forEach(cat => batch.set(doc(collection(db, "testCategories")), cat));
    packagesToSeed.forEach(pkg => batch.set(doc(collection(db, "packages")), { ...pkg, createdAt: serverTimestamp() }));

    try {
      await batch.commit();
      fetchData();
      alert("Catalog Reorganized & Imported!");
    } catch (error) {
      alert("Error importing catalog.");
    }
  };

  // --- CATALOG EDITING & CRUD ---
  const saveEditTest = async (e) => {
    e.preventDefault();
    const cat = categories.find(c => c.id === editingTest.catId);
    const updatedTests = cat.tests.map(t => 
      t.id === editingTest.id 
        ? { ...t, name: editingTest.name, price: Number(editingTest.price), refRange: editingTest.refRange, unit: editingTest.unit } 
        : t
    );
    await updateDoc(doc(db, "testCategories", editingTest.catId), { tests: updatedTests });
    setEditingTest(null);
    fetchData();
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    await addDoc(collection(db, "testCategories"), { name: newCategoryName, tests: [] });
    setNewCategoryName('');
    fetchData();
  };

  const addTest = async (e) => {
    e.preventDefault();
    if (!newTest.categoryId || !newTest.name || !newTest.price) return alert("Category, Name, and Price are required.");
    const target = categories.find(c => c.id === newTest.categoryId);
    const updated = [...(target.tests || []), { id: Date.now().toString(), name: newTest.name, price: Number(newTest.price), refRange: newTest.refRange, unit: newTest.unit }];
    await updateDoc(doc(db, "testCategories", newTest.categoryId), { tests: updated });
    setNewTest({ name: '', price: '', refRange: '', unit: '', categoryId: newTest.categoryId });
    fetchData();
  };

  const addPackage = async () => {
    if (!pkgData.name || !pkgData.price) return;
    await addDoc(collection(db, "packages"), { ...pkgData, price: Number(pkgData.price), discountedPrice: pkgData.discountedPrice ? Number(pkgData.discountedPrice) : null, createdAt: serverTimestamp() });
    setPkgData({ name: "", includes: "", price: "", discountedPrice: "", allowCoupons: false });
    fetchData();
  };

  const addCoupon = async () => {
    if (!couponData.code || !couponData.discount) return;
    await addDoc(collection(db, "coupons"), { code: couponData.code.toUpperCase().trim(), discount: Number(couponData.discount), createdAt: serverTimestamp() });
    setCouponData({ code: "", discount: "" });
    fetchData();
  };

  // --- DOCTOR LEDGER SYSTEM ---
  const addReferral = async () => {
    if (!referralData.doctorName || !referralData.commissionPercentage) return alert("Doctor Name and Commission % are required");
    await addDoc(collection(db, "referrals"), { ...referralData, commissionPercentage: Number(referralData.commissionPercentage), createdAt: serverTimestamp() });
    setReferralData({ doctorName: "", hospital: "", contact: "", commissionPercentage: "" });
    fetchData();
  };

  const assignDoctor = async (bookingId, doctorId) => {
    await updateDoc(doc(db, "bookings", bookingId), { referralDoctorId: doctorId });
    fetchData();
  };

  const exportLedgerCSV = (docRef) => {
    const docBookings = pastRecords.filter(b => b.referralDoctorId === docRef.id);
    const headers = ["Date", "Patient Name", "Tests Conducted", "Total Bill (Rs)", "Commission Earned (Rs)"];
    const rows = docBookings.map(b => {
        const testsStr = (b.cartItems || b.tests || []).map(t => t.name).join("; ");
        const commission = (b.total * (docRef.commissionPercentage || 0)) / 100;
        return [b.date || "N/A", b.name, `"${testsStr}"`, b.total, commission.toFixed(2)];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `${docRef.doctorName}_Ledger.csv`;
    link.click();
  };

  // --- GENERAL OPS ---
  const deleteDocItem = async (col, id) => {
    if(window.confirm("Confirm deletion?")) {
      await deleteDoc(doc(db, col, id));
      fetchData();
    }
  };

  const markDone = async (id) => {
    await updateDoc(doc(db, "bookings", id), { status: "done" });
    fetchData();
  };

  const saveSettings = async () => {
    await setDoc(doc(db, "settings", "general"), settings);
    alert("Logistics Configuration Saved");
  };

  const filterData = (data) => data.filter(b => 
    (b.name?.toLowerCase().includes(search.toLowerCase()) || b.phone?.includes(search)) && 
    (!selectedDate || b.date === selectedDate)
  );

  const liveBookings = filterData(bookings.filter(b => b.status !== "done"));
  const pastRecords = filterData(bookings.filter(b => b.status === "done"));

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded border border-slate-200 shadow-sm w-96">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">System Administration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded focus:outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded focus:outline-none" required />
            </div>
            <button type="submit" className="w-full bg-slate-800 text-white font-medium py-2 rounded mt-2">Secure Login</button>
          </div>
        </form>
      </div>
    );
  }

  // --- MAIN DASHBOARD INTERFACE ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Sri Balaji Diagnostics</h1>
            <p className="text-xs text-slate-500 font-medium">Enterprise Management Portal</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-sm border px-4 py-1.5 rounded hover:bg-slate-50">Logout</button>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex space-x-1 overflow-x-auto">
          {[
            { id: 'bookings', label: `Live Bookings (${liveBookings.length})` },
            { id: 'catalog', label: 'Test Catalog' },
            { id: 'packages', label: 'Health Packages' },
            { id: 'referrals', label: 'Doctor Referrals' },
            { id: 'coupons', label: 'Promo Coupons' },
            { id: 'settings', label: 'Logistics Engine' },
            { id: 'records', label: 'Past Records' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* SEARCH BAR (Shared for Bookings & Records) */}
        {(activeTab === "bookings" || activeTab === "records") && (
          <div className="flex gap-4 mb-6 bg-white p-4 rounded border shadow-sm">
            <input type="text" placeholder="Search patient name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border rounded text-sm outline-none" />
          </div>
        )}

        {/* --- LIVE BOOKINGS --- */}
        {activeTab === "bookings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liveBookings.length === 0 ? (
              <p className="text-slate-500 text-sm">No active bookings found.</p>
            ) : (
              liveBookings.map(b => (
                <div key={b.id} className="bg-white rounded border border-slate-200 shadow-sm flex flex-col">
                  <div className={`h-1 w-full ${b.collectionType === "home" ? "bg-amber-500" : "bg-slate-700"}`}></div>
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{b.name}</h3>
                        <p className="text-sm text-slate-500">{b.phone}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${b.collectionType === "home" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-100"}`}>
                        {b.collectionType === "home" ? "Home Collection" : "Lab Visit"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded border text-sm">
                      <div><span className="block text-xs text-slate-500">Date</span><span className="font-medium">{b.date}</span></div>
                      <div><span className="block text-xs text-slate-500">Time</span><span className="font-medium">{b.timeSlot}</span></div>
                      {b.collectionType === "home" && <div className="col-span-2"><span className="block text-xs text-slate-500">Address</span><span className="font-medium">{b.address}</span></div>}
                    </div>

                    <div className="mb-4">
                      <span className="block text-xs font-medium text-slate-500 mb-2">Requested Tests</span>
                      <div className="flex flex-wrap gap-2">
                        {(b.cartItems || b.tests || []).map((item, idx) => (
                          <span key={idx} className="bg-slate-100 text-xs px-2 py-1 rounded border">{item.name}</span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Doctor Assignment Dropdown */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Assign Referring Doctor</label>
                      <select 
                        value={b.referralDoctorId || ""} 
                        onChange={(e) => assignDoctor(b.id, e.target.value)} 
                        className="w-full border p-2 rounded text-sm outline-none bg-slate-50"
                      >
                        <option value="">No Referral (Direct Walk-in)</option>
                        {referrals.map(r => (
                          <option key={r.id} value={r.id}>{r.doctorName} ({r.commissionPercentage}% cut)</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-800 p-4 rounded text-white text-sm">
                      <div className="flex justify-between mb-1 text-slate-300"><span>Subtotal:</span><span>₹{b.subtotal}</span></div>
                      {b.couponUsed && <div className="flex justify-between mb-1 text-emerald-400"><span>Discount ({b.couponUsed}):</span><span>- ₹{b.discount}</span></div>}
                      {b.deliveryFee > 0 && <div className="flex justify-between mb-1 text-amber-400"><span>Delivery Fee:</span><span>+ ₹{b.deliveryFee}</span></div>}
                      <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 font-semibold text-base"><span>Total Paid:</span><span>₹{b.total}</span></div>
                    </div>
                  </div>
                  <div className="flex border-t border-slate-200">
                    <button onClick={() => markDone(b.id)} className="flex-1 py-3 bg-white text-emerald-600 font-medium text-sm hover:bg-emerald-50">
                      Mark Complete
                    </button>
                    <div className="w-px bg-slate-200"></div>
                    <a href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your test booking is confirmed for ${b.date}. Total amount: ₹${b.total}.`} target="_blank" rel="noreferrer" className="flex-1 py-3 text-center bg-white text-slate-600 font-medium text-sm hover:bg-slate-50">
                      WhatsApp Notify
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- TEST CATALOG WITH INLINE EDIT --- */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white p-5 rounded border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-semibold">1. Add Subgroup</h2>
                  {categories.length === 0 && (
                    <button onClick={seedPredefinedCatalog} className="text-xs bg-slate-800 text-emerald-400 font-bold px-3 py-1.5 rounded">
                      Auto-Load Catalog
                    </button>
                  )}
                </div>
                <form onSubmit={addCategory} className="flex gap-2">
                  <input type="text" placeholder="e.g. Biochemistry" className="w-full border p-2 text-sm rounded outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded">+</button>
                </form>
              </div>

              <div className="bg-white p-5 rounded border shadow-sm">
                <h2 className="text-sm font-semibold mb-4">2. Add Custom Test</h2>
                <form onSubmit={addTest} className="space-y-3">
                  <select className="w-full border p-2 text-sm rounded outline-none" value={newTest.categoryId} onChange={e => setNewTest({...newTest, categoryId: e.target.value})}>
                    <option value="">Select Existing Subgroup</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  <input type="text" placeholder="Test Name" className="w-full border p-2 text-sm rounded outline-none" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
                  <input type="number" placeholder="Price (₹)" className="w-full border p-2 text-sm rounded outline-none" value={newTest.price} onChange={e => setNewTest({...newTest, price: e.target.value})} />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ref. Range" className="w-1/2 border p-2 text-sm rounded outline-none" value={newTest.refRange} onChange={e => setNewTest({...newTest, refRange: e.target.value})} />
                    <input type="text" placeholder="Unit" className="w-1/2 border p-2 text-sm rounded outline-none" value={newTest.unit} onChange={e => setNewTest({...newTest, unit: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-slate-800 text-white py-2 text-sm rounded mt-2">Add Test</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white border rounded overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="text-sm font-bold">{cat.name}</h3>
                    <button onClick={() => deleteDocItem("testCategories", cat.id)} className="text-red-500 text-xs font-medium hover:underline">
                      Delete Group
                    </button>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b">
                      <tr>
                        <th className="px-4 py-2 text-slate-500">Test</th>
                        <th className="px-4 py-2 text-slate-500">Price</th>
                        <th className="px-4 py-2 text-slate-500">Ref / Unit</th>
                        <th className="px-4 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(cat.tests || []).map(test => 
                        editingTest?.id === test.id ? (
                          <tr key={test.id} className="bg-blue-50">
                            <td className="px-2 py-2">
                              <input value={editingTest.name} onChange={e => setEditingTest({...editingTest, name: e.target.value})} className="w-full border p-1 text-sm outline-none" />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" value={editingTest.price} onChange={e => setEditingTest({...editingTest, price: e.target.value})} className="w-16 border p-1 text-sm outline-none" />
                            </td>
                            <td className="px-2 py-2 flex gap-1">
                              <input value={editingTest.refRange} onChange={e => setEditingTest({...editingTest, refRange: e.target.value})} className="w-1/2 border p-1 text-xs outline-none" />
                              <input value={editingTest.unit} onChange={e => setEditingTest({...editingTest, unit: e.target.value})} className="w-1/2 border p-1 text-xs outline-none" />
                            </td>
                            <td className="px-2 py-2 text-right whitespace-nowrap">
                              <button onClick={saveEditTest} className="text-emerald-600 text-xs font-bold mr-3">Save</button>
                              <button onClick={() => setEditingTest(null)} className="text-slate-500 text-xs">Cancel</button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={test.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-medium">{test.name}</td>
                            <td className="px-4 py-2 font-semibold text-slate-600">₹{test.price}</td>
                            <td className="px-4 py-2 text-xs text-slate-500">
                              <span className="bg-slate-100 px-1 rounded mr-1 border">{test.refRange}</span> {test.unit}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              <button onClick={() => setEditingTest({ catId: cat.id, ...test })} className="text-blue-500 text-xs font-medium mr-3 hover:underline">Edit</button>
                              <button onClick={async () => { 
                                const up = cat.tests.filter(t => t.id !== test.id); 
                                await updateDoc(doc(db, "testCategories", cat.id), { tests: up }); 
                                fetchData(); 
                              }} className="text-red-500 text-xs font-medium hover:underline">Remove</button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- HEALTH PACKAGES --- */}
        {activeTab === "packages" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 bg-white p-5 rounded border shadow-sm self-start">
                <h3 className="text-sm font-semibold mb-4">Create Health Package</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Package Name" value={pkgData.name} onChange={e => setPkgData({...pkgData, name: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
                  <textarea placeholder="Tests Included (Comma Separated)" value={pkgData.includes} onChange={e => setPkgData({...pkgData, includes: e.target.value})} className="w-full p-2 border rounded text-sm h-20 outline-none" />
                  <input type="number" placeholder="Total Value MRP (₹)" value={pkgData.price} onChange={e => setPkgData({...pkgData, price: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
                  <input type="number" placeholder="Offer Price (₹)" value={pkgData.discountedPrice} onChange={e => setPkgData({...pkgData, discountedPrice: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
                  <label className="flex items-center text-sm text-slate-700 mt-2">
                    <input type="checkbox" checked={pkgData.allowCoupons} onChange={e => setPkgData({...pkgData, allowCoupons: e.target.checked})} className="mr-2" /> 
                    Allow Extra Coupons
                  </label>
                  <button onClick={addPackage} className="w-full bg-slate-800 text-white py-2 rounded text-sm mt-2">Create Package</button>
                </div>
             </div>
             <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map(p => (
                  <div key={p.id} className="bg-white border p-5 rounded shadow-sm relative">
                    <button onClick={() => deleteDocItem("packages", p.id)} className="absolute top-4 right-4 text-xs text-red-500 hover:underline">Delete</button>
                    <h3 className="text-base font-semibold pr-10 mb-1">{p.name}</h3>
                    <span className="text-xs text-slate-500 border px-2 py-0.5 rounded bg-slate-50">
                      {p.allowCoupons ? 'Coupons Allowed' : 'No Extra Coupons'}
                    </span>
                    <p className="text-xs text-slate-600 mt-3 mb-4">{p.includes}</p>
                    <div className="pt-3 border-t flex gap-2">
                      {p.discountedPrice ? (
                        <><span className="line-through text-slate-400">₹{p.price}</span><span className="font-bold text-emerald-600 text-lg">₹{p.discountedPrice}</span></>
                      ) : (
                        <span className="font-bold text-lg">₹{p.price}</span>
                      )}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- DOCTOR REFERRALS WITH LEDGER --- */}
        {activeTab === "referrals" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 bg-white p-5 rounded border shadow-sm self-start">
                <h3 className="text-sm font-semibold mb-4">Add Referring Doctor</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Doctor Name" value={referralData.doctorName} onChange={e => setReferralData({...referralData, doctorName: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
                  <input type="text" placeholder="Hospital/Clinic" value={referralData.hospital} onChange={e => setReferralData({...referralData, hospital: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
                  <input type="tel" placeholder="Contact Number" value={referralData.contact} onChange={e => setReferralData({...referralData, contact: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
                  <input type="number" placeholder="Commission (%)" value={referralData.commissionPercentage} onChange={e => setReferralData({...referralData, commissionPercentage: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
                  <button onClick={addReferral} className="w-full bg-slate-800 text-white py-2 rounded text-sm mt-2">Add Doctor</button>
                </div>
             </div>
             <div className="lg:col-span-2">
                <table className="w-full text-left text-sm bg-white border rounded shadow-sm overflow-hidden">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-4 text-slate-600">Doctor</th>
                      <th className="p-4 text-slate-600">Hospital</th>
                      <th className="p-4 text-slate-600">Cut (%)</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referrals.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-4 font-semibold">{r.doctorName}</td>
                        <td className="p-4">{r.hospital}</td>
                        <td className="p-4 font-bold text-emerald-600">{r.commissionPercentage}%</td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button onClick={() => setLedgerDoctor(r)} className="text-blue-600 text-xs font-bold mr-3 bg-blue-50 px-2 py-1 rounded">View Ledger</button>
                          <button onClick={() => deleteDocItem("referrals", r.id)} className="text-red-500 text-xs hover:underline">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- DOCTOR LEDGER MODAL --- */}
        {ledgerDoctor && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded border shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{ledgerDoctor.doctorName}'s Account Ledger</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Agreed Commission Rate: <span className="font-bold text-emerald-600">{ledgerDoctor.commissionPercentage}%</span>
                  </p>
                </div>
                <button onClick={() => setLedgerDoctor(null)} className="text-slate-400 hover:text-red-500 text-2xl leading-none">&times;</button>
              </div>
              <div className="overflow-y-auto p-5 flex-1">
                <table className="w-full text-left text-sm border">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Tests Done</th>
                      <th className="p-3">Total Bill</th>
                      <th className="p-3 text-emerald-600">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pastRecords.filter(b => b.referralDoctorId === ledgerDoctor.id).length === 0 ? (
                      <tr><td colSpan="5" className="p-5 text-center text-slate-500">No patients referred yet.</td></tr>
                    ) : (
                     pastRecords.filter(b => b.referralDoctorId === ledgerDoctor.id).map(b => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">{b.date}</td>
                          <td className="p-3 font-semibold">{b.name}</td>
                          <td className="p-3 text-xs text-slate-600 max-w-[200px] truncate">
                            {(b.cartItems || b.tests || []).map(t => t.name).join(", ")}
                          </td>
                          <td className="p-3">₹{b.total}</td>
                          <td className="p-3 font-bold text-emerald-600">₹{((b.total * ledgerDoctor.commissionPercentage) / 100).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-5 border-t bg-slate-50 flex justify-end">
                <button onClick={() => exportLedgerCSV(ledgerDoctor)} className="bg-emerald-600 text-white font-medium px-6 py-2 rounded text-sm hover:bg-emerald-700">
                  Download Excel / CSV Export
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PROMO COUPONS --- */}
        {activeTab === "coupons" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded border shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-600 mb-1">Coupon Code</label>
                <input type="text" value={couponData.code} onChange={e => setCouponData({...couponData, code: e.target.value})} className="w-full p-2 border rounded uppercase text-sm outline-none" />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
                <input type="number" value={couponData.discount} onChange={e => setCouponData({...couponData, discount: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
              </div>
              <button onClick={addCoupon} className="w-full md:w-auto bg-slate-800 text-white py-2 px-6 rounded text-sm">
                Create Promo
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {coupons.map(c => (
                <div key={c.id} className="bg-white border p-5 rounded shadow-sm text-center relative border-t-4 border-t-emerald-500">
                  <button onClick={() => deleteDocItem("coupons", c.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-lg">&times;</button>
                  <h3 className="text-xl font-bold tracking-wider mt-2">{c.code}</h3>
                  <div className="mt-2 text-emerald-600 font-semibold text-sm bg-emerald-50 py-1 rounded inline-block px-3">{c.discount}% OFF</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- LOGISTICS ENGINE --- */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded border shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold">Enable Paid Home Delivery</h3>
                <p className="text-xs text-slate-500 mt-1">If OFF, checkout shows "FREE" for all patients.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.deliveryEnabled} onChange={e => setSettings({...settings, deliveryEnabled: e.target.checked})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
              </label>
            </div>

            <div className="bg-white p-6 rounded border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold">Collection Centers</h3>
                <button onClick={() => setSettings({...settings, centers: [...settings.centers, { id: Date.now(), name: "", lat: 0, lng: 0 }]})} className="text-xs border px-3 py-1.5 rounded">+ Add Center</button>
              </div>
              {settings.centers.map((c, idx) => (
                <div key={c.id} className="flex flex-wrap md:flex-nowrap gap-3 mb-3 items-end bg-slate-50 p-3 border rounded">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Branch Name</label>
                    <input type="text" value={c.name} onChange={e => { const n = [...settings.centers]; n[idx].name = e.target.value; setSettings({...settings, centers: n}); }} className="w-full p-2 border rounded text-sm" />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-xs text-slate-500 mb-1">Lat</label>
                    <input type="number" value={c.lat} onChange={e => { const n = [...settings.centers]; n[idx].lat = Number(e.target.value); setSettings({...settings, centers: n}); }} className="w-full p-2 border rounded text-sm" />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-xs text-slate-500 mb-1">Lng</label>
                    <input type="number" value={c.lng} onChange={e => { const n = [...settings.centers]; n[idx].lng = Number(e.target.value); setSettings({...settings, centers: n}); }} className="w-full p-2 border rounded text-sm" />
                  </div>
                  <button onClick={() => setSettings({...settings, centers: settings.centers.filter((_, i) => i !== idx)})} disabled={settings.centers.length === 1} className="text-red-500 p-2 text-sm disabled:opacity-30">Remove</button>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold">Pricing Tiers</h3>
                <button onClick={() => setSettings({...settings, tiers: [...settings.tiers, { id: Date.now(), upTo: 0, fee: 0 }]})} className="text-xs border px-3 py-1.5 rounded">+ Add Tier</button>
              </div>
              <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                  <span className="text-sm font-semibold block">Maximum Range</span>
                  <span className="text-xs text-slate-500">Block bookings beyond this distance.</span>
                </div>
                <div className="flex items-center">
                  <input type="number" value={settings.maxDistance} onChange={e => setSettings({...settings, maxDistance: Number(e.target.value)})} className="w-16 p-2 border rounded text-sm text-right" />
                  <span className="ml-2 text-sm font-medium">km</span>
                </div>
              </div>
              <div className="space-y-3">
                {settings.tiers.sort((a,b) => a.upTo - b.upTo).map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between bg-slate-50 p-3 border rounded text-sm">
                    <div className="flex items-center">
                      <span className="text-slate-600 mr-2 w-24">Distance up to</span>
                      <input type="number" value={t.upTo} onChange={e => { const n = [...settings.tiers]; n[idx].upTo = Number(e.target.value); setSettings({...settings, tiers: n}); }} className="w-16 p-1.5 border rounded text-center" />
                      <span className="ml-2 text-slate-500">km</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-slate-600 mr-2">Delivery Fee ₹</span>
                      <input type="number" value={t.fee} onChange={e => { const n = [...settings.tiers]; n[idx].fee = Number(e.target.value); setSettings({...settings, tiers: n}); }} className="w-16 p-1.5 border rounded text-center" />
                    </div>
                    <button onClick={() => setSettings({...settings, tiers: settings.tiers.filter((_, i) => i !== idx)})} className="text-red-500 text-xs">Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-slate-800 text-white font-medium py-3 rounded">
              Save Logistics
            </button>
          </div>
        )}

        {/* --- PAST RECORDS --- */}
        {activeTab === "records" && (
          <div className="bg-white rounded border shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Tests Conducted</th>
                  <th className="p-4">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastRecords.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400">No completed patient records found.</td></tr>
                ) : (
                  pastRecords.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-4">{b.date}</td>
                      <td className="p-4 font-medium">{b.name}</td>
                      <td className="p-4 text-slate-600 max-w-md truncate">
                        {(b.cartItems || b.tests || []).map(i => i.name).join(", ")}
                      </td>
                      <td className="p-4 font-bold">₹{b.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default Admin;
