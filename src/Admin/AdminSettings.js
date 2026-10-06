import React, { useState } from "react";
import { collection, addDoc, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export function ReferralsTab({ referrals, pastRecords, fetchData }) {
  const [referralData, setReferralData] = useState({ doctorName: "", hospital: "", contact: "", commissionPercentage: "" });
  const [ledgerDoctor, setLedgerDoctor] = useState(null);

  const addReferral = async () => {
    if (!referralData.doctorName || !referralData.commissionPercentage) return;
    await addDoc(collection(db, "referrals"), { ...referralData, commissionPercentage: Number(referralData.commissionPercentage), createdAt: serverTimestamp() });
    setReferralData({ doctorName: "", hospital: "", contact: "", commissionPercentage: "" }); fetchData();
  };

  const exportCSV = (docRef) => {
    const rows = pastRecords.filter(b => b.referralDoctorId === docRef.id).map(b => [b.date || "N/A", b.name, `"${(b.cartItems || b.tests || []).map(t => t.name).join("; ")}"`, b.total, ((b.total * docRef.commissionPercentage) / 100).toFixed(2)]);
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + [["Date", "Patient Name", "Tests Conducted", "Total Bill", "Commission"].join(","), ...rows.map(e => e.join(","))].join("\n"));
    link.download = `${docRef.doctorName}_Ledger.csv`; link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-5 rounded border shadow-sm self-start">
        <h3 className="text-sm font-semibold mb-4">Add Doctor</h3>
        <div className="space-y-3">
          <input type="text" placeholder="Doctor Name" value={referralData.doctorName} onChange={e => setReferralData({...referralData, doctorName: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
          <input type="text" placeholder="Hospital/Clinic" value={referralData.hospital} onChange={e => setReferralData({...referralData, hospital: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
          <input type="tel" placeholder="Contact Number" value={referralData.contact} onChange={e => setReferralData({...referralData, contact: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
          <input type="number" placeholder="Commission (%)" value={referralData.commissionPercentage} onChange={e => setReferralData({...referralData, commissionPercentage: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
          <button onClick={addReferral} className="w-full bg-slate-800 text-white py-2 rounded text-sm">Save Profile</button>
        </div>
      </div>
      <div className="lg:col-span-2">
        <table className="w-full text-left text-sm bg-white border rounded shadow-sm">
          <thead className="bg-slate-50 border-b"><tr><th className="p-4">Doctor</th><th className="p-4">Hospital</th><th className="p-4">Cut (%)</th><th className="p-4 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-4 font-semibold">{r.doctorName}</td><td className="p-4">{r.hospital}</td><td className="p-4 font-bold text-emerald-600">{r.commissionPercentage}%</td>
                <td className="p-4 text-right whitespace-nowrap"><button onClick={() => setLedgerDoctor(r)} className="text-blue-600 text-xs font-bold mr-3 bg-blue-50 px-2 py-1 rounded">View Ledger</button><button onClick={async () => { await deleteDoc(doc(db, "referrals", r.id)); fetchData(); }} className="text-red-500 text-xs hover:underline">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ledgerDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <div><h2 className="text-lg font-bold">{ledgerDoctor.doctorName}'s Ledger</h2><p className="text-xs text-slate-500 mt-1">Rate: <span className="font-bold text-emerald-600">{ledgerDoctor.commissionPercentage}%</span></p></div>
              <button onClick={() => setLedgerDoctor(null)} className="text-slate-400 hover:text-red-500 text-2xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <table className="w-full text-left text-sm border"><thead className="bg-slate-50 border-b"><tr><th className="p-3">Date</th><th className="p-3">Patient</th><th className="p-3">Total Bill</th><th className="p-3 text-emerald-600">Commission</th></tr></thead><tbody className="divide-y">
                {pastRecords.filter(b => b.referralDoctorId === ledgerDoctor.id).map(b => (
                  <tr key={b.id} className="hover:bg-slate-50"><td className="p-3 text-slate-500">{b.date}</td><td className="p-3 font-semibold">{b.name}</td><td className="p-3">₹{b.total}</td><td className="p-3 font-bold text-emerald-600">₹{((b.total * ledgerDoctor.commissionPercentage) / 100).toFixed(2)}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="p-5 border-t bg-slate-50 flex justify-end"><button onClick={() => exportCSV(ledgerDoctor)} className="bg-emerald-600 text-white font-medium px-6 py-2 rounded text-sm">Download Excel / CSV</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CouponsTab({ coupons, fetchData }) {
  const [data, setData] = useState({ code: "", discount: "" });
  const add = async () => { if(!data.code) return; await addDoc(collection(db, "coupons"), { code: data.code.toUpperCase().trim(), discount: Number(data.discount) }); setData({ code: "", discount: "" }); fetchData(); };
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded border shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1"><label className="block text-xs font-medium text-slate-600 mb-1">Coupon Code</label><input type="text" value={data.code} onChange={e=>setData({...data, code:e.target.value})} className="w-full p-2 border rounded uppercase text-sm outline-none" /></div>
        <div className="w-48"><label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label><input type="number" value={data.discount} onChange={e=>setData({...data, discount:e.target.value})} className="w-full p-2 border rounded text-sm outline-none" /></div>
        <button onClick={add} className="bg-slate-800 text-white py-2 px-6 rounded text-sm">Create Promo</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {coupons.map(c => (
          <div key={c.id} className="bg-white border p-5 rounded shadow-sm text-center relative border-t-4 border-t-emerald-500"><button onClick={async () => { await deleteDoc(doc(db, "coupons", c.id)); fetchData(); }} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-lg">&times;</button><h3 className="text-xl font-bold tracking-wider mt-2">{c.code}</h3><div className="mt-2 text-emerald-600 font-semibold text-sm bg-emerald-50 py-1 rounded inline-block px-3">{c.discount}% OFF</div></div>
        ))}
      </div>
    </div>
  );
}

export function SettingsTab({ settings, setSettings }) {
  const save = async () => { await setDoc(doc(db, "settings", "general"), settings); alert("Configuration Saved"); };
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded border shadow-sm flex justify-between items-center">
        <div><h3 className="text-base font-semibold">Enable Paid Home Delivery</h3></div>
        <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={settings.deliveryEnabled} onChange={e => setSettings({...settings, deliveryEnabled: e.target.checked})} /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div></label>
      </div>
      <div className="bg-white p-6 rounded border shadow-sm">
        <div className="flex justify-between mb-4"><h3 className="text-sm font-semibold">Centers</h3><button onClick={() => setSettings({...settings, centers: [...settings.centers, { id: Date.now(), name: "", lat: 0, lng: 0 }]})} className="text-xs border px-3 py-1.5 rounded">+ Add Center</button></div>
        {settings.centers.map((c, idx) => (
          <div key={c.id} className="flex gap-3 mb-3 items-end bg-slate-50 p-3 border rounded"><div className="flex-1"><label className="block text-xs mb-1">Name</label><input type="text" value={c.name} onChange={e => { const n = [...settings.centers]; n[idx].name = e.target.value; setSettings({...settings, centers: n}); }} className="w-full p-2 border rounded text-sm" /></div><div className="w-1/4"><label className="block text-xs mb-1">Lat</label><input type="number" value={c.lat} onChange={e => { const n = [...settings.centers]; n[idx].lat = Number(e.target.value); setSettings({...settings, centers: n}); }} className="w-full p-2 border rounded text-sm" /></div><div className="w-1/4"><label className="block text-xs mb-1">Lng</label><input type="number" value={c.lng} onChange={e => { const n = [...settings.centers]; n[idx].lng = Number(e.target.value); setSettings({...settings, centers: n}); }} className="w-full p-2 border rounded text-sm" /></div><button onClick={() => setSettings({...settings, centers: settings.centers.filter((_, i) => i !== idx)})} className="text-red-500 p-2 text-sm">Remove</button></div>
        ))}
      </div>
      <div className="bg-white p-6 rounded border shadow-sm">
        <div className="flex justify-between mb-4"><h3 className="text-sm font-semibold">Pricing Tiers</h3><button onClick={() => setSettings({...settings, tiers: [...settings.tiers, { id: Date.now(), upTo: 0, fee: 0 }]})} className="text-xs border px-3 py-1.5 rounded">+ Add Tier</button></div>
        <div className="mb-6 flex justify-between border-b pb-4"><div><span className="text-sm font-semibold block">Max Range</span></div><div className="flex items-center"><input type="number" value={settings.maxDistance} onChange={e => setSettings({...settings, maxDistance: Number(e.target.value)})} className="w-16 p-2 border rounded text-sm text-right" /><span className="ml-2 text-sm">km</span></div></div>
        <div className="space-y-3">
          {settings.tiers.sort((a,b) => a.upTo - b.upTo).map((t, idx) => (
            <div key={t.id} className="flex justify-between bg-slate-50 p-3 border rounded text-sm"><div className="flex items-center"><span className="text-slate-600 mr-2 w-24">Up to</span><input type="number" value={t.upTo} onChange={e => { const n = [...settings.tiers]; n[idx].upTo = Number(e.target.value); setSettings({...settings, tiers: n}); }} className="w-16 p-1.5 border rounded text-center" /><span className="ml-2 text-slate-500">km</span></div><div className="flex items-center"><span className="text-slate-600 mr-2">Fee ₹</span><input type="number" value={t.fee} onChange={e => { const n = [...settings.tiers]; n[idx].fee = Number(e.target.value); setSettings({...settings, tiers: n}); }} className="w-16 p-1.5 border rounded text-center" /></div><button onClick={() => setSettings({...settings, tiers: settings.tiers.filter((_, i) => i !== idx)})} className="text-red-500 text-xs">Remove</button></div>
          ))}
        </div>
      </div>
      <button onClick={save} className="w-full bg-slate-800 text-white font-medium py-3 rounded">Save Logistics</button>
    </div>
  );
} 
