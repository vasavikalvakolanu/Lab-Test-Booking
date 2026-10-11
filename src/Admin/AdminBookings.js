import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export function BookingsTab({ liveBookings, referrals, fetchData }) {
  const markDone = async (id) => { await updateDoc(doc(db, "bookings", id), { status: "done" }); fetchData(); };
  const assignDoctor = async (id, docId) => { await updateDoc(doc(db, "bookings", id), { referralDoctorId: docId }); fetchData(); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {liveBookings.map(b => (
        <div key={b.id} className="bg-white rounded border shadow-sm flex flex-col">
          <div className={`h-1 w-full ${b.collectionType === "home" ? "bg-amber-500" : "bg-slate-700"}`}></div>
          <div className="p-5 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div><h3 className="text-lg font-semibold">{b.name}</h3><p className="text-sm text-slate-500">{b.phone}</p></div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${b.collectionType === "home" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-100"}`}>{b.collectionType === "home" ? "Home Collection" : "Lab Visit"}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded border text-sm">
              <div><span className="block text-xs text-slate-500">Date</span><span className="font-medium">{b.date}</span></div>
              <div><span className="block text-xs text-slate-500">Time</span><span className="font-medium">{b.timeSlot}</span></div>
              {b.collectionType === "home" && <div className="col-span-2"><span className="block text-xs text-slate-500">Address</span><span className="font-medium">{b.address}</span></div>}
            </div>
            <div className="mb-4">
              <span className="block text-xs font-medium text-slate-500 mb-2">Requested Tests</span>
              <div className="flex flex-wrap gap-2">{(b.cartItems || b.tests || []).map((item, idx) => <span key={idx} className="bg-slate-100 text-xs px-2 py-1 rounded border">{item.name}</span>)}</div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Assign Referring Doctor</label>
              <select value={b.referralDoctorId || ""} onChange={(e) => assignDoctor(b.id, e.target.value)} className="w-full border p-2 rounded text-sm bg-slate-50 outline-none">
                <option value="">No Referral (Direct Walk-in)</option>{referrals.map(r => <option key={r.id} value={r.id}>{r.doctorName} ({r.commissionPercentage}% cut)</option>)}
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
            <button onClick={() => markDone(b.id)} className="flex-1 py-3 bg-white text-emerald-600 font-medium text-sm hover:bg-emerald-50">Mark Complete</button><div className="w-px bg-slate-200"></div>
            <a href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your test booking is confirmed for ${b.date}. Total amount: ₹${b.total}.`} target="_blank" rel="noreferrer" className="flex-1 py-3 text-center bg-white text-slate-600 font-medium text-sm hover:bg-slate-50">WhatsApp Notify</a>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecordsTab({ pastRecords }) {
  const [expandedLogId, setExpandedLogId] = useState(null);

  return (
    <div className="bg-white rounded border shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="p-4 text-slate-600 font-bold">Date / ID</th>
            <th className="p-4 text-slate-600 font-bold">Patient Name</th>
            <th className="p-4 text-slate-600 font-bold">Amount Paid</th>
            <th className="p-4 text-slate-600 font-bold text-right">Audit Logs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pastRecords.length === 0 ? (
            <tr><td colSpan="4" className="p-8 text-center text-slate-400">No completed patient records found.</td></tr>
          ) : (
            pastRecords.map(b => (
              <React.Fragment key={b.id}>
                <tr className="hover:bg-slate-50">
                  <td className="p-4"><span className="block font-medium">{b.date}</span><span className="text-xs text-slate-500 font-mono">{b.clinicalId}</span></td>
                  <td className="p-4 font-medium">{b.name}</td>
                  <td className="p-4 font-bold">₹{b.total}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setExpandedLogId(expandedLogId === b.id ? null : b.id)} 
                      className="text-xs font-bold px-3 py-1 rounded border bg-white hover:bg-slate-100"
                    >
                      {expandedLogId === b.id ? "Hide Audit Trail" : "View Audit Trail"}
                    </button>
                  </td>
                </tr>
                
                {/* Expanded Audit Log Row */}
                {expandedLogId === b.id && (
                  <tr className="bg-slate-50">
                    <td colSpan="4" className="p-4 border-l-4 border-l-slate-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* General History Logs (Modifications, Registrations) */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 mb-2">MODIFICATION & ACTION HISTORY</h4>
                          <ul className="space-y-1">
                            {b.history ? b.history.map((h, i) => (
                              <li key={i} className="text-xs text-slate-700">
                                <span className="font-bold text-slate-900">{h.action}</span> by <span className="italic">{h.by}</span> on {new Date(h.time).toLocaleString()}
                              </li>
                            )) : <li className="text-xs text-slate-400">No history recorded.</li>}
                          </ul>
                        </div>

                        {/* Specific PDF Download Logs */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 mb-2">PDF DOWNLOAD TRACKING</h4>
                          <ul className="space-y-1">
                            {b.downloadLogs && b.downloadLogs.length > 0 ? b.downloadLogs.map((log, i) => (
                              <li key={i} className="text-xs text-slate-700">
                                <span className="font-bold text-emerald-700">File Downloaded</span> by <span className="italic">{log.by}</span> on {new Date(log.time).toLocaleString()}
                              </li>
                            )) : <li className="text-xs text-slate-400">File has never been downloaded.</li>}
                          </ul>
                        </div>

                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
