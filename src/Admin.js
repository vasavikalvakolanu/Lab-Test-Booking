import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import { AdminDashboard } from "./Admin/AdminDashboard";
import { RecordsTab } from "./Admin/AdminBookings";
import { CatalogTab, PackagesTab } from "./Admin/AdminCatalog";
import { ReferralsTab, CouponsTab, SettingsTab } from "./Admin/AdminSettings";
import { StaffManageTab } from "./Admin/AdminStaff";

const ADMIN_EMAILS = ["vasavikalvakolanu@gmail.com", "satyahanush@gmail.com"];

function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");

  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [settings, setSettings] = useState({
    deliveryEnabled: true,
    maxDistance: 10,
    centers: [],
    tiers: []
  });

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
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      alert("Access Denied. Admin privileges required. Please use the Staff Portal.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Authentication failed. Please check credentials.");
    }
  };

  const fetchData = async () => {
    try {
      const [
        snapBookings,
        snapCats,
        snapPkgs,
        snapCoupons,
        snapRefs,
        snapSettings,
        snapStaff
      ] = await Promise.all([
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "testCategories")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "coupons")),
        getDocs(collection(db, "referrals")),
        getDoc(doc(db, "settings", "general")),
        getDocs(collection(db, "staff_accounts"))
      ]);

      const sortedBookings = snapBookings.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

      setBookings(sortedBookings);
      setCategories(snapCats.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPackages(snapPkgs.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCoupons(snapCoupons.docs.map((d) => ({ id: d.id, ...d.data() })));
      setReferrals(snapRefs.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStaffAccounts(snapStaff.docs.map((d) => ({ id: d.id, ...d.data() })));

      if (snapSettings.exists()) setSettings(snapSettings.data());
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  };

  const filterData = (data) =>
    data.filter((b) => {
      const nameMatch = b.name
        ? b.name.toLowerCase().includes(search.toLowerCase())
        : false;
      const phoneMatch = b.phone ? b.phone.includes(search) : false;
      const dateMatch = !selectedDate || b.date === selectedDate;
      return (nameMatch || phoneMatch) && dateMatch;
    });

  const liveBookings = filterData(
    bookings.filter((b) => b.status !== "done" && b.status !== "completed")
  );
  const pastRecords = filterData(
    bookings.filter((b) => b.status === "done" || b.status === "completed")
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded border shadow-sm w-96"
        >
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            Admin Portal Login
          </h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 transition text-white font-bold py-2 rounded mt-2"
            >
              Secure Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Access Restricted
        </h2>
        <p className="text-slate-600 mb-6">
          Your email ({user.email}) does not have administrative privileges.
        </p>
        <button
          onClick={() => signOut(auth)}
          className="bg-slate-800 text-white px-6 py-2 rounded font-bold"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Sri Balaji Diagnostics</h1>
            <p className="text-xs text-slate-500 font-medium">
              Enterprise Admin Portal
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {user.email}
            </span>
            <button
              onClick={() => signOut(auth)}
              className="text-sm font-medium border border-slate-200 px-4 py-1.5 rounded hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Web Bookings removed) */}
        <div className="max-w-7xl mx-auto px-6 flex space-x-1 overflow-x-auto">
          {[
            { id: "dashboard", label: "📊 Daily Dashboard" },
            { id: "catalog", label: "Test Catalog" },
            { id: "packages", label: "Health Packages" },
            { id: "referrals", label: "Doctor Referrals" },
            { id: "coupons", label: "Promo Coupons" },
            { id: "settings", label: "Logistics" },
            { id: "staff", label: "Staff Accounts" },
            { id: "records", label: "Records" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-slate-800 text-slate-900"
                  : "border-transparent text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {activeTab === "records" && (
          <div className="flex gap-4 mb-6 bg-white p-4 rounded border shadow-sm">
            <input
              type="text"
              placeholder="Search patient name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-2 border rounded text-sm outline-none focus:border-slate-500"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded text-sm outline-none focus:border-slate-500"
            />
          </div>
        )}

        {activeTab === "dashboard" && (
          <AdminDashboard
            liveBookings={liveBookings}
            userEmail={user.email}
            fetchData={fetchData}
          />
        )}
        {activeTab === "catalog" && (
          <CatalogTab categories={categories} fetchData={fetchData} />
        )}
        {activeTab === "packages" && (
          <PackagesTab packages={packages} fetchData={fetchData} />
        )}
        {activeTab === "referrals" && (
          <ReferralsTab
            referrals={referrals}
            pastRecords={pastRecords}
            fetchData={fetchData}
          />
        )}
        {activeTab === "coupons" && (
          <CouponsTab coupons={coupons} fetchData={fetchData} />
        )}
        {activeTab === "settings" && (
          <SettingsTab settings={settings} setSettings={setSettings} />
        )}
        {activeTab === "staff" && (
          <StaffManageTab
            staffAccounts={staffAccounts}
            fetchData={fetchData}
          />
        )}
        {activeTab === "records" && <RecordsTab pastRecords={pastRecords} />}
      </div>
    </div>
  );
}

export default Admin;
