import React, { useEffect, useState, useCallback } from "react";
import { db, auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import { SriBalajiLogoSVG } from "./Staff/staffUtils";
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
    homeVisitFee: 100,
    freeDeliveryThreshold: 999,
    maxDistance: 10,
    centers: [],
    tiers: []
  });

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const fetchData = useCallback(async () => {
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
        getDoc(doc(db, "settings", "general")).catch(() => null),
        getDocs(collection(db, "staff_accounts")).catch(() => null)
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

      if (snapStaff) {
        setStaffAccounts(snapStaff.docs.map((d) => ({ id: d.id, ...d.data() })));
      }

      if (snapSettings && snapSettings.exists()) {
        setSettings((prev) => ({ ...prev, ...snapSettings.data() }));
      }
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchData();
    });
    return () => unsubscribe();
  }, [fetchData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
      alert(
        "Access Denied. Admin privileges required. Please use the Staff Portal."
      );
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      alert("Authentication failed. Please check credentials.");
    }
  };

  const filterData = (data) =>
    data.filter((b) => {
      const q = search.toLowerCase();
      const nameMatch = b.name ? b.name.toLowerCase().includes(q) : false;
      const phoneMatch = b.phone ? b.phone.includes(search) : false;
      const idMatch = b.clinicalId
        ? b.clinicalId.toLowerCase().includes(q)
        : false;
      const dateMatch = !selectedDate || b.date === selectedDate;
      return (!search || nameMatch || phoneMatch || idMatch) && dateMatch;
    });

  const liveBookings = filterData(
    bookings.filter((b) => b.status !== "done" && b.status !== "completed")
  );
  const pastRecords = filterData(
    bookings.filter((b) => b.status === "done" || b.status === "completed")
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-xl border border-slate-200 shadow-md w-full max-w-sm text-center"
        >
          <div className="flex justify-center mb-3">
            <SriBalajiLogoSVG size={76} />
          </div>
          <h1 className="text-xl font-serif font-extrabold text-[#0f2d4a] tracking-wide">
            SRI BALAJI
          </h1>
          <p className="text-[11px] font-extrabold text-[#0d5c85] tracking-[0.16em] uppercase mb-1">
            CLINICAL LABORATORY
          </p>
          <p className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 inline-block px-3 py-0.5 rounded-full mb-6">
            Enterprise Admin Portal
          </p>

          <div className="space-y-4 text-left">
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500 text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border rounded-lg outline-none focus:border-blue-500 text-sm"
              required
            />
            <button
              type="submit"
              className="w-full bg-[#0f2d4a] hover:bg-slate-900 transition text-white font-bold py-2.5 rounded-lg mt-2 shadow-sm"
            >
              Secure Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-4">
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
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <SriBalajiLogoSVG size={52} />
            <div>
              <h1 className="text-xl font-serif font-extrabold text-[#0f2d4a] tracking-wide leading-none">
                SRI BALAJI
              </h1>
              <p className="text-[11px] font-extrabold text-[#0d5c85] tracking-[0.15em] uppercase mt-0.5">
                CLINICAL LABORATORY
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Enterprise Admin Portal
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border">
              {user.email}
            </span>
            <button
              onClick={() => signOut(auth)}
              className="text-sm font-medium border border-slate-200 px-4 py-1.5 rounded hover:bg-slate-50 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
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
                  ? "border-[#0f2d4a] text-[#0f2d4a]"
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
          <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded border shadow-sm">
            <input
              type="text"
              placeholder="Search patient name, phone, or Clinical ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[220px] p-2 border rounded text-sm outline-none focus:border-slate-500"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded text-sm outline-none focus:border-slate-500"
            />
            {(search || selectedDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedDate("");
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {activeTab === "dashboard" && (
          <AdminDashboard
            bookings={bookings}
            liveBookings={liveBookings}
            userEmail={user.email}
            fetchData={fetchData}
          />
        )}

        {activeTab === "catalog" && (
          <CatalogTab categories={categories} fetchData={fetchData} />
        )}

        {activeTab === "packages" && (
          <PackagesTab
            packages={packages}
            categories={categories}
            fetchData={fetchData}
          />
        )}

        {activeTab === "referrals" && (
          <ReferralsTab
            referrals={referrals}
            pastRecords={pastRecords}
            bookings={bookings}
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
