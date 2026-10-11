import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

// Note: Using capital 'Admin' folder path exactly as you requested!
import { BookingsTab, RecordsTab } from "./Admin/AdminBookings";
import { CatalogTab, PackagesTab } from "./Admin/AdminCatalog";
import { ReferralsTab, CouponsTab, SettingsTab } from "./Admin/AdminSettings";
import { StaffDesk } from "./Admin/StaffDesk"; 

// FEATURE 9: Role-Based Access Control
// Add your specific admin email here. Anyone else who logs in will ONLY see the Staff Desk.
const ADMIN_EMAILS = ["vasavikalvakolanu@gmail.com", "satyahanush@gmail.com"]; 

function Admin() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [activeTab, setActiveTab] = useState("desk"); // Default opens to Staff Desk
  
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
      if (currentUser) {
        // Check if the logged-in email is in the admin list
        setRole(ADMIN_EMAILS.includes(currentUser.email) ? "admin" : "staff");
        fetchData();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try { 
      await signInWithEmailAndPassword(auth, email, password); 
    } catch (error) { 
      alert("Authentication failed. Please check your credentials."); 
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

  const filterData = (data) => data.filter(b => 
    (b.name?.toLowerCase().includes(search.toLowerCase()) || b.phone?.includes(search)) && 
    (!selectedDate || b.date === selectedDate)
  );
  
  const liveBookings = filterData(bookings.filter(b => b.status !== "done" && b.status !== "completed"));
  const pastRecords = filterData(bookings.filter(b => b.status === "done" || b.status === "completed"));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded border shadow-sm w-96">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">System Administration</h2>
          <div className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded outline-none focus:border-slate-500" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded outline-none focus:border-slate-500" required />
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded mt-2 transition">Secure Login</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      
      {/* Dynamic Header & Navigation */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Sri Balaji Diagnostics</h1>
            <p className="text-xs text-slate-500 font-medium">Logged in as {role.toUpperCase()}</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-sm font-medium border border-slate-200 px-4 py-1.5 rounded hover:bg-slate-50 transition">Logout</button>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex space-x-1 overflow-x-auto">
          
          {/* Staff Tab (Visible to ALL users) */}
          <button onClick={() => setActiveTab("desk")} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "desk" ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            Staff Processing Desk
          </button>
          
          {/* Admin Tabs (Visible ONLY if role is "admin") */}
          {role === "admin" && [
            { id: 'bookings', label: `Web Bookings (${liveBookings.filter(b => b.collectionType === "home").length})` }, 
            { id: 'catalog', label: 'Test Catalog' },
            { id: 'packages', label: 'Health Packages' }, 
            { id: 'referrals', label: 'Doctor Referrals' },
            { id: 'coupons', label: 'Promo Coupons' }, 
            { id: 'settings', label: 'Logistics Engine' }, 
            { id: 'records', label: 'Past Records' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Universal Search Bar for Bookings/Records */}
        {(activeTab === "bookings" || activeTab === "records") && (
          <div className="flex gap-4 mb-6 bg-white p-4 rounded border shadow-sm">
            <input type="text" placeholder="Search patient name or phone number..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-slate-500" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border rounded text-sm outline-none focus:border-slate-500" />
          </div>
        )}

        {/* Dynamic Component Rendering Based on Tab Selection */}
        {activeTab === "desk" && <StaffDesk categories={categories} packages={packages} referrals={referrals} liveBookings={liveBookings} userEmail={user.email} fetchData={fetchData} />}
        
        {/* Only render Admin Components if the user has admin privileges */}
        {role === "admin" && (
          <>
            {activeTab === "bookings" && <BookingsTab liveBookings={liveBookings.filter(b => b.collectionType === "home")} referrals={referrals} fetchData={fetchData} />}
            {activeTab === "catalog" && <CatalogTab categories={categories} fetchData={fetchData} />}
            {activeTab === "packages" && <PackagesTab packages={packages} fetchData={fetchData} />}
            {activeTab === "referrals" && <ReferralsTab referrals={referrals} pastRecords={pastRecords} fetchData={fetchData} />}
            {activeTab === "coupons" && <CouponsTab coupons={coupons} fetchData={fetchData} />}
            {activeTab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} />}
            {activeTab === "records" && <RecordsTab pastRecords={pastRecords} />}
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;
