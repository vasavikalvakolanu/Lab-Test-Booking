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
  const [pkgData, setPkgData] = useState({ name: "", includes: "", price: "", discountedPrice: "", allowCoupons: false });
  const [couponData, setCouponData] = useState({ code: "", discount: "" });
  const [referralData, setReferralData] = useState({ doctorName: "", hospital: "", contact: "", commission: "" });
  
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
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { alert("Authentication failed."); }
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
    } catch (error) { console.error("Data fetch error:", error); }
  };

  // --- PREDEFINED CATALOG SEEDING ---
  const seedPredefinedCatalog = async () => {
    if (!window.confirm("This will load the default test catalog into the database. Continue?")) return;
    const batch = writeBatch(db);
    const predefined = [
      { name: "Biochemistry", tests: [ { id: "b1", name: "Fasting Blood Sugar (FBS)", price: 150, refRange: "70-100", unit: "mg/dL" }, { id: "b2", name: "Serum Creatinine", price: 200, refRange: "0.6-1.2", unit: "mg/dL" }, { id: "b3", name: "Lipid Profile", price: 600, refRange: "-", unit: "-" } ] },
      { name: "Hematology", tests: [ { id: "h1", name: "Complete Blood Count (CBC)", price: 300, refRange: "4.5-5.5", unit: "mill/µL" }, { id: "h2", name: "Hemoglobin (Hb)", price: 150, refRange: "12-17", unit: "g/dL" } ] },
      { name: "Immunology", tests: [ { id: "i1", name: "Thyroid Profile (T3, T4, TSH)", price: 500, refRange: "-", unit: "-" } ] },
      { name: "Pathology", tests: [ { id: "p1", name: "Urine Routine Examination", price: 100, refRange: "-", unit: "-" } ] }
    ];

    predefined.forEach(cat => {
      const docRef = doc(collection(db, "testCategories"));
      batch.set(docRef, cat);
    });

    await batch.commit();
    fetchData();
    alert("Catalog seeded successfully.");
  };

  // --- CRUD OPERATIONS ---
  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    await addDoc(collection(db, "testCategories"), { name: newCategoryName, tests: [] });
    setNewCategoryName(''); fetchData();
  };

  const addTest = async (e) => {
    e.preventDefault();
    if (!newTest.categoryId || !newTest.name) return alert("Category and Name required.");
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
    setCouponData({ code: "", discount: "" }); fetchData();
  };

  const addReferral = async () => {
    if (!referralData.doctorName) return;
    await addDoc(collection(db, "referrals"), { ...referralData, createdAt: serverTimestamp() });
    setReferralData({ doctorName: "", hospital: "", contact: "", commission: "" }); fetchData();
  };

  const deleteDocItem = async (col, id) => {
    if(window.confirm("Confirm deletion?")) { await deleteDoc(doc(db, col, id)); fetchData(); }
  };

  const markDone = async (id) => { 
    await updateDoc(doc(db, "bookings", id), { status: "done" }); fetchData(); 
  };

  const saveSettings = async () => {
    await setDoc(doc(db, "settings", "general"), settings);
    alert("Logistics Configuration Saved");
  };

  const filterData = (data) => data.filter((b) => {
    const matchSearch = (b.name?.toLowerCase().includes(search.toLowerCase())) || (b.phone?.includes(search));
    const matchDate = !selectedDate || b.date === selectedDate;
    return matchSearch && matchDate;
  });

  const liveBookings = filterData(bookings.filter(b => b.status !== "done"));
  const pastRecords = filterData(bookings.filter(b => b.status === "done"));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded border border-slate-200 shadow-sm w-96">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">System Administration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-slate-500 outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-slate-500 outline-none" required />
            </div>
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded mt-2">Secure Login</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      {/* Header & Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Sri Balaji Diagnostics</h1>
            <p className="text-xs text-slate-500 font-medium">Enterprise Management Portal</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-sm font-medium text-slate-500 hover:text-slate-900 border border-slate-200 px-4 py-1.5 rounded">Logout</button>
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
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Search Bar (Bookings & Records) */}
        {(activeTab === "bookings" || activeTab === "records") && (
          <div className="flex gap-4 mb-6 bg-white p-4 rounded border border-slate-200 shadow-sm">
            <input type="text" placeholder="Search patient name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded text-sm outline-none focus:border-slate-500" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border border-slate-300 rounded text-sm outline-none focus:border-slate-500" />
          </div>
        )}

        {/* --- LIVE BOOKINGS --- */}
        {activeTab === "bookings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liveBookings.length === 0 ? <p className="text-slate-500 text-sm">No active bookings found.</p> : liveBookings.map(b => (
              <div key={b.id} className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className={`h-1 w-full ${b.collectionType === "home" ? "bg-amber-500" : "bg-slate-700"}`}></div>
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{b.name}</h3>
                      <p className="text-sm text-slate-500">{b.phone}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${b.collectionType === "home" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-300"}`}>
                      {b.collectionType === "home" ? "Home Collection" : "Lab Visit"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded border border-slate-100 text-sm">
                    <div><span className="block text-xs text-slate-500">Date</span><span className="font-medium">{b.date}</span></div>
                    <div><span className="block text-xs text-slate-500">Time Slot</span><span className="font-medium">{b.timeSlot}</span></div>
                    {b.collectionType === "home" && <div className="col-span-2"><span className="block text-xs text-slate-500">Address</span><span className="font-medium">{b.address}</span></div>}
                  </div>

                  <div className="mb-6">
                    <span className="block text-xs font-medium text-slate-500 mb-2">Requested Tests</span>
                    <div className="flex flex-wrap gap-2">
                      {(b.cartItems || b.tests || []).map((item, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded border border-slate-200">{item.name}</span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800 p-4 rounded text-white text-sm">
                    <div className="flex justify-between mb-1 text-slate-300"><span>Subtotal:</span><span>₹{b.subtotal}</span></div>
                    {b.couponUsed && <div className="flex justify-between mb-1 text-emerald-400"><span>Discount ({b.couponUsed}):</span><span>- ₹{b.discount}</span></div>}
                    {b.deliveryFee > 0 && <div className="flex justify-between mb-1 text-amber-400"><span>Delivery Fee:</span><span>+ ₹{b.deliveryFee}</span></div>}
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 font-semibold text-base"><span>Total Paid:</span><span>₹{b.total}</span></div>
                  </div>
                </div>
                <div className="flex border-t border-slate-200">
                  <button onClick={() => markDone(b.id)} className="flex-1 py-3 bg-white text-emerald-600 font-medium text-sm hover:bg-emerald-50 transition">Mark Complete</button>
                  <div className="w-px bg-slate-200"></div>
                  <a href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your test booking is confirmed for ${b.date}. Total amount: ₹${b.total}.`} target="_blank" rel="noreferrer" className="flex-1 py-3 text-center bg-white text-slate-600 font-medium text-sm hover:bg-slate-50 transition">WhatsApp Notify</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TEST CATALOG --- */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-semibold">1. Add Subgroup</h2>
                  {categories.length === 0 && <button onClick={seedPredefinedCatalog} className="text-xs bg-slate-800 text-white px-2 py-1 rounded">Load Defaults</button>}
                </div>
                <form onSubmit={addCategory} className="flex gap-2">
                  <input type="text" placeholder="e.g. Biochemistry" className="w-full border border-slate-300 p-2 text-sm rounded focus:outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button type="submit" className="bg-slate-800 text-white px-4 py-2 text-sm rounded">+</button>
                </form>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <h2 className="text-sm font-semibold mb-4">2. Add New Test</h2>
                <form onSubmit={addTest} className="space-y-3">
                  <select className="w-full border border-slate-300 p-2 text-sm rounded focus:outline-none" value={newTest.categoryId} onChange={e => setNewTest({...newTest, categoryId: e.target.value})}>
                    <option value="">Select Subgroup</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  <input type="text" placeholder="Test Name" className="w-full border border-slate-300 p-2 text-sm rounded focus:outline-none" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
                  <input type="number" placeholder="Price (₹)" className="w-full border border-slate-300 p-2 text-sm rounded focus:outline-none" value={newTest.price} onChange={e => setNewTest({...newTest, price: e.target.value})} />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ref. Range" className="w-1/2 border border-slate-300 p-2 text-sm rounded focus:outline-none" value={newTest.refRange} onChange={e => setNewTest({...newTest, refRange: e.target.value})} />
                    <input type="text" placeholder="Unit" className="w-1/2 border border-slate-300 p-2 text-sm rounded focus:outline-none" value={newTest.unit} onChange={e => setNewTest({...newTest, unit: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-slate-800 text-white font-medium py-2 text-sm rounded mt-2">Add to Catalog</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-800">{cat.name}</h3>
                    <button onClick={() => deleteDocItem("testCategories", cat.id)} className="text-red-500 text-xs font-medium hover:underline">Delete Group</button>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-100">
                      <tr><th className="px-4 py-2 font-medium text-slate-500">Test</th><th className="px-4 py-2 font-medium text-slate-500">Price</th><th className="px-4 py-2 font-medium text-slate-500">Range</th><th className="px-4 py-2 text-right"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(cat.tests || []).map(test => (
                        <tr key={test.id}>
                          <td className="px-4 py-2 font-medium">{test.name}</td><td className="px-4 py-2 text-slate-600">₹{test.price}</td><td className="px-4 py-2 text-slate-500 text-xs">{test.refRange} {test.unit}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={async () => {
                              const updated = cat.tests.filter(t => t.id !== test.id);
                              await updateDoc(doc(db, "testCategories", cat.id), { tests: updated }); fetchData();
                            }} className="text-red-500 text-xs">Remove</button>
                          </td>
                        </tr>
                      ))}
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
             <div className="lg:col-span-1 bg-white p-5 rounded border border-slate-200 shadow-sm self-start">
                <h3 className="text-sm font-semibold mb-4">Create Health Package</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Package Name" value={pkgData.name} onChange={e => setPkgData({...pkgData, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
                  <textarea placeholder="Tests Included (Comma Separated)" value={pkgData.includes} onChange={e => setPkgData({...pkgData, includes: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none h-20 resize-none" />
                  <input type="number" placeholder="Total Value MRP (₹)" value={pkgData.price} onChange={e => setPkgData({...pkgData, price: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
                  <input type="number" placeholder="Offer Price (₹)" value={pkgData.discountedPrice} onChange={e => setPkgData({...pkgData, discountedPrice: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
                  <label className="flex items-center text-sm text-slate-700 mt-2">
                    <input type="checkbox" checked={pkgData.allowCoupons} onChange={e => setPkgData({...pkgData, allowCoupons: e.target.checked})} className="mr-2" /> Allow Extra Coupons
                  </label>
                  <button onClick={addPackage} className="w-full bg-slate-800 text-white font-medium py-2 rounded text-sm mt-2">Create Package</button>
                </div>
             </div>
             <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 p-5 rounded shadow-sm relative">
                    <button onClick={() => deleteDocItem("packages", p.id)} className="absolute top-4 right-4 text-xs text-red-500 font-medium">Delete</button>
                    <h3 className="text-base font-semibold pr-10 mb-1">{p.name}</h3>
                    <span className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded">{p.allowCoupons ? 'Coupons Allowed' : 'No Extra Coupons'}</span>
                    <p className="text-xs text-slate-600 mt-3 mb-4 leading-relaxed">{p.includes}</p>
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                       {p.discountedPrice ? (
                          <><span className="line-through text-slate-400 text-sm">₹{p.price}</span><span className="font-semibold text-emerald-600 text-lg">₹{p.discountedPrice}</span></>
                       ) : <span className="font-semibold text-slate-800 text-lg">₹{p.price}</span>}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- DOCTOR REFERRALS --- */}
        {activeTab === "referrals" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 bg-white p-5 rounded border border-slate-200 shadow-sm self-start">
                <h3 className="text-sm font-semibold mb-4">Add Referring Doctor</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Doctor Name (e.g. Dr. Smith)" value={referralData.doctorName} onChange={e => setReferralData({...referralData, doctorName: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
                  <input type="text" placeholder="Hospital/Clinic Name" value={referralData.hospital} onChange={e => setReferralData({...referralData, hospital: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
                  <input type="tel" placeholder="Contact Number" value={referralData.contact} onChange={e => setReferralData({...referralData, contact: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
                  <input type="text" placeholder="Commission Rate/Notes" value={referralData.commission} onChange={e => setReferralData({...referralData, commission: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
                  <button onClick={addReferral} className="w-full bg-slate-800 text-white font-medium py-2 rounded text-sm mt-2">Save Doctor</button>
                </div>
             </div>
             <div className="lg:col-span-2">
                <table className="w-full text-left text-sm bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><th className="p-4 font-medium text-slate-600">Doctor</th><th className="p-4 font-medium text-slate-600">Hospital</th><th className="p-4 font-medium text-slate-600">Contact</th><th className="p-4 font-medium text-slate-600">Notes</th><th className="p-4 text-right"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referrals.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-4 font-medium">{r.doctorName}</td><td className="p-4 text-slate-600">{r.hospital}</td><td className="p-4 text-slate-600">{r.contact}</td><td className="p-4 text-slate-600">{r.commission}</td>
                        <td className="p-4 text-right"><button onClick={() => deleteDocItem("referrals", r.id)} className="text-red-500 text-xs">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- PROMO COUPONS --- */}
        {activeTab === "coupons" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-600 mb-1">Coupon Code (e.g. SAVE20)</label>
                <input type="text" value={couponData.code} onChange={e => setCouponData({...couponData, code: e.target.value})} className="w-full p-2 border border-slate-300 rounded uppercase text-sm focus:outline-none" />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
                <input type="number" value={couponData.discount} onChange={e => setCouponData({...couponData, discount: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" />
              </div>
              <button onClick={addCoupon} className="w-full md:w-auto bg-slate-800 text-white font-medium px-6 py-2 rounded text-sm">Create Coupon</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {coupons.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 p-5 rounded shadow-sm text-center relative">
                  <button onClick={() => deleteDocItem("coupons", c.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">×</button>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-wide mt-2">{c.code}</h3>
                  <div className="mt-2 text-emerald-600 font-medium text-sm">{c.discount}% OFF</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- LOGISTICS ENGINE --- */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Enable Paid Home Delivery</h3>
                <p className="text-xs text-slate-500 mt-1">If OFF, distance limits are bypassed and checkout shows "FREE".</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.deliveryEnabled} onChange={e => setSettings({...settings, deliveryEnabled: e.target.checked})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
              </label>
            </div>

            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-semibold">Collection Centers</h3>
                <button onClick={() => setSettings({...settings, centers: [...settings.centers, { id: Date.now(), name: "", lat: 0, lng: 0 }]})} className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50">+ Add Center</button>
              </div>
              <p className="text-xs text-slate-500 mb-4">Calculates delivery fee based on distance from the closest active center.</p>
              {settings.centers.map((c, idx) => (
                <div key={c.id} className="flex flex-wrap md:flex-nowrap gap-3 mb-3 items-end bg-slate-50 p-3 border border-slate-100 rounded">
                  <div className="flex-1"><label className="block text-xs font-medium text-slate-500 mb-1">Branch Name</label><input type="text" value={c.name} onChange={e => { const n = [...settings.centers]; n[idx].name = e.target.value; setSettings({...settings, centers: n}); }} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" /></div>
                  <div className="w-1/4"><label className="block text-xs font-medium text-slate-500 mb-1">Lat</label><input type="number" value={c.lat} onChange={e => { const n = [...settings.centers]; n[idx].lat = Number(e.target.value); setSettings({...settings, centers: n}); }} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" /></div>
                  <div className="w-1/4"><label className="block text-xs font-medium text-slate-500 mb-1">Lng</label><input type="number" value={c.lng} onChange={e => { const n = [...settings.centers]; n[idx].lng = Number(e.target.value); setSettings({...settings, centers: n}); }} className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none" /></div>
                  <button onClick={() => setSettings({...settings, centers: settings.centers.filter((_, i) => i !== idx)})} disabled={settings.centers.length === 1} className="text-red-500 p-2 text-sm disabled:opacity-30">Remove</button>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-semibold">Pricing Tiers</h3>
                <button onClick={() => setSettings({...settings, tiers: [...settings.tiers, { id: Date.now(), upTo: 0, fee: 0 }]})} className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50">+ Add Tier</button>
              </div>
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div><span className="text-sm font-semibold block">Maximum Range</span><span className="text-xs text-slate-500">Block bookings beyond this distance.</span></div>
                <div className="flex items-center"><input type="number" value={settings.maxDistance} onChange={e => setSettings({...settings, maxDistance: Number(e.target.value)})} className="w-16 p-2 border border-slate-300 rounded text-sm text-right focus:outline-none" /><span className="ml-2 text-sm font-medium text-slate-600">km</span></div>
              </div>
              <div className="space-y-3">
                {settings.tiers.sort((a,b) => a.upTo - b.upTo).map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between bg-slate-50 p-3 border border-slate-100 rounded text-sm">
                    <div className="flex items-center"><span className="text-slate-600 mr-2 w-24">Distance up to</span><input type="number" value={t.upTo} onChange={e => { const n = [...settings.tiers]; n[idx].upTo = Number(e.target.value); setSettings({...settings, tiers: n}); }} className="w-16 p-1.5 border border-slate-300 rounded text-center focus:outline-none" /><span className="ml-2 text-slate-500">km</span></div>
                    <div className="flex items-center"><span className="text-slate-600 mr-2">Delivery Fee ₹</span><input type="number" value={t.fee} onChange={e => { const n = [...settings.tiers]; n[idx].fee = Number(e.target.value); setSettings({...settings, tiers: n}); }} className="w-16 p-1.5 border border-slate-300 rounded text-center focus:outline-none" /></div>
                    <button onClick={() => setSettings({...settings, tiers: settings.tiers.filter((_, i) => i !== idx)})} className="text-red-500 text-xs">Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-slate-800 text-white font-medium py-3 rounded">Save Logistics Configuration</button>
          </div>
        )}

        {/* --- PAST RECORDS --- */}
        {activeTab === "records" && (
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr><th className="p-4 font-medium text-slate-600">Date</th><th className="p-4 font-medium text-slate-600">Patient</th><th className="p-4 font-medium text-slate-600">Tests</th><th className="p-4 font-medium text-slate-600">Amount Paid</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastRecords.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-slate-400">No records found.</td></tr> : pastRecords.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-500">{b.date}</td>
                    <td className="p-4 font-medium">{b.name}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{(b.cartItems || b.tests || []).map(i => i.name).join(", ")}</td>
                    <td className="p-4 font-medium">₹{b.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default Admin; 
