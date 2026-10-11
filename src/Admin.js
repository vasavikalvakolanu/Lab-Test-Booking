import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import { BookingsTab, RecordsTab } from "./admin/AdminBookings";
import { CatalogTab, PackagesTab } from "./admin/AdminCatalog";
import { ReferralsTab, CouponsTab, SettingsTab } from "./admin/AdminSettings";
import { StaffDesk } from "./admin/StaffDesk"; // NEW IMPORT

// FEATURE 9: Role-Based Access Control
const ADMIN_EMAILS = ["vasavikalvakolanu@gmail.com"]; // Add your admin emails here

function Admin() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [activeTab, setActiveTab] = useState("desk"); // Default to Staff Desk
  
  // ... Keep all your existing state variables (bookings, categories, etc) and fetchData() exactly the same ...

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setRole(ADMIN_EMAILS.includes(currentUser.email) ? "admin" : "staff");
        fetchData();
      }
    });
    return () => unsubscribe();
  }, []);

  // ... keep handleLogin & filterData exactly the same ...

  // Update the Navigation Bar to hide Admin tabs from Staff
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div><h1 className="text-xl font-semibold">Sri Balaji Diagnostics</h1><p className="text-xs text-slate-500">Logged in as {role.toUpperCase()}</p></div>
          <button onClick={() => signOut(auth)} className="text-sm border px-4 py-1.5 rounded">Logout</button>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex space-x-1 overflow-x-auto">
          {/* Staff Tab (Visible to all) */}
          <button onClick={() => setActiveTab("desk")} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "desk" ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500'}`}>Staff Processing Desk</button>
          
          {/* Admin Tabs (Hidden from standard staff) */}
          {role === "admin" && [
            { id: 'bookings', label: `Web Bookings` }, { id: 'catalog', label: 'Test Catalog' },
            { id: 'packages', label: 'Health Packages' }, { id: 'referrals', label: 'Doctor Referrals' },
            { id: 'coupons', label: 'Promo Coupons' }, { id: 'settings', label: 'Logistics Engine' }, { id: 'records', label: 'Past Records' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500'}`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Dynamic Component Rendering */}
        {activeTab === "desk" && <StaffDesk categories={categories} packages={packages} referrals={referrals} liveBookings={liveBookings} userEmail={user.email} fetchData={fetchData} />}
        
        {/* Only render these if admin */}
        {role === "admin" && (
          <>
            {activeTab === "bookings" && <BookingsTab liveBookings={liveBookings} referrals={referrals} fetchData={fetchData} />}
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
