import React, { useState } from "react";
import { collection, addDoc, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { generatePDF } from "./pdfGenerator";

export function StaffDesk({ categories, packages, referrals, liveBookings, userEmail, fetchData }) {
  const [activeView, setActiveView] = useState("registration");
  
  // Feature 6 & 5: Walk-in Registration & Split Payments
  const [patient, setPatient] = useState({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
  const [selectedTests, setSelectedTests] = useState([]);
  const [payment, setPayment] = useState({ cash: 0, upi: 0 });
  
  // Feature 2 & 10: Result Entry & Preview
  const [processingBooking, setProcessingBooking] = useState(null);
  const [results, setResults] = useState({});
  const [previewPdf, setPreviewPdf] = useState(null);

  const availableCatalog = [...categories.flatMap(c => c.tests), ...packages];
  const grandTotal = selectedTests.reduce((sum, t) => sum + (t.discountedPrice || t.price), 0);
  const balanceDue = grandTotal - (Number(payment.cash) + Number(payment.upi));

  const handleWalkInRegistration = async () => {
    if (!patient.name || !patient.age || selectedTests.length === 0) return alert("Name, Age, and Tests are required.");
    
    // Feature 3: Clinical ID Generation
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const clinicalId = `SBD-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
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
      status: "processing", // Sample Lifecycle Start
      date: new Date().toISOString().slice(0, 10),
      timeSlot: "Walk-in",
      // Feature 8: Clinical Audit Trail
      history: [{ action: "Registered Walk-in", by: userEmail, time: new Date().toISOString() }] 
    });

    setPatient({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
    setSelectedTests([]); setPayment({ cash: 0, upi: 0 });
    fetchData(); 
    alert(`Registration Success. Clinical ID: ${clinicalId}`);
  };

  const saveResults = async () => {
    if (!window.confirm("Lock these results and generate final report?")) return;
    await updateDoc(doc(db, "bookings", processingBooking.id), {
      results,
      status: "completed", // Sample Lifecycle End
      history: arrayUnion({ action: "Results Locked & Verified", by: userEmail, time: new Date().toISOString() })
    });
    setProcessingBooking(null); 
    fetchData();
  };

  // Feature 10: Generate PDF string for iframe rendering without downloading
  const openPreview = () => {
    const docName = referrals.find(r => r.id === processingBooking.doctorId)?.doctorName || 'Self Walk-in';
    const dataUri = generatePDF({ ...processingBooking, doctorName: docName }, processingBooking.tests, results, true, true);
    setPreviewPdf(dataUri);
  };

  return (
    <div className="bg-white rounded border shadow-sm p-6">
      
      {/* Staff Navigation */}
      <div className="flex gap-4 mb-6 border-b pb-4">
        <button onClick={() => setActiveView("registration")} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "registration" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          1. Front Desk Registration
        </button>
        <button onClick={() => setActiveView("processing")} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "processing" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          2. Lab Result Entry ({liveBookings.filter(b => b.status === "processing").length})
        </button>
      </div>

      {/* VIEW 1: FRONT DESK REGISTRATION */}
      {activeView === "registration" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Patient Demographics</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <input type="text" placeholder="Full Name" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500" />
              <input type="tel" placeholder="Phone Number" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500" />
              <div className="flex gap-2 col-span-2">
                <input type="number" placeholder="Age (Yrs)" value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none focus:border-emerald-500" />
                <select value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none focus:border-emerald-500">
                  <option>Male</option><option>Female</option><option>Child</option>
                </select>
              </div>
              <select value={patient.doctorId} onChange={e => setPatient({...patient, doctorId: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none bg-slate-50">
                <option value="">No Referral (Self Walk-in)</option>
                {referrals.map(r => <option key={r.id} value={r.id}>{r.doctorName}</option>)}
              </select>
            </div>
            
            <h3 className="text-sm font-bold text-slate-800 mb-2">Test Selection</h3>
            <select onChange={e => { const t = availableCatalog.find(x => x.name === e.target.value); if(t && !selectedTests.includes(t)) setSelectedTests([...selectedTests, t]); }} className="w-full p-2 border rounded text-sm outline-none mb-4 bg-slate-50">
              <option value="">Search & Select Catalog Item...</option>
              {availableCatalog.map((c, i) => <option key={i} value={c.name}>{c.name} - ₹{c.discountedPrice || c.price}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              {selectedTests.map((t, idx) => (
                <span key={idx} className="bg-slate-100 px-3 py-1 text-xs font-medium rounded border flex items-center">
                  {t.name} <button onClick={() => setSelectedTests(selectedTests.filter((_, i) => i !== idx))} className="ml-2 text-red-500 font-bold hover:text-red-700">&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-6 border rounded shadow-inner">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Financial Counter</h3>
            <div className="space-y-2 mb-6 border-b border-slate-200 pb-4">
              {selectedTests.length === 0 ? <p className="text-xs text-slate-400 italic">No tests selected...</p> : 
               selectedTests.map((t, idx) => <div key={idx} className="flex justify-between text-sm text-slate-600"><span>{t.name}</span><span>₹{t.discountedPrice || t.price}</span></div>)
              }
            </div>
            <div className="flex justify-between font-bold text-xl text-slate-800 mb-6">
              <span>Grand Total:</span><span>₹{grandTotal}</span>
            </div>
            
            {/* Feature 5: Split Payments */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-500">CASH TENDERED</label>
                <input type="number" value={payment.cash} onChange={e => setPayment({...payment, cash: e.target.value})} className="w-full p-2 border rounded text-lg font-medium outline-none mt-1 focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">UPI / CARD</label>
                <input type="number" value={payment.upi} onChange={e => setPayment({...payment, upi: e.target.value})} className="w-full p-2 border rounded text-lg font-medium outline-none mt-1 focus:border-emerald-500" />
              </div>
            </div>
            
            <div className={`p-4 rounded text-sm font-bold flex justify-between mb-6 border ${balanceDue > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              <span>BALANCE DUE:</span><span className="text-lg">₹{balanceDue}</span>
            </div>
            <button onClick={handleWalkInRegistration} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 transition text-white rounded font-bold shadow-sm">
              Generate Clinical ID & Bill Patient
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: LAB RESULT ENTRY */}
      {activeView === "processing" && !processingBooking && (
        <div className="overflow-hidden rounded border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr><th className="p-4 font-bold text-slate-600">Clinical ID</th><th className="p-4 font-bold text-slate-600">Patient</th><th className="p-4 font-bold text-slate-600">Required Tests</th><th className="p-4 text-right"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liveBookings.filter(b => b.status === "processing").length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No samples pending processing.</td></tr>
              ) : (
                liveBookings.filter(b => b.status === "processing").map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-slate-500">{b.clinicalId || 'Pending'}</td>
                    <td className="p-4 font-semibold text-slate-800">{b.name} <span className="text-xs font-normal text-slate-400 block">{b.age}Y / {b.gender}</span></td>
                    <td className="p-4 text-xs text-slate-600 max-w-xs truncate">{b.tests?.map(t=>t.name).join(', ')}</td>
                    <td className="p-4 text-right"><button onClick={() => { setProcessingBooking(b); setResults(b.results || {}); }} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded font-bold transition">Enter Results</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeView === "processing" && processingBooking && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-end mb-6 bg-slate-50 p-4 border rounded">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{processingBooking.name}</h2>
              <div className="flex gap-4 mt-2 text-sm font-medium text-slate-600">
                <span className="bg-white px-2 py-1 rounded border">ID: {processingBooking.clinicalId}</span>
                {/* Feature 1: Explicitly highlighting Age/Gender for Technician Reference */}
                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">Target Demographics: {processingBooking.age} Years, {processingBooking.gender}</span>
              </div>
            </div>
            <button onClick={() => setProcessingBooking(null)} className="text-slate-500 hover:text-red-500 font-bold border bg-white px-4 py-2 rounded shadow-sm">Suspend Entry (Save Draft)</button>
          </div>
          
          <table className="w-full text-left text-sm border rounded overflow-hidden mb-6 shadow-sm">
            <thead className="bg-slate-800 text-white border-b">
              <tr><th className="p-3">Test Name</th><th className="p-3">Reference Range</th><th className="p-3 w-64">Result Value</th><th className="p-3">Abnormal Flagging</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {processingBooking.tests?.map((t, idx) => {
                const currentFlag = results[t.id]?.flag || "Normal";
                // Feature 2: Visual UI Panic Alerts based on selected flag
                const isAbnormal = currentFlag === "High" || currentFlag === "Low";
                const isCritical = currentFlag === "Critical";
                
                return (
                  <tr key={idx} className={`${isCritical ? 'bg-red-50' : isAbnormal ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 font-bold text-slate-800">{t.name}</td>
                    <td className="p-4 text-xs font-mono text-slate-600">{t.refRange} <span className="font-bold">{t.unit}</span></td>
                    <td className="p-4">
                      <input type="text" placeholder="Enter Value" value={results[t.id]?.value || ""} onChange={e => setResults({...results, [t.id]: { ...results[t.id], value: e.target.value, flag: currentFlag }})} className={`w-full p-2 border rounded outline-none font-bold ${isCritical ? 'border-red-400 text-red-700 bg-white' : 'focus:border-emerald-500'}`} />
                    </td>
                    <td className="p-4 flex gap-1">
                      {["Normal", "Low", "High", "Critical"].map(f => (
                        <button key={f} onClick={() => setResults({...results, [t.id]: { ...results[t.id], flag: f }})} 
                          className={`px-2 py-1.5 text-xs font-bold rounded border transition 
                            ${currentFlag === f 
                              ? (f === "Normal" ? "bg-emerald-500 text-white border-emerald-600" 
                               : f === "Critical" ? "bg-red-600 text-white border-red-700 animate-pulse" 
                               : "bg-amber-500 text-white border-amber-600") 
                              : "bg-white text-slate-500 hover:bg-slate-100"}`}>
                          {f}
                        </button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="flex gap-4">
            {/* Feature 10: Preview trigger */}
            <button onClick={openPreview} className="flex-1 py-4 bg-white text-slate-800 rounded font-bold border-2 border-slate-300 hover:border-slate-800 transition shadow-sm">
              👀 Preview PDF Document
            </button>
            <button onClick={saveResults} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold border-2 border-emerald-700 transition shadow-sm">
              🔒 Electronically Sign & Finalize Report
            </button>
          </div>
        </div>
      )}

      {/* Feature 10: Live PDF Preview Modal */}
      {previewPdf && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-100 rounded-lg w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Quality Assurance Preview</h2>
                <p className="text-xs text-slate-500">Check for typos or abnormal flagging before finalizing.</p>
              </div>
              <button onClick={() => setPreviewPdf(null)} className="text-slate-500 hover:text-red-600 hover:bg-red-50 border px-4 py-2 rounded font-bold transition">Return to Edit</button>
            </div>
            
            <iframe src={previewPdf} className="flex-1 w-full bg-slate-300" title="PDF Preview" />
            
            <div className="p-4 bg-white border-t flex justify-end gap-4 shadow-sm z-10">
              <button onClick={() => { 
                const docName = referrals.find(r => r.id === processingBooking.doctorId)?.doctorName; 
                generatePDF({ ...processingBooking, doctorName: docName }, processingBooking.tests, results, true, false); 
              }} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded transition">
                Download Letterhead PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
