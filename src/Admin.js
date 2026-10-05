import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

function Admin() {
  const [activeTab, setActiveTab] = useState("tests");

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* OWNER HEADER */}
      <div className="bg-gray-900 text-white pb-24 pt-8 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">Owner Dashboard</h1>
            <p className="text-gray-400 font-medium text-lg">Sri Balaji Diagnostics Management System</p>
          </div>
          <div className="hidden md:block bg-gray-800 p-4 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">System Status</p>
            <p className="text-green-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Online & Secure
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16">
        
        {/* TAB NAVIGATION */}
        <div className="bg-white rounded-t-2xl shadow-sm border border-gray-200 p-2 flex gap-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab("tests")} 
            className={`flex-1 min-w-[150px] py-4 rounded-xl font-bold text-sm md:text-base transition-all ${
              activeTab === "tests" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            🧪 Catalog Management
          </button>
          <button 
            onClick={() => setActiveTab("reports")} 
            className={`flex-1 min-w-[150px] py-4 rounded-xl font-bold text-sm md:text-base transition-all ${
              activeTab === "reports" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            📂 Completed Reports
          </button>
          <button 
            onClick={() => setActiveTab("commissions")} 
            className={`flex-1 min-w-[150px] py-4 rounded-xl font-bold text-sm md:text-base transition-all ${
              activeTab === "commissions" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            💰 Doctor Ledger
          </button>
        </div>

        {/* TAB CONTENT AREAS */}
        <div className="bg-white rounded-b-2xl shadow-md border-x border-b border-gray-200 p-6 md:p-10 min-h-[600px]">
          {activeTab === "tests" && <CatalogManagementTab />}
          {activeTab === "reports" && <PastReportsTab />}
          {activeTab === "commissions" && <CommissionTab />}
        </div>
        
        <p className="text-center text-xs text-gray-400 font-medium mt-8 pb-8">
            © 2026 Sri Balaji Diagnostics | Owner Admin Portal
        </p>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: CATALOG MANAGEMENT
// ==========================================
const CatalogManagementTab = () => {
  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTest = async () => {
    if(!testName || !price) return alert("Please fill both name and price.");
    setIsSaving(true);
    try {
      await addDoc(collection(db, "tests"), {
        name: testName,
        price: Number(price),
        isAvailable: true
      });
      alert("✅ Test added successfully to the public catalog!");
      setTestName(""); setPrice("");
    } catch(err) {
      console.error(err);
      alert("Error saving test.");
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-gray-800">Add New Lab Test</h2>
        <p className="text-gray-500 font-medium mt-2">Publish a new test directly to the customer booking page.</p>
      </div>

      <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 space-y-5 shadow-inner">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Test Name</label>
          <input 
            type="text" 
            value={testName}
            placeholder="e.g. Complete Blood Count (CBC)" 
            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none shadow-sm" 
            onChange={e => setTestName(e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Price (₹)</label>
          <input 
            type="number" 
            value={price}
            placeholder="e.g. 350" 
            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none shadow-sm" 
            onChange={e => setPrice(e.target.value)} 
          />
        </div>
        
        <button 
          onClick={handleSaveTest} 
          disabled={isSaving}
          className={`w-full mt-4 py-4 rounded-xl font-black text-white text-lg shadow-lg transition-transform ${
            isSaving ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'
          }`}
        >
          {isSaving ? "Saving..." : "Publish Test to Site"}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: PAST REPORTS
// ==========================================
const PastReportsTab = () => {
  const [pastBookings, setPastBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPast = async () => {
      try {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setPastBookings(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(b => b.status === "COMPLETED"));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    fetchPast();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
        <span className="text-blue-600">📂</span> Archive: Completed Reports
      </h2>
      
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Patient Name</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Tests Conducted</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500">Loading records...</td></tr>
              ) : pastBookings.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500 italic">No completed reports found.</td></tr>
              ) : pastBookings.map((b, idx) => (
                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                  <td className="p-4 text-sm font-medium text-gray-600">{b.date}</td>
                  <td className="p-4 text-sm font-black text-gray-900">{b.name}</td>
                  <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={b.cartItems?.map(i => i.name).join(", ")}>
                    {b.cartItems?.map(i => i.name).join(", ")}
                  </td>
                  <td className="p-4 text-sm font-black text-green-600">₹{b.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: DOCTOR COMMISSIONS
// ==========================================
const CommissionTab = () => {
  const [commissions, setCommissions] = useState({});
  const COMMISSION_RATE = 0.15; // 15%

  useEffect(() => {
    const calculateCommissions = async () => {
      const snap = await getDocs(collection(db, "bookings"));
      const data = {};
      
      snap.forEach(doc => {
        const booking = doc.data();
        if (booking.referredBy && booking.referredBy !== "Self") {
          const docName = booking.referredBy;
          if (!data[docName]) data[docName] = { revenue: 0, referrals: 0 };
          data[docName].referrals += 1;
          data[docName].revenue += booking.subtotal || 0;
        }
      });
      setCommissions(data);
    };
    calculateCommissions();
  }, []);

  const totalPayout = Object.values(commissions).reduce((sum, doc) => sum + (doc.revenue * COMMISSION_RATE), 0);

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <span className="text-green-600">💰</span> Monthly Referral Ledger
        </h2>
        <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-xl text-right">
          <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Total Owed</p>
          <p className="text-2xl font-black text-green-700">₹{Math.round(totalPayout)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Referring Doctor</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Total Referrals</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Generated Revenue</th>
                <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Commission (15%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.keys(commissions).length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500 italic">No doctor referrals recorded yet.</td></tr>
              ) : Object.keys(commissions).map(docName => {
                const payout = Math.round(commissions[docName].revenue * COMMISSION_RATE);
                return (
                  <tr key={docName} className="hover:bg-green-50 transition-colors">
                    <td className="p-4 text-sm font-black text-gray-900">{docName}</td>
                    <td className="p-4 text-sm font-medium text-gray-600 text-center">{commissions[docName].referrals}</td>
                    <td className="p-4 text-sm font-medium text-gray-600 text-right">₹{commissions[docName].revenue}</td>
                    <td className="p-4 text-base font-black text-green-600 text-right">₹{payout}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
