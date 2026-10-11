import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, doc, arrayUnion } from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ==========================================
// PDF GENERATION ENGINE (Feature 4 & 10)
// ==========================================
const LOGO_BASE64 = ""; // Paste your Base64 image string here later for your logo

const generatePDF = (patient, tests, results, useLetterhead, isPreview) => {
  const docPdf = new jsPDF();

  if (useLetterhead) {
    if (LOGO_BASE64 && LOGO_BASE64.length > 100) docPdf.addImage(LOGO_BASE64, "PNG", 14, 10, 25, 25);
    docPdf.setFontSize(22);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text("SRI BALAJI DIAGNOSTICS", 105, 20, { align: "center" });
    docPdf.setFontSize(10);
    docPdf.setTextColor(100, 116, 139);
    docPdf.text("123 Health Avenue, Medical District | Ph: +91 98765 43210", 105, 28, { align: "center" });
    docPdf.setDrawColor(200, 200, 200);
    docPdf.line(14, 38, 196, 38);
  }

  const startY = useLetterhead ? 45 : 20; 
  docPdf.setFontSize(10);
  docPdf.setTextColor(0, 0, 0);
  
  docPdf.text(`Patient Name: ${patient.name}`, 14, startY);
  docPdf.text(`Age / Gender: ${patient.age || 'N/A'} Yrs / ${patient.gender || 'N/A'}`, 14, startY + 7);
  docPdf.text(`Contact: ${patient.phone || 'Walk-in'}`, 14, startY + 14);

  docPdf.text(`Clinical ID: ${patient.clinicalId || 'N/A'}`, 130, startY);
  docPdf.text(`Date: ${patient.date}`, 130, startY + 7);
  docPdf.text(`Ref Doctor: ${patient.doctorName || 'Self Walk-in'}`, 130, startY + 14);

  const tableData = tests.map(t => {
    const res = results[t.id] || { value: "-", flag: "Normal" };
    return [t.name, res.value, res.flag === "Normal" ? "" : res.flag, t.refRange, t.unit];
  });

  docPdf.autoTable({
    startY: startY + 22,
    head: [["Test Description", "Result Value", "Flag", "Reference Range", "Unit"]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    didParseCell: function(data) {
      if (data.section === 'body' && (data.column.index === 1 || data.column.index === 2)) {
        const flag = tableData[data.row.index][2];
        if (flag === "High" || flag === "Low" || flag === "Critical") {
          data.cell.styles.textColor = [220, 38, 38]; 
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  const finalY = docPdf.lastAutoTable.finalY + 30;
  docPdf.text("_________________________", 140, finalY);
  docPdf.text("Chief Pathologist", 148, finalY + 6);
  docPdf.setFontSize(8);
  docPdf.text("Electronically Verified Report", 146, finalY + 11);

  if (isPreview) return docPdf.output('datauristring');
  docPdf.save(`${patient.clinicalId || 'Report'}_${patient.name}.pdf`);
};

// ==========================================
// MAIN STAFF PORTAL UI
// ==========================================
function Staff() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [activeView, setActiveView] = useState("registration");
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [referrals, setReferrals] = useState([]);

  // Walk-in Registration State
  const [patient, setPatient] = useState({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
  const [selectedTests, setSelectedTests] = useState([]);
  const [payment, setPayment] = useState({ cash: 0, upi: 0 });

  // Processing State
  const [processingBooking, setProcessingBooking] = useState(null);
  const [results, setResults] = useState({});
  const [previewPdf, setPreviewPdf] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchData();
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { alert("Authentication failed. Please check credentials."); }
  };

  const fetchData = async () => {
    try {
      const [snapBookings, snapCats, snapPkgs, snapRefs] = await Promise.all([
        getDocs(collection(db, "bookings")), 
        getDocs(collection(db, "testCategories")),
        getDocs(collection(db, "packages")), 
        getDocs(collection(db, "referrals"))
      ]);
      setBookings(snapBookings.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setCategories(snapCats.docs.map(d => ({ id: d.id, ...d.data() })));
      setPackages(snapPkgs.docs.map(d => ({ id: d.id, ...d.data() })));
      setReferrals(snapRefs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error("Data fetch error:", error); }
  };

  const liveBookings = bookings.filter(b => b.status !== "done" && b.status !== "completed");
  const availableCatalog = [...categories.flatMap(c => c.tests), ...packages];
  const grandTotal = selectedTests.reduce((sum, t) => sum + (t.discountedPrice || t.price), 0);
  const balanceDue = grandTotal - (Number(payment.cash) + Number(payment.upi));

  // --- Walk-in Feature ---
  const handleWalkInRegistration = async () => {
    if (!patient.name || !patient.age || selectedTests.length === 0) return alert("Name, Age, and Tests are required.");
    
    const clinicalId = `SBD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const flatTests = selectedTests.flatMap(t => t.isPackage ? t.tests : [t]);

    await addDoc(collection(db, "bookings"), {
      ...patient, clinicalId, tests: flatTests, total: grandTotal,
      cashPaid: Number(payment.cash), upiPaid: Number(payment.upi), balanceDue,
      collectionType: "lab", status: "processing", date: new Date().toISOString().slice(0, 10), timeSlot: "Walk-in",
      history: [{ action: "Registered Walk-in", by: user.email, time: new Date().toISOString() }] 
    });

    setPatient({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
    setSelectedTests([]); setPayment({ cash: 0, upi: 0 });
    fetchData(); alert(`Registration Success. Clinical ID: ${clinicalId}`);
  };

  // --- Processing Features ---
  const saveResults = async () => {
    if (!window.confirm("Lock these results and finalize the report?")) return;
    await updateDoc(doc(db, "bookings", processingBooking.id), {
      results, status: "completed",
      history: arrayUnion({ action: "Results Locked & Verified", by: user.email, time: new Date().toISOString() })
    });
    setProcessingBooking(null); fetchData();
  };

  const openPreview = () => {
    const docName = referrals.find(r => r.id === processingBooking.doctorId)?.doctorName || 'Self Walk-in';
    const dataUri = generatePDF({ ...processingBooking, doctorName: docName }, processingBooking.tests, results, true, true);
    setPreviewPdf(dataUri);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded border shadow-sm w-96">
          <h2 className="text-xl font-bold text-emerald-600 mb-6 text-center">Staff Portal Login</h2>
          <div className="space-y-4">
            <input type="email" placeholder="Staff Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded outline-none focus:border-emerald-500" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded outline-none focus:border-emerald-500" required />
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded mt-2">Login to Desk</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div><h1 className="text-xl font-bold">Sri Balaji Diagnostics</h1><p className="text-xs text-slate-500 font-medium">Laboratory Staff Desk</p></div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border">{user.email}</span>
            <button onClick={() => signOut(auth)} className="text-sm font-medium border px-4 py-1.5 rounded hover:bg-slate-50">Logout</button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="bg-white rounded border shadow-sm p-6">
          <div className="flex gap-4 mb-6 border-b pb-4">
            <button onClick={() => setActiveView("registration")} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "registration" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>1. Walk-In Registration</button>
            <button onClick={() => setActiveView("processing")} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "processing" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>2. Enter Results ({liveBookings.filter(b => b.status === "processing").length})</button>
          </div>

          {activeView === "registration" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold mb-4">Patient Demographics</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <input type="text" placeholder="Full Name" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none" />
                  <input type="tel" placeholder="Phone Number" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none" />
                  <div className="flex gap-2 col-span-2"><input type="number" placeholder="Age" value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none" /><select value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none"><option>Male</option><option>Female</option><option>Child</option></select></div>
                  <select value={patient.doctorId} onChange={e => setPatient({...patient, doctorId: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none bg-slate-50"><option value="">No Referral (Self)</option>{referrals.map(r => <option key={r.id} value={r.id}>{r.doctorName}</option>)}</select>
                </div>
                <h3 className="text-sm font-bold mb-2">Test Selection</h3>
                <select onChange={e => { const t = availableCatalog.find(x => x.name === e.target.value); if(t && !selectedTests.includes(t)) setSelectedTests([...selectedTests, t]); }} className="w-full p-2 border rounded text-sm outline-none mb-4 bg-slate-50"><option value="">Search Catalog...</option>{availableCatalog.map((c, i) => <option key={i} value={c.name}>{c.name} - ₹{c.discountedPrice || c.price}</option>)}</select>
                <div className="flex flex-wrap gap-2">{selectedTests.map((t, idx) => <span key={idx} className="bg-slate-100 px-3 py-1 text-xs font-medium rounded border flex items-center">{t.name} <button onClick={() => setSelectedTests(selectedTests.filter((_, i) => i !== idx))} className="ml-2 text-red-500 font-bold">&times;</button></span>)}</div>
              </div>

              <div className="bg-slate-50 p-6 border rounded shadow-inner">
                <h3 className="text-sm font-bold mb-4">Split Payment</h3>
                <div className="space-y-2 mb-6 border-b pb-4">{selectedTests.map((t, idx) => <div key={idx} className="flex justify-between text-sm text-slate-600"><span>{t.name}</span><span>₹{t.discountedPrice || t.price}</span></div>)}</div>
                <div className="flex justify-between font-bold text-xl mb-6"><span>Grand Total:</span><span>₹{grandTotal}</span></div>
                <div className="grid grid-cols-2 gap-4 mb-6"><div><label className="text-xs font-bold text-slate-500">CASH</label><input type="number" value={payment.cash} onChange={e => setPayment({...payment, cash: e.target.value})} className="w-full p-2 border rounded text-lg font-medium outline-none mt-1" /></div><div><label className="text-xs font-bold text-slate-500">UPI</label><input type="number" value={payment.upi} onChange={e => setPayment({...payment, upi: e.target.value})} className="w-full p-2 border rounded text-lg font-medium outline-none mt-1" /></div></div>
                <div className={`p-4 rounded text-sm font-bold flex justify-between mb-6 border ${balanceDue > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}><span>BALANCE DUE:</span><span className="text-lg">₹{balanceDue}</span></div>
                <button onClick={handleWalkInRegistration} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold">Generate Clinical ID</button>
              </div>
            </div>
          )}

          {activeView === "processing" && !processingBooking && (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-left text-sm"><thead className="bg-slate-100 border-b"><tr><th className="p-4 font-bold">Clinical ID</th><th className="p-4 font-bold">Patient</th><th className="p-4 font-bold">Required Tests</th><th className="p-4"></th></tr></thead><tbody className="divide-y">
                {liveBookings.filter(b => b.status === "processing").map(b => (
                  <tr key={b.id} className="hover:bg-slate-50"><td className="p-4 font-mono text-slate-500">{b.clinicalId}</td><td className="p-4 font-semibold">{b.name} <span className="text-xs font-normal text-slate-400 block">{b.age}Y / {b.gender}</span></td><td className="p-4 text-xs text-slate-600 max-w-xs truncate">{b.tests?.map(t=>t.name).join(', ')}</td><td className="p-4 text-right"><button onClick={() => { setProcessingBooking(b); setResults(b.results || {}); }} className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded font-bold">Enter Results</button></td></tr>
                ))}
              </tbody></table>
            </div>
          )}

          {activeView === "processing" && processingBooking && (
            <div>
              <div className="flex justify-between items-end mb-6 bg-slate-50 p-4 border rounded"><div><h2 className="text-2xl font-bold">{processingBooking.name}</h2><div className="flex gap-4 mt-2 text-sm font-medium"><span className="bg-white px-2 py-1 rounded border">ID: {processingBooking.clinicalId}</span><span className="bg-amber-100 text-amber-800 px-2 py-1 rounded border">Ref: {processingBooking.age} Years, {processingBooking.gender}</span></div></div><button onClick={() => setProcessingBooking(null)} className="text-slate-500 font-bold border bg-white px-4 py-2 rounded">Save Draft & Close</button></div>
              <table className="w-full text-left text-sm border rounded overflow-hidden mb-6"><thead className="bg-slate-800 text-white border-b"><tr><th className="p-3">Test Name</th><th className="p-3">Ref Range</th><th className="p-3 w-64">Result Value</th><th className="p-3">Abnormal Flag</th></tr></thead><tbody className="divide-y bg-white">
                {processingBooking.tests?.map((t, idx) => {
                  const currentFlag = results[t.id]?.flag || "Normal";
                  return (
                    <tr key={idx} className={`${currentFlag==="Critical" ? 'bg-red-50' : currentFlag!=="Normal" ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-bold">{t.name}</td><td className="p-4 text-xs font-mono">{t.refRange} <b>{t.unit}</b></td>
                      <td className="p-4"><input type="text" value={results[t.id]?.value || ""} onChange={e => setResults({...results, [t.id]: { ...results[t.id], value: e.target.value, flag: currentFlag }})} className="w-full p-2 border rounded outline-none font-bold" /></td>
                      <td className="p-4 flex gap-1">{["Normal", "Low", "High", "Critical"].map(f => <button key={f} onClick={() => setResults({...results, [t.id]: { ...results[t.id], flag: f }})} className={`px-2 py-1.5 text-xs font-bold rounded border ${currentFlag === f ? (f === "Normal" ? "bg-emerald-500 text-white" : f === "Critical" ? "bg-red-600 text-white" : "bg-amber-500 text-white") : "bg-white text-slate-500"}`}>{f}</button>)}</td>
                    </tr>
                  );
                })}
              </tbody></table>
              <div className="flex gap-4"><button onClick={openPreview} className="flex-1 py-4 bg-white text-slate-800 rounded font-bold border-2 border-slate-300 shadow-sm">👀 Preview PDF Document</button><button onClick={saveResults} className="flex-1 py-4 bg-emerald-600 text-white rounded font-bold border-2 border-emerald-700 shadow-sm">🔒 Sign & Finalize Report</button></div>
            </div>
          )}

          {/* PDF Preview Modal */}
          {previewPdf && (
            <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-100 rounded-lg w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden">
                <div className="p-4 bg-white border-b flex justify-between items-center"><h2 className="font-bold text-lg">Verify Layout & Flags</h2><button onClick={() => setPreviewPdf(null)} className="text-red-500 border border-red-200 bg-red-50 px-4 py-2 rounded font-bold">Return to Edit</button></div>
                <iframe src={previewPdf} className="flex-1 w-full bg-slate-300" title="PDF Preview" />
                <div className="p-4 bg-white border-t flex justify-end gap-4"><button onClick={() => { const docName = referrals.find(r => r.id === processingBooking.doctorId)?.doctorName; generatePDF({ ...processingBooking, doctorName: docName }, processingBooking.tests, results, true, false); }} className="bg-slate-800 text-white font-bold px-6 py-3 rounded">Download Final PDF</button></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Staff;
