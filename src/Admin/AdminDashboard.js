import React from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

export function AdminDashboard({ liveBookings, userEmail, fetchData }) {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().slice(0, 10);

  // Filter for TODAY'S pending items
  const pendingReports = liveBookings.filter(
    (b) => b.date === today && b.status === "processing"
  );
  
  const pendingPayments = liveBookings.filter(
    (b) => b.date === today && b.balanceDue > 0
  );

  const resolveReport = async (booking) => {
    if (!window.confirm(`Mark report for ${booking.name} as Completed?`)) return;
    
    await updateDoc(doc(db, "bookings", booking.id), {
      status: "completed",
      history: arrayUnion({
        action: "Report forced to Completed via Admin Dashboard",
        by: userEmail,
        time: new Date().toISOString()
      })
    });
    fetchData();
  };

  const resolvePayment = async (booking) => {
    if (!window.confirm(`Clear balance of ₹${booking.balanceDue} for ${booking.name}?`)) return;
    
    const newCash = Number(booking.cashPaid || 0) + Number(booking.balanceDue);
    
    await updateDoc(doc(db, "bookings", booking.id), {
      cashPaid: newCash,
      balanceDue: 0,
      history: arrayUnion({
        action: `Balance of ₹${booking.balanceDue} cleared via Admin Dashboard`,
        by: userEmail,
        time: new Date().toISOString()
      })
    });
    fetchData();
  };

  return (
    <div className="space-y-8">
      {/* Pending Reports Section */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-800">
            ⚠️ Pending Reports Today ({today})
          </h2>
          <span className="bg-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
            {pendingReports.length} Action(s) Needed
          </span>
        </div>
        
        <div className="p-4">
          {pendingReports.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No pending reports for today. Great job!</p>
          ) : (
            <div className="space-y-3">
              {pendingReports.map((b) => (
                <div key={b.id} className="flex justify-between items-center p-4 border rounded bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-800">{b.name} <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 border rounded ml-2">{b.clinicalId || "No ID"}</span></h3>
                    <p className="text-xs text-slate-500 mt-1">Tests: {(b.tests || []).map(t => t.name).join(", ")}</p>
                  </div>
                  <button 
                    onClick={() => resolveReport(b)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition"
                  >
                    Resolve Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Payments Section */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="bg-amber-50 p-4 border-b border-amber-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-amber-800">
            💰 Pending Payments Today ({today})
          </h2>
          <span className="bg-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
            {pendingPayments.length} Action(s) Needed
          </span>
        </div>
        
        <div className="p-4">
          {pendingPayments.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">All payments for today are settled.</p>
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((b) => (
                <div key={b.id} className="flex justify-between items-center p-4 border rounded bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-800">{b.name} <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 border rounded ml-2">{b.clinicalId || "No ID"}</span></h3>
                    <p className="text-sm font-bold text-red-600 mt-1">Balance Due: ₹{b.balanceDue}</p>
                  </div>
                  <button 
                    onClick={() => resolvePayment(b)}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition"
                  >
                    Resolve Balance
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
