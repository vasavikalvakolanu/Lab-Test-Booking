import React from "react";
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
  return (
    <div className="bg-white rounded border shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b"><tr><th className="p-4">Date</th><th className="p-4">Patient Name</th><th className="p-4">Tests Conducted</th><th className="p-4">Amount Paid</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {pastRecords.map(b => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td className="p-4">{b.date}</td><td className="p-4 font-medium">{b.name}</td>
              <td className="p-4 text-slate-600 max-w-md truncate">{(b.cartItems || b.tests || []).map(i => i.name).join(", ")}</td><td className="p-4 font-bold">₹{b.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 
