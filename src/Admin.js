import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

// Import your newly refactored components
import { BookingsTab, RecordsTab } from "./admin/AdminBookings";
import { CatalogTab, PackagesTab } from "./admin/AdminCatalog";
import { ReferralsTab, CouponsTab, SettingsTab } from "./admin/AdminSettings";

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
  
  const [settings, setSettings] = useState({ deliveryEnabled: true, maxDistance: 10, centers: [], tiers: [] });
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
    catch (error) { alert("Authentication failed. Please check credentials."); }
  };

  const fetchData = async () => {
    try {
      const [snapBookings, snapCats, snapPkgs, snapCoupons, snapRefs, snapSettings] = await Promise.all([
        getDocs(collection(db, "bookings")), getDocs(collection(db, "testCategories")),
        getDocs(collection(db, "packages")), getDocs(collection(db, "coupons")),
        getDocs(collection(db, "referrals")), getDoc(doc(db, "settings", "general"))
      ]);
      setBookings(snapBookings.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setCategories(snapCats.docs.map(d => ({ id: d.id, ...d.data() })));
      setPackages(snapPkgs.docs.map(d => ({ id: d.id, ...d.data() })));
      setCoupons(snapCoupons.docs.map(d => ({ id: d.id, ...d.data() })));
      setReferrals(snapRefs.docs.map(d => ({ id: d.id, ...d.data() })));
      if (snapSettings.exists()) setSettings(snapSettings.data());
    } catch (error) { console.error("Data fetch error:", error); }
  };

  const filterData = (data) => data.filter(b => (b.name?.toLowerCase().includes(search.toLowerCase()) || b.phone?.includes(search)) && (!selectedDate || b.date === selectedDate));
  const liveBookings = filterData(bookings.filter(b => b.status !== "done"));
  const pastRecords = filterData(bookings.filter(b => b.status === "done"));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded border shadow-sm w-96">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">System Administration</h2>
          <div className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded outline-none" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded outline-none" required />
            <button type="submit" className="w-full bg-slate-800 text-white font-medium py-2 rounded mt-2">Secure Login</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div><h1 className="text-xl font-semibold">Sri Balaji Diagnostics</h1><p className="text-xs text-slate-500">Enterprise Portal</p></div>
          <button onClick={() => signOut(auth)} className="text-sm border px-4 py-1.5 rounded">Logout</button>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex space-x-1 overflow-x-auto">
          {[
            { id: 'bookings', label: `Live Bookings (${liveBookings.length})` }, { id: 'catalog', label: 'Test Catalog' },
            { id: 'packages', label: 'Health Packages' }, { id: 'referrals', label: 'Doctor Referrals' },
            { id: 'coupons', label: 'Promo Coupons' }, { id: 'settings', label: 'Logistics Engine' }, { id: 'records', label: 'Past Records' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500'}`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {(activeTab === "bookings" || activeTab === "records") && (
          <div className="flex gap-4 mb-6 bg-white p-4 rounded border shadow-sm">
            <input type="text" placeholder="Search patient name..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border rounded text-sm outline-none" />
          </div>
        )}

        {/* Dynamic Component Rendering */}
        {activeTab === "bookings" && <BookingsTab liveBookings={liveBookings} referrals={referrals} fetchData={fetchData} />}
        {activeTab === "catalog" && <CatalogTab categories={categories} fetchData={fetchData} />}
        {activeTab === "packages" && <PackagesTab packages={packages} fetchData={fetchData} />}
        {activeTab === "referrals" && <ReferralsTab referrals={referrals} pastRecords={pastRecords} fetchData={fetchData} />}
        {activeTab === "coupons" && <CouponsTab coupons={coupons} fetchData={fetchData} />}
        {activeTab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} />}
        {activeTab === "records" && <RecordsTab pastRecords={pastRecords} />}
      </div>
    </div>
  );
}

export default Admin;
