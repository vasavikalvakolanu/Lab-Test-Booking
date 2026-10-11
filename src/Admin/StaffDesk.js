import React, { useState } from "react";
import { collection, addDoc, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { generatePDF } from "./pdfGenerator";

export function StaffDesk({ categories, packages, referrals, liveBookings, userEmail, fetchData }) {
  const [activeView, setActiveView] = useState("registration");
  
  // Walk-in Registration State
  const [patient, setPatient] = useState({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
  const [selectedTests, setSelectedTests] = useState([]);
  const [payment, setPayment] = useState({ cash: 0, upi: 0 });
  
  // Result Entry State
  const [processingBooking, setProcessingBooking] = useState(null);
  const [results, setResults] = useState({});
  const [previewPdf, setPreviewPdf] = useState(null);

  const availableCatalog = [...categories.flatMap(c => c.tests), ...packages];
  const grandTotal = selectedTests.reduce((sum, t) => sum + (t.discountedPrice || t.price), 0);
  const balanceDue = grandTotal - (Number(payment.cash) + Number(payment.upi));

  // Feature 6: Walk-in Quick Registration & Feature 5: Split Payments
  const handleWalkInRegistration = async () => {
    if (!patient.name || selectedTests.length === 0) return alert("Name and Tests required.");
    
    // Feature 3: Clinical ID Generation
    const clinicalId = `SBD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const flatTests = selectedTests.flatMap(t => t.isPackage ? t.tests : [t]);

    await addDoc(collection(db, "bookings"), {
      ...patient,
      clinicalId,
      tests: flatTests,
      total: grandTotal,
      cashPaid: Number(payment.cash),
      upiPaid: Number(payment.upi),
      balanceDue,
      collectionType: "lab",
      status: "processing",
      date: new Date().toISOString().slice(0, 10),
      timeSlot: "Walk-in",
      history: [{ action: "Registered", by: userEmail, time: new Date().toISOString() }] // Feature 8: Audit Trail
    });

    setPatient({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
    setSelectedTests([]); setPayment({ cash: 0, upi: 0 });
    fetchData(); alert(`Registration Success. Clinical ID: ${clinicalId}`);
  };

  // Feature 2: Result Entry & Abnormal Flags
  const saveResults = async () => {
    await updateDoc(doc(db, "bookings", processingBooking.id), {
      results,
      status: "completed",
      history: arrayUnion({ action: "Results Entered", by: userEmail, time: new Date().toISOString() })
    });
    setProcessingBooking(null); fetchData();
  };

  const openPreview = () => {
    const docName = referrals.find(r => r.id === processingBooking.doctorId)?.doctorName || 'Self';
    const dataUri = generatePDF({ ...processingBooking, doctorName: docName }, processingBooking.tests, results, true, true);
    setPreviewPdf(dataUri);
  };

  return (
    <div className="bg-white rounded border shadow-sm p-6">
      <div className="flex gap-4 mb-6 border-b pb-4">
        <button onClick={() => setActiveView("registration")} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "registration" ? "bg-slate-800 text-white" : "bg-slate-100"}`}>Walk-in Registration</button>
        <button onClick={() => setActiveView("processing")} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "processing" ? "bg-slate-800 text-white" : "bg-slate-100"}`}>Lab Desk (Enter Results)</button>
      </div>

      {activeView === "registration" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold mb-4">1. Patient Details</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input type="text" placeholder="Full Name" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none" />
              <input type="tel" placeholder="Phone Number" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} className="p-2 border rounded text-sm outline-none" />
              <div className="flex gap-2">
                <input type="number" placeholder="Age" value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none" />
                <select value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none"><option>Male</option><option>Female</option><option>Child</option></select>
              </div>
              <select value={patient.doctorId} onChange={e => setPatient({...patient, doctorId: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none">
                <option value="">No Referral (Self)</option>{referrals.map(r => <option key={r.id} value={r.id}>{r.doctorName}</option>)}
              </select>
            </div>
            <h3 className="text-sm font-bold mb-2">2. Select Tests</h3>
            <select onChange={e => { const t = availableCatalog.find(x => x.name === e.target.value); if(t && !selectedTests.includes(t)) setSelectedTests([...selectedTests, t]); }} className="w-full p-2 border rounded text-sm outline-none mb-4">
              <option value="">Search & Select Test/Package...</option>{availableCatalog.map((c, i) => <option key={i} value={c.name}>{c.name} - ₹{c.discountedPrice || c.price}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              {selectedTests.map((t, idx) => <span key={idx} className="bg-slate-100 px-3 py-1 text-xs rounded border flex items-center">{t.name} <button onClick={() => setSelectedTests(selectedTests.filter((_, i) => i !== idx))} className="ml-2 text-red-500 font-bold">&times;</button></span>)}
            </div>
          </div>

          <div className="bg-slate-50 p-5 border rounded">
            <h3 className="text-sm font-bold mb-4">3. Billing & Split Payment</h3>
            <div className="space-y-2 mb-6 border-b pb-4">
              {selectedTests.map((t, idx) => <div key={idx} className="flex justify-between text-sm text-slate-600"><span>{t.name}</span><span>₹{t.discountedPrice || t.price}</span></div>)}
            </div>
            <div className="flex justify-between font-bold text-lg mb-4"><span>Grand Total:</span><span>₹{grandTotal}</span></div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="text-xs font-medium text-slate-500">Cash Received</label><input type="number" value={payment.cash} onChange={e => setPayment({...payment, cash: e.target.value})} className="w-full p-2 border rounded text-sm outline-none mt-1" /></div>
              <div><label className="text-xs font-medium text-slate-500">UPI Received</label><input type="number" value={payment.upi} onChange={e => setPayment({...payment, upi: e.target.value})} className="w-full p-2 border rounded text-sm outline-none mt-1" /></div>
            </div>
            
            <div className={`p-3 rounded text-sm font-bold flex justify-between mb-6 ${balanceDue > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
              <span>Balance Due:</span><span>₹{balanceDue}</span>
            </div>
            <button onClick={handleWalkInRegistration} className="w-full py-3 bg-slate-800 text-white rounded font-medium">Generate Clinical ID & Bill</button>
          </div>
        </div>
      )}

      {activeView === "processing" && !processingBooking && (
        <table className="w-full text-left text-sm border">
          <thead className="bg-slate-50 border-b"><tr><th className="p-3">Clinical ID</th><th className="p-3">Patient</th><th className="p-3">Tests</th><th className="p-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y">
            {liveBookings.filter(b => b.status === "processing").map(b => (
              <tr key={b.id} className="hover:bg-slate-50"><td className="p-3 font-medium text-slate-500">{b.clinicalId || 'N/A'}</td><td className="p-3">{b.name}</td><td className="p-3 text-xs text-slate-500 truncate max-w-[200px]">{b.tests?.map(t=>t.name).join(', ')}</td><td className="p-3 text-right"><button onClick={() => { setProcessingBooking(b); setResults(b.results || {}); }} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded font-bold">Enter Results</button></td></tr>
            ))}
          </tbody>
        </table>
      )}

      {activeView === "processing" && processingBooking && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div><h2 className="text-lg font-bold">{processingBooking.name}</h2><p className="text-sm text-slate-500">{processingBooking.clinicalId} • {processingBooking.age}Y/{processingBooking.gender}</p></div>
            <button onClick={() => setProcessingBooking(null)} className="text-slate-400">&times; Cancel</button>
          </div>
          <table className="w-full text-left text-sm border mb-6">
            <thead className="bg-slate-50 border-b"><tr><th className="p-3">Test</th><th className="p-3">Ref Range</th><th className="p-3 w-48">Result Value</th><th className="p-3">Panic Flag</th></tr></thead>
            <tbody className="divide-y">
              {processingBooking.tests?.map((t, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-medium">{t.name}</td><td className="p-3 text-xs text-slate-500">{t.refRange} {t.unit}</td>
                  <td className="p-3"><input type="text" value={results[t.id]?.value || ""} onChange={e => setResults({...results, [t.id]: { ...results[t.id], value: e.target.value, flag: results[t.id]?.flag || "Normal" }})} className="w-full p-2 border rounded outline-none" /></td>
                  <td className="p-3 flex gap-1">
                    {["Normal", "High", "Low", "Critical"].map(f => (
                      <button key={f} onClick={() => setResults({...results, [t.id]: { ...results[t.id], flag: f }})} className={`px-2 py-1 text-xs rounded border ${results[t.id]?.flag === f ? (f === "Normal" ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-slate-50"}`}>{f}</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4">
            <button onClick={openPreview} className="flex-1 py-3 bg-slate-100 text-slate-800 rounded font-medium border">Preview Report</button>
            <button onClick={saveResults} className="flex-1 py-3 bg-slate-800 text-white rounded font-medium">Verify & Save Final Report</button>
          </div>
        </div>
      )}

      {/* Feature 10: PDF Preview Modal */}
      {previewPdf && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="font-bold">Verify PDF Layout</h2><button onClick={() => setPreviewPdf(null)} className="text-red-500 font-bold">Return to Edit</button></div>
            <iframe src={previewPdf} className="flex-1 w-full" title="PDF Preview" />
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-4">
              <button onClick={() => { const docName = referrals.find(r => r.id === processingBooking.doctorId)?.doctorName; generatePDF({ ...processingBooking, doctorName: docName }, processingBooking.tests, results, true, false); }} className="bg-slate-800 text-white px-6 py-2 rounded">Download Letterhead PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
