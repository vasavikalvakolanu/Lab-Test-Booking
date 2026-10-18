import React, { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

const getLocalToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export function AdminDashboard({ bookings, userEmail, fetchData }) {
  const [dashboardDate, setDashboardDate] = useState(getLocalToday());

  const allBookings = bookings || [];

  // Bookings for the selected date (for daily revenue KPIs)
  const dateBookings = allBookings.filter((b) => b.date === dashboardDate);

  const totalBilledToday = dateBookings.reduce(
    (sum, b) => sum + Number(b.total || 0),
    0
  );
  const cashCollectedToday = dateBookings.reduce(
    (sum, b) => sum + Number(b.cashPaid || 0),
    0
  );
  const upiCollectedToday = dateBookings.reduce(
    (sum, b) => sum + Number(b.upiPaid || 0),
    0
  );

  // Pending reports for selected date
  const pendingReports = dateBookings.filter(
    (b) => b.status !== "completed" && b.status !== "done"
  );

  // ALL unresolved payments across all active/completed records on selected date
  const pendingPayments = dateBookings.filter(
    (b) => Number(b.balanceDue || 0) > 0
  );

  const totalPendingDuesToday = pendingPayments.reduce(
    (sum, b) => sum + Number(b.balanceDue || 0),
    0
  );

  const resolveReport = async (booking) => {
    if (!window.confirm(`Mark report for ${booking.name} as Completed?`)) return;

    await updateDoc(doc(db, "bookings", booking.id), {
      status: "completed",
      history: arrayUnion({
        action: "Report marked Completed via Admin Dashboard",
        by: userEmail,
        time: new Date().toISOString()
      })
    });
    fetchData();
  };

  const resolvePayment = async (booking, mode) => {
    const due = Number(booking.balanceDue || 0);
    if (
      !window.confirm(
        `Clear balance of ₹${due} for ${booking.name} via ${mode.toUpperCase()}?`
      )
    ) {
      return;
    }

    const updatedCash =
      mode === "cash"
        ? Number(booking.cashPaid || 0) + due
        : Number(booking.cashPaid || 0);
    const updatedUpi =
      mode === "upi"
        ? Number(booking.upiPaid || 0) + due
        : Number(booking.upiPaid || 0);

    await updateDoc(doc(db, "bookings", booking.id), {
      cashPaid: updatedCash,
      upiPaid: updatedUpi,
      balanceDue: 0,
      history: arrayUnion({
        action: `Balance of ₹${due} settled via ${mode.toUpperCase()} on Admin Dashboard`,
        by: userEmail,
        time: new Date().toISOString()
      })
    });
    fetchData();
  };

  return (
    <div className="space-y-8">
      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Executive Daily Overview
          </h2>
          <p className="text-xs text-slate-500">
            Track collections, cash drawer, pending lab reports, and unpaid
            balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Selected Date:
          </span>
          <input
            type="date"
            value={dashboardDate}
            onChange={(e) => setDashboardDate(e.target.value)}
            className="p-2 border rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-slate-800"
          />
          <button
            onClick={() => setDashboardDate(getLocalToday())}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-lg transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* 4 Financial & Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">
            Total Billed ({dateBookings.length} Patients)
          </span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">
            ₹{totalBilledToday}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase">
            Cash in Drawer
          </span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            ₹{cashCollectedToday}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
          <span className="text-xs font-bold text-blue-600 uppercase">
            UPI / Card Collected
          </span>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">
            ₹{upiCollectedToday}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm">
          <span className="text-xs font-bold text-red-600 uppercase">
            Unpaid Balance Due
          </span>
          <p className="text-2xl font-extrabold text-red-600 mt-1">
            ₹{totalPendingDuesToday}
          </p>
        </div>
      </div>

      {/* Pending Reports Section */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-200 flex justify-between items-center">
          <h2 className="text-base font-bold text-red-800">
            ⚠️ Pending Reports ({dashboardDate})
          </h2>
          <span className="bg-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
            {pendingReports.length} Pending
          </span>
        </div>

        <div className="p-4">
          {pendingReports.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">
              All reports for {dashboardDate} are completed!
            </p>
          ) : (
            <div className="space-y-3">
              {pendingReports.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap justify-between items-center gap-4 p-4 border rounded-lg bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{b.name}</h3>
                      <span className="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 border rounded">
                        {b.clinicalId || b.bookingRef || "Unassigned ID"}
                      </span>
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {b.status === "processing"
                          ? "In Lab Desk"
                          : "Web Collection Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Tests:{" "}
                      {(b.cartItems || b.tests || [])
                        .map((t) => t.name)
                        .join(", ")}
                    </p>
                  </div>
                  <button
                    onClick={() => resolveReport(b)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition"
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
          <h2 className="text-base font-bold text-amber-900">
            💰 Pending Payments ({dashboardDate})
          </h2>
          <span className="bg-amber-200 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
            {pendingPayments.length} Unsettled
          </span>
        </div>

        <div className="p-4">
          {pendingPayments.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">
              All payments for {dashboardDate} are settled.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap justify-between items-center gap-4 p-4 border rounded-lg bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{b.name}</h3>
                      <span className="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 border rounded">
                        {b.clinicalId || b.bookingRef || "No ID"}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({b.phone || "Walk-in"})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Total: <b>₹{b.total}</b> | Paid: ₹
                      {Number(b.cashPaid || 0) + Number(b.upiPaid || 0)} |{" "}
                      <span className="text-red-600 font-bold">
                        Balance Due: ₹{b.balanceDue}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolvePayment(b, "cash")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition"
                    >
                      Settle via Cash
                    </button>
                    <button
                      onClick={() => resolvePayment(b, "upi")}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition"
                    >
                      Settle via UPI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
