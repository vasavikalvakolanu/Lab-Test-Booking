import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, doc, arrayUnion } from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ==========================================
// PDF GENERATION ENGINE
// ==========================================
const LOGO_BASE64 = ""; 

const generatePDF = (patient, tests, results, useLetterhead, isPreview) => {
  const docPdf = new jsPDF();

  if (useLetterhead) {
    if (LOGO_BASE64 && LOGO_BASE64.length > 100) {
      docPdf.addImage(LOGO_BASE64, "PNG", 14, 10, 25, 25);
    }
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

  // Walk-in Registration
  const [patient, setPatient] = useState({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
  const [selectedTests, setSelectedTests] = useState([]);
  const [payment, setPayment] = useState({ cash: 0, upi: 0 });

  // Processing & Editing State
  const [processingBooking, setProcessingBooking] = useState(null);
  const [results, setResults] = useState({});
  const [previewPdf, setPreviewPdf] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editableTests, setEditableTests] = useState([]);
  const [additionalPayment, setAdditionalPayment] = useState({ cash: 0, upi: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchData();
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try { 
      await signInWithEmailAndPassword(auth, email, password); 
    } catch (error) { 
      alert("Authentication failed. Please check credentials."); 
    }
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
    } catch (error) { 
      console.error("Data fetch error:", error); 
    }
  };

  const pendingBookings = bookings.filter(b => b.status === "pending" || !b.status);
  const processingBookings = bookings.filter(b => b.status === "processing");
  const pastRecords = bookings.filter(b => b.status === "completed" || b.status === "done");

  const availableCatalog = [...categories.flatMap(c => c.tests), ...packages];
  const grandTotal = selectedTests.reduce((sum, t) => sum + (t.discountedPrice || t.price), 0);
  const balanceDue = grandTotal - (Number(payment.cash) + Number(payment.upi));

  const handleWalkInRegistration = async () => {
    if (!patient.name || !patient.age || selectedTests.length === 0) return alert("Name, Age, and Tests are required.");
    
    const clinicalId = `SBD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const flatTests = selectedTests.flatMap(t => t.isPackage ? t.tests : [t]);

    await addDoc(collection(db, "bookings"), {
      ...patient, 
      clinicalId, 
      tests: flatTests, 
      subtotal: grandTotal, 
      total: grandTotal,
      cashPaid: Number(payment.cash), 
      upiPaid: Number(payment.upi), 
      balanceDue,
      collectionType: "lab", 
      status: "processing", 
      date: new Date().toISOString().slice(0, 10), 
      timeSlot: "Walk-in",
      history: [{ action: "Registered Walk-in", by: user.email, time: new Date().toISOString() }],
      downloadLogs: [] 
    });

    setPatient({ name: "", phone: "", age: "", gender: "Male", doctorId: "" });
    setSelectedTests([]); 
    setPayment({ cash: 0, upi: 0 });
    fetchData(); 
    alert(`Registration Success. Clinical ID: ${clinicalId}`);
  };

  const markSampleCollected = async (b) => {
    const clinicalId = b.clinicalId || `SBD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    await updateDoc(doc(db, "bookings", b.id), { 
      status: "processing", 
      clinicalId: clinicalId, 
      history: arrayUnion({ action: "Sample Collected", by: user.email, time: new Date().toISOString() }) 
    });
    fetchData();
  };

  const openEditMode = () => { 
    setEditableTests(processingBooking.tests || []); 
    setAdditionalPayment({ cash: 0, upi: 0 }); 
    setEditMode(true); 
  };
  
  const handleUpdateBilling = async () => {
    const newSubtotal = editableTests.reduce((sum, t) => sum + (t.discountedPrice || t.price), 0);
    const newTotal = newSubtotal - (processingBooking.discount || 0) + (processingBooking.deliveryFee || 0);
    const newCash = Number(processingBooking.cashPaid || 0) + Number(additionalPayment.cash);
    const newUpi = Number(processingBooking.upiPaid || 0) + Number(additionalPayment.upi);
    const newBalance = newTotal - (newCash + newUpi);

    const logEntry = { 
      action: `Modified Billing & Tests (Old Total: ₹${processingBooking.total}, New Total: ₹${newTotal})`, 
      by: user.email, 
      time: new Date().toISOString() 
    };

    await updateDoc(doc(db, "bookings", processingBooking.id), {
      tests: editableTests, 
      subtotal: newSubtotal, 
      total: newTotal, 
      cashPaid: newCash, 
      upiPaid: newUpi, 
      balanceDue: newBalance,
      history: arrayUnion(logEntry)
    });
    
    setProcessingBooking({...processingBooking, tests: editableTests, subtotal: newSubtotal, total: newTotal, cashPaid: newCash, upiPaid: newUpi, balanceDue: newBalance});
    setEditMode(false); 
    fetchData();
  };

  const saveResults = async () => {
    if (!window.confirm("Lock these results and finalize the report?")) return;
    await updateDoc(doc(db, "bookings", processingBooking.id), {
      results, 
      status: "completed",
      history: arrayUnion({ action: "Results Locked & Verified", by: user.email, time: new Date().toISOString() })
    });
    setProcessingBooking(null); 
    setActiveView("records"); 
    fetchData();
  };

  const openPreview = () => {
    const docName = referrals.find(r => r.id === processingBooking.doctorId)?.doctorName || 'Self Walk-in';
    const dataUri = generatePDF({ ...processingBooking, doctorName: docName }, processingBooking.tests, results, true, true);
    setPreviewPdf(dataUri);
  };

  const downloadFinalPDF = async (b) => {
    const docName = referrals.find(r => r.id === b.doctorId)?.doctorName || 'Self Walk-in';
    generatePDF({ ...b, doctorName: docName }, b.tests, b.results, true, false); 
    
    const downloadLog = { by: user.email, time: new Date().toISOString() };

    await updateDoc(doc(db, "bookings", b.id), {
      reportGenerated: true,
      reportGeneratedBy: b.reportGeneratedBy || user.email,
      reportGeneratedAt: b.reportGeneratedAt || new Date().toISOString(),
      downloadLogs: arrayUnion(downloadLog),
      history: arrayUnion({ action: "PDF Downloaded", by: user.email, time: new Date().toISOString() })
    });
    fetchData();
  };

  const unlockRecord = async (b) => {
    if(!window.confirm("Unlock this record? This will move it back to the Lab Desk and allow modifications.")) return;
    await updateDoc(doc(db, "bookings", b.id), {
      status: "processing",
      history: arrayUnion({ action: "Record Unlocked for Modification", by: user.email, time: new Date().toISOString() })
    });
    setProcessingBooking(b); 
    setResults(b.results || {}); 
    setActiveView("processing"); 
    fetchData();
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
          
          {/* Navigation */}
          <div className="flex flex-wrap gap-4 mb-6 border-b pb-4">
            <button onClick={() => { setActiveView("registration"); setProcessingBooking(null); }} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "registration" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>1. Front Desk Walk-In</button>
            <button onClick={() => { setActiveView("collections"); setProcessingBooking(null); }} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "collections" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>2. Web Collections {pendingBookings.length > 0 && <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingBookings.length}</span>}</button>
            <button onClick={() => setActiveView("processing")} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "processing" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>3. Lab Result Desk ({processingBookings.length})</button>
            <button onClick={() => { setActiveView("records"); setProcessingBooking(null); }} className={`px-4 py-2 text-sm font-medium rounded ${activeView === "records" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>4. Past Records ({pastRecords.length})</button>
          </div>

          {/* VIEW 1: REGISTRATION */}
          {activeView === "registration" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold mb-4">Patient Demographics</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <input type="text" placeholder="Full Name" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500" />
                  <input type="tel" placeholder="Phone Number" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none focus:border-emerald-500" />
                  <div className="flex gap-2 col-span-2">
                    <input type="number" placeholder="Age" value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none focus:border-emerald-500" />
                    <select value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})} className="w-1/2 p-2 border rounded text-sm outline-none focus:border-emerald-500">
                      <option>Male</option><option>Female</option><option>Child</option>
                    </select>
                  </div>
                  <select value={patient.doctorId} onChange={e => setPatient({...patient, doctorId: e.target.value})} className="col-span-2 p-2 border rounded text-sm outline-none bg-slate-50 focus:border-emerald-500">
                    <option value="">No Referral (Self Walk-in)</option>
                    {referrals.map(r => <option key={r.id} value={r.id}>{r.doctorName}</option>)}
                  </select>
                </div>
                <h3 className="text-sm font-bold mb-2">Test Selection</h3>
                <select onChange={e => { const t = availableCatalog.find(x => x.name === e.target.value); if(t && !selectedTests.includes(t)) setSelectedTests([...selectedTests, t]); }} className="w-full p-2 border rounded text-sm outline-none mb-4 bg-slate-50 focus:border-emerald-500">
                  <option value="">Search & Select Catalog Item...</option>
                  {availableCatalog.map((c, i) => <option key={i} value={c.name}>{c.name} - ₹{c.discountedPrice || c.price}</option>)}
                </select>
                <div className="flex flex-wrap gap-2">
                  {selectedTests.map((t, idx) => (
                    <span key={idx} className="bg-slate-100 px-3 py-1 text-xs font-medium rounded border flex items-center">
                      {t.name} 
                      <button onClick={() => setSelectedTests(selectedTests.filter((_, i) => i !== idx))} className="ml-2 text-red-500 font-bold hover:text-red-700">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 p-6 border rounded shadow-inner">
                <h3 className="text-sm font-bold mb-4">Financial Counter</h3>
                <div className="space-y-2 mb-6 border-b pb-4">
                  {selectedTests.length === 0 ? <p className="text-xs text-slate-400 italic">No tests selected...</p> : selectedTests.map((t, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-slate-600">
                      <span>{t.name}</span>
                      <span>₹{t.discountedPrice || t.price}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-xl mb-6"><span>Grand Total:</span><span>₹{grandTotal}</span></div>
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
                  <span>BALANCE DUE:</span>
                  <span className="text-lg">₹{balanceDue}</span>
                </div>
                <button onClick={handleWalkInRegistration} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 transition text-white rounded font-bold shadow-sm">Generate Clinical ID & Bill Patient</button>
              </div>
            </div>
          )}

          {/* VIEW 2: COLLECTIONS */}
          {activeView === "collections" && (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50 border-b border-amber-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-800">Date/Time</th>
                    <th className="p-4 font-bold text-slate-800">Patient Details</th>
                    <th className="p-4 font-bold text-slate-800">Required Tests</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingBookings.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">No pending web bookings.</td></tr>
                  ) : (
                    pendingBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-600"><span className="block font-bold">{b.date}</span>{b.timeSlot}</td>
                        <td className="p-4 font-semibold text-slate-800">{b.name} <span className="text-xs font-normal text-slate-500 block">{b.phone} | {b.collectionType === 'home' ? 'Home Visit' : 'Lab Visit'}</span></td>
                        <td className="p-4 text-xs text-slate-600 max-w-xs truncate">{(b.cartItems || b.tests)?.map(t=>t.name).join(', ')}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => markSampleCollected(b)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold transition shadow-sm">Verify & Collect Sample</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 3: LAB DESK LIST */}
          {activeView === "processing" && !processingBooking && (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="p-4 font-bold text-slate-600">Clinical ID</th>
                    <th className="p-4 font-bold text-slate-600">Patient</th>
                    <th className="p-4 font-bold text-slate-600">Required Tests</th>
                    <th className="p-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processingBookings.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">No samples pending processing.</td></tr>
                  ) : (
                    processingBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono text-slate-500 font-bold">{b.clinicalId}</td>
                        <td className="p-4 font-semibold text-slate-800">{b.name} <span className="text-xs font-normal text-slate-400 block">{b.age || '?'}Y / {b.gender || '?'}</span></td>
                        <td className="p-4 text-xs text-slate-600 max-w-xs truncate">{b.tests?.map(t=>t.name).join(', ')}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => { setProcessingBooking(b); setResults(b.results || {}); }} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded font-bold transition">Open Record</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 3B: RESULT ENTRY & EDIT BILLING */}
          {activeView === "processing" && processingBooking && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-start mb-6 bg-slate-50 p-4 border rounded shadow-sm">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{processingBooking.name}</h2>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm font-medium text-slate-600">
                    <span className="bg-white px-2 py-1 rounded border">ID: {processingBooking.clinicalId}</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">Demographics: {processingBooking.age || 'N/A'} Years, {processingBooking.gender || 'N/A'}</span>
                    <span className={`px-2 py-1 rounded border ${processingBooking.balanceDue > 0 ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>Balance Due: ₹{processingBooking.balanceDue || 0}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setProcessingBooking(null)} className="text-slate-500 hover:text-red-500 font-bold border bg-white px-4 py-2 rounded shadow-sm text-sm">Save Draft & Close</button>
                  {!editMode && <button onClick={openEditMode} className="text-emerald-700 font-bold border border-emerald-200 bg-emerald-50 px-4 py-2 rounded shadow-sm text-sm">⚙️ Modify Tests & Billing</button>}
                </div>
              </div>

              {editMode && (
                <div className="mb-6 border-2 border-emerald-400 bg-emerald-50 rounded-lg p-5 shadow-inner">
                  <h3 className="font-bold text-emerald-800 mb-4">Modify Patient Tests & Update Billing</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">ADD NEW TESTS</label>
                      <select onChange={e => { const t = availableCatalog.find(x => x.name === e.target.value); if(t) setEditableTests([...editableTests, t.isPackage ? ...t.tests : t]); }} className="w-full p-2 border rounded text-sm outline-none mb-4">
                        <option value="">Search & Add Catalog Item...</option>
                        {availableCatalog.map((c, i) => <option key={i} value={c.name}>{c.name} - ₹{c.discountedPrice || c.price}</option>)}
                      </select>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                        {editableTests.map((t, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded text-sm">
                            <span>{t.name}</span>
                            <button onClick={() => setEditableTests(editableTests.filter((_, i) => i !== idx))} className="text-red-500 font-bold hover:bg-red-50 px-2 rounded">&times; Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded border shadow-sm">
                      <div className="flex justify-between text-sm font-bold text-slate-800 mb-2">
                        <span>New Adjusted Total:</span>
                        <span>₹{editableTests.reduce((sum, t) => sum + (t.discountedPrice || t.price), 0) - (processingBooking.discount || 0) + (processingBooking.deliveryFee || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-emerald-600 mb-4 pb-4 border-b">
                        <span>Already Paid:</span>
                        <span>₹{Number(processingBooking.cashPaid || 0) + Number(processingBooking.upiPaid || 0)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500">NEW CASH TENDERED</label>
                          <input type="number" value={additionalPayment.cash} onChange={e => setAdditionalPayment({...additionalPayment, cash: e.target.value})} className="w-full p-2 border rounded font-medium outline-none mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">NEW UPI / CARD</label>
                          <input type="number" value={additionalPayment.upi} onChange={e => setAdditionalPayment({...additionalPayment, upi: e.target.value})} className="w-full p-2 border rounded font-medium outline-none mt-1" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditMode(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded font-bold border">Cancel</button>
                        <button onClick={handleUpdateBilling} className="flex-1 py-2 bg-emerald-600 text-white rounded font-bold shadow-sm">Save Updated Bill</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <table className="w-full text-left text-sm border rounded overflow-hidden mb-6 shadow-sm">
                <thead className="bg-slate-800 text-white border-b">
                  <tr>
                    <th className="p-3">Test Name</th>
                    <th className="p-3">Reference Range</th>
                    <th className="p-3 w-64">Result Value</th>
                    <th className="p-3">Abnormal Flagging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {processingBooking.tests?.map((t, idx) => {
                    const currentFlag = results[t.id]?.flag || "Normal";
                    
                    let rowClass = "hover:bg-slate-50";
                    if (currentFlag === "Critical") rowClass = "bg-red-50";
                    else if (currentFlag !== "Normal") rowClass = "bg-amber-50";

                    return (
                      <tr key={idx} className={rowClass}>
                        <td className="p-4 font-bold text-slate-800">{t.name}</td>
                        <td className="p-4 text-xs font-mono text-slate-600">{t.refRange} <span className="font-bold">{t.unit}</span></td>
                        <td className="p-4">
                          <input 
                            type="text" 
                            placeholder="Enter Value" 
                            value={results[t.id]?.value || ""} 
                            onChange={e => setResults({...results, [t.id]: { ...results[t.id], value: e.target.value, flag: currentFlag }})} 
                            className={`w-full p-2 border rounded outline-none font-bold ${currentFlag === "Critical" ? 'border-red-400 text-red-700 bg-white' : 'focus:border-emerald-500'}`} 
                          />
                        </td>
                        <td className="p-4 flex gap-1">
                          {["Normal", "Low", "High", "Critical"].map(f => {
                            let btnClass = "bg-white text-slate-500 hover:bg-slate-100";
                            if (currentFlag === f) {
                              if (f === "Normal") btnClass = "bg-emerald-500 text-white border-emerald-600";
                              else if (f === "Critical") btnClass = "bg-red-600 text-white border-red-700 animate-pulse";
                              else btnClass = "bg-amber-500 text-white border-amber-600";
                            }
                            return (
                              <button 
                                key={f} 
                                onClick={() => setResults({...results, [t.id]: { ...results[t.id], flag: f }})} 
                                className={`px-2 py-1.5 text-xs font-bold rounded border transition ${btnClass}`}
                              >
                                {f}
                              </button>
                            );
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="flex gap-4">
                <button onClick={openPreview} className="flex-1 py-4 bg-white text-slate-800 rounded font-bold border-2 border-slate-300 hover:border-slate-800 shadow-sm">👀 Preview Document</button>
                <button onClick={saveResults} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold border-2 border-emerald-700 shadow-sm">🔒 Lock, Sign & Finalize Report</button>
              </div>
            </div>
          )}

          {/* VIEW 4: PAST RECORDS */}
          {activeView === "records" && (
            <div className="overflow-hidden rounded border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-600">ID / Date</th>
                    <th className="p-4 font-bold text-slate-600">Patient</th>
                    <th className="p-4 font-bold text-slate-600">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastRecords.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">No completed records yet.</td></tr>
                  ) : (
                    pastRecords.map(b => {
                      const downloadTooltip = (b.downloadLogs || []).map(log => `${log.by} at ${new Date(log.time).toLocaleString()}`).join(' | ');
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-4 font-mono text-slate-500">
                            <span className="block font-bold">{b.clinicalId}</span>
                            {b.date}
                          </td>
                          <td className="p-4 font-semibold text-slate-800">{b.name}</td>
                          <td className="p-4">
                            {b.reportGenerated ? (
                              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold border border-emerald-200">
                                ✅ Generated by {b.reportGeneratedBy}
                              </span>
                            ) : (
                              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold border border-amber-200">
                                ⏳ Pending Generation
                              </span>
                            )}
                            
                            {b.downloadLogs && b.downloadLogs.length > 0 && (
                              <div className="mt-2 text-xs text-slate-500">
                                <span className="font-bold underline cursor-help" title={downloadTooltip}>
                                  Downloaded {b.downloadLogs.length} time(s)
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => unlockRecord(b)} className="bg-white border text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded font-bold transition">Unlock & Modify</button>
                            <button onClick={() => downloadFinalPDF(b)} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-bold transition shadow-sm">Download PDF</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PDF PREVIEW MODAL */}
          {previewPdf && (
            <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-slate-100 rounded-lg w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                  <div>
                    <h2 className="font-bold text-lg text-slate-800">Quality Assurance Preview</h2>
                    <p className="text-xs text-slate-500">Check for typos before finalizing. (Download disabled in preview mode).</p>
                  </div>
                  <button onClick={() => setPreviewPdf(null)} className="text-slate-500 hover:text-red-600 hover:bg-red-50 border px-4 py-2 rounded font-bold transition">Close Preview</button>
                </div>
                <iframe src={previewPdf} className="flex-1 w-full bg-slate-300" title="PDF Preview" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Staff;
