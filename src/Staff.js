import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";

function Staff() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [resultsData, setResultsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
    setIsLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
    fetchBookings(); 
    if (selectedBooking?.id === id) {
      setSelectedBooking(null); // Clear selection after completion
    }
  };

  const generatePDFReport = (booking) => {
    const doc = new jsPDF();
    
    // Header styling
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // Blue-900
    doc.text("SRI BALAJI DIAGNOSTICS", 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("CLINICAL LABORATORY REPORT", 14, 28);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Patient Name: ${booking.name}`, 14, 40);
    doc.text(`Phone: ${booking.phone}`, 14, 46);
    doc.text(`Date: ${booking.date}`, 14, 52);
    doc.text(`Ref By: ${booking.referredBy || 'Self'}`, 14, 58);

    const tableRows = Object.keys(resultsData).map(testParam => [
      testParam, 
      resultsData[testParam].value || "-", 
      resultsData[testParam].unit || "", 
      resultsData[testParam].range || ""
    ]);

    doc.autoTable({
      startY: 65,
      head: [['Test Parameter', 'Observed Value', 'Unit', 'Biological Ref. Range']],
      body: tableRows,
      headStyles: { fillColor: [30, 58, 138] },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
            data.cell.styles.fontStyle = 'bold'; 
        }
      }
    });

    doc.save(`${booking.name.replace(/\s+/g, '_')}_Report.pdf`);
    updateStatus(booking.id, "COMPLETED");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex justify-between items-center">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <div>
            <h1 className="text-3xl font-extrabold text-blue-900 mt-2 tracking-tight">Staff Portal</h1>
            <p className="text-gray-600 font-medium mt-1">Manage sample collections and generate reports.</p>
          </div>
          <button onClick={fetchBookings} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold border border-blue-200 hover:bg-blue-100 transition">
            🔄 Refresh List
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ================= LEFT SIDE: ORDER MANAGEMENT ================= */}
          <div className="flex-1 bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 h-fit">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              📋 Active Appointments
            </h2>

            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {isLoading ? (
                <p className="text-center text-gray-500 py-8 font-medium">Loading appointments...</p>
              ) : bookings.filter(b => b.status !== "COMPLETED").length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-gray-500 font-bold">All caught up! No pending tests.</p>
                </div>
              ) : bookings.filter(b => b.status !== "COMPLETED").map(b => (
                <div key={b.id} className="p-5 rounded-xl border-2 border-gray-100 hover:border-blue-300 transition-all shadow-sm bg-white group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{b.name}</h3>
                      <p className="text-sm text-gray-500 font-medium">ID: {b.id.slice(0, 6).toUpperCase()} • {b.date} • {b.timeSlot}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                      b.status === 'SAMPLE_COLLECTED' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                      {b.status === 'pending' ? 'Pending' : 'Collected'}
                    </span>
                  </div>
                  
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tests Booked</p>
                    <div className="flex flex-wrap gap-1.5">
                      {b.cartItems?.map((item, idx) => (
                        <span key={idx} className="bg-white text-gray-700 text-[11px] font-bold px-2 py-1 rounded border shadow-sm">
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {b.status === 'pending' && (
                      <button onClick={() => updateStatus(b.id, "SAMPLE_COLLECTED")} className="flex-1 bg-white border-2 border-blue-600 text-blue-700 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm">
                        💉 Mark Sample Collected
                      </button>
                    )}
                    {b.status === 'SAMPLE_COLLECTED' && (
                      <button onClick={() => setSelectedBooking(b)} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition shadow-sm">
                        🧪 Enter Lab Results
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================= RIGHT SIDE: REPORT ENTRY ================= */}
          <div className="w-full lg:w-[500px]">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 sticky top-8">
              {!selectedBooking ? (
                <div className="text-center py-16 opacity-50">
                  <span className="text-6xl block mb-4">📄</span>
                  <p className="font-bold text-gray-500 text-lg">Select a collected sample<br/>to enter results.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                    Report Generation
                  </h2>
                  
                  <div className="mb-6 bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <h3 className="font-black text-blue-900 text-lg mb-1">{selectedBooking.name}</h3>
                    <p className="text-sm text-blue-700 font-medium">Ref By: {selectedBooking.referredBy || 'Self'}</p>
                    <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
                       <span className="text-sm font-bold text-blue-800">Total Bill Paid: ₹{selectedBooking.total}</span>
                       <button onClick={() => alert("Printing Bill functionality can be connected to thermal printer.")} className="text-xs bg-white text-blue-700 px-3 py-1.5 rounded-md font-bold shadow-sm border border-blue-200">
                         Print Receipt
                       </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                    Enter Clinical Values
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    {/* Placeholder for dynamic parameters based on selected tests */}
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                      <label className="block text-sm font-bold text-gray-900 mb-2">Hemoglobin (Hb)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium outline-none" 
                          placeholder="Observed Value" 
                          onChange={(e) => setResultsData({
                            ...resultsData, 
                            "Hemoglobin": {value: e.target.value, unit: "g/dL", range: "13.8 - 17.2"}
                          })} 
                        />
                        <div className="bg-gray-200 px-4 py-3 rounded-lg text-sm text-gray-600 font-medium flex items-center">
                          g/dL
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 font-medium">Normal Range: 13.8 - 17.2</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => generatePDFReport(selectedBooking)} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-black text-lg shadow-lg transition-transform hover:-translate-y-1 flex justify-center items-center gap-2"
                  >
                    <span>📄</span> Generate & Export PDF Report
                  </button>
                  <button onClick={() => setSelectedBooking(null)} className="w-full text-center mt-4 text-sm text-gray-500 font-bold hover:text-gray-700">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Staff;
