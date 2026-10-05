import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Pre-defined test catalog mapped by subgroups
const TEST_CATALOG = {
  "Biochemistry": [
    { id: 'b1', name: 'Fasting Blood Sugar (FBS)', price: 150, refRange: '70-100 mg/dL' },
    { id: 'b2', name: 'Serum Creatinine', price: 200, refRange: '0.6-1.2 mg/dL' },
    { id: 'b3', name: 'Lipid Profile', price: 600, refRange: 'Varies' }
  ],
  "Hematology": [
    { id: 'h1', name: 'Complete Blood Count (CBC)', price: 300, refRange: 'Standard' },
    { id: 'h2', name: 'Hemoglobin (Hb)', price: 150, refRange: '12-17 g/dL' }
  ],
  "Immunology": [
    { id: 'i1', name: 'Thyroid Profile (T3, T4, TSH)', price: 500, refRange: 'Varies' }
  ]
};

const Staff = () => {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
  
  // New Patient State
  const [patient, setPatient] = useState({ name: '', age: '', phone: '', gender: 'Male' });
  const [selectedCategory, setSelectedCategory] = useState('Biochemistry');
  const [selectedTests, setSelectedTests] = useState([]);
  
  // History & Reports State
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);

  // Fetch past records on load
  useEffect(() => {
    if (activeTab === 'history') fetchRecords();
  }, [activeTab]);

  const fetchRecords = async () => {
    const querySnapshot = await getDocs(collection(db, "patients"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRecords(data);
  };

  // --- NEW PATIENT & BILLING ---

  const handleTestSelection = (test) => {
    const isSelected = selectedTests.find(t => t.id === test.id);
    if (isSelected) {
      setSelectedTests(selectedTests.filter(t => t.id !== test.id));
    } else {
      // Add test with an empty result field for later reporting
      setSelectedTests([...selectedTests, { ...test, result: '' }]);
    }
  };

  const calculateTotal = () => selectedTests.reduce((sum, test) => sum + test.price, 0);

  const savePatientAndGenerateBill = async () => {
    if (!patient.name || selectedTests.length === 0) {
      alert("Please enter patient details and select at least one test.");
      return;
    }

    const newRecord = {
      ...patient,
      tests: selectedTests,
      totalAmount: calculateTotal(),
      date: new Date().toISOString(),
      status: 'Pending Results'
    };

    try {
      await addDoc(collection(db, "patients"), newRecord);
      generateBillPDF(newRecord);
      // Reset form
      setPatient({ name: '', age: '', phone: '', gender: 'Male' });
      setSelectedTests([]);
      alert("Patient registered and Bill generated successfully!");
    } catch (error) {
      console.error("Error saving patient:", error);
      alert("Failed to save patient record.");
    }
  };

  const generateBillPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Balaji Labs - Invoice", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Patient Name: ${data.name}`, 14, 35);
    doc.text(`Age/Gender: ${data.age} / ${data.gender}`, 14, 42);
    doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 14, 49);

    const tableColumn = ["Test Name", "Category", "Price (Rs)"];
    const tableRows = data.tests.map(test => [
      test.name, 
      Object.keys(TEST_CATALOG).find(cat => TEST_CATALOG[cat].some(t => t.id === test.id)), 
      test.price
    ]);

    doc.autoTable({
      startY: 55,
      head: [tableColumn],
      body: tableRows,
    });

    doc.text(`Total Amount: Rs ${data.totalAmount}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`${data.name}_Bill.pdf`);
  };

  // --- EDITING & REPORTS ---

  const handleResultChange = (testId, value) => {
    const updatedTests = editingRecord.tests.map(t => 
      t.id === testId ? { ...t, result: value } : t
    );
    setEditingRecord({ ...editingRecord, tests: updatedTests });
  };

  const saveUpdatedReport = async () => {
    try {
      const recordRef = doc(db, "patients", editingRecord.id);
      await updateDoc(recordRef, {
        tests: editingRecord.tests,
        status: 'Completed'
      });
      setEditingRecord(null);
      fetchRecords();
      alert("Report updated successfully!");
    } catch (error) {
      console.error("Error updating report:", error);
    }
  };

  const generateReportPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Balaji Labs - Test Report", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Patient Name: ${data.name}`, 14, 35);
    doc.text(`Age/Gender: ${data.age} / ${data.gender}`, 14, 42);
    doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 14, 49);

    const tableColumn = ["Test Name", "Result", "Reference Range"];
    const tableRows = data.tests.map(test => [
      test.name, 
      test.result || 'Pending', 
      test.refRange
    ]);

    doc.autoTable({
      startY: 55,
      head: [tableColumn],
      body: tableRows,
    });

    doc.save(`${data.name}_Medical_Report.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Staff Dashboard</h1>
        
        <div className="flex space-x-4 mb-8 border-b pb-4">
          <button 
            onClick={() => setActiveTab('new')} 
            className={`px-4 py-2 font-semibold rounded ${activeTab === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            New Patient Registration
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`px-4 py-2 font-semibold rounded ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Manage Reports
          </button>
        </div>

        {/* TAB 1: NEW PATIENT & BILLING */}
        {activeTab === 'new' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Patient Form */}
            <div>
              <h2 className="text-xl font-bold mb-4">1. Patient Details</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full border p-2 rounded" 
                  value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} />
                <div className="flex space-x-4">
                  <input type="number" placeholder="Age" className="w-1/2 border p-2 rounded" 
                    value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} />
                  <select className="w-1/2 border p-2 rounded" 
                    value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <input type="tel" placeholder="Phone Number" className="w-full border p-2 rounded" 
                  value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} />
              </div>

              <h2 className="text-xl font-bold mt-8 mb-4">2. Select Subgroup</h2>
              <select 
                className="w-full border p-2 rounded mb-4"
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {Object.keys(TEST_CATALOG).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <div className="bg-gray-50 p-4 border rounded">
                {TEST_CATALOG[selectedCategory].map(test => (
                  <label key={test.id} className="flex items-center space-x-3 mb-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!selectedTests.find(t => t.id === test.id)}
                      onChange={() => handleTestSelection(test)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span>{test.name} - Rs {test.price}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <h2 className="text-xl font-bold mb-4">Bill Summary</h2>
              {selectedTests.length === 0 ? (
                <p className="text-gray-500">No tests selected yet.</p>
              ) : (
                <ul className="mb-4 space-y-2">
                  {selectedTests.map(test => (
                    <li key={test.id} className="flex justify-between border-b border-blue-200 pb-1">
                      <span>{test.name}</span>
                      <span className="font-semibold">Rs {test.price}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-xl font-bold border-t border-blue-300 pt-4 flex justify-between">
                <span>Total:</span>
                <span>Rs {calculateTotal()}</span>
              </div>
              <button 
                onClick={savePatientAndGenerateBill}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded mt-6 hover:bg-blue-700"
              >
                Save Patient & Generate Bill PDF
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE REPORTS */}
        {activeTab === 'history' && (
          <div>
            {editingRecord ? (
              <div className="bg-yellow-50 p-6 rounded border border-yellow-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Editing Results for {editingRecord.name}</h2>
                  <button onClick={() => setEditingRecord(null)} className="text-red-500 font-bold">Cancel</button>
                </div>
                
                {editingRecord.tests.map(test => (
                  <div key={test.id} className="mb-4 flex items-center justify-between bg-white p-3 border rounded">
                    <div className="w-1/3 font-semibold">{test.name}</div>
                    <div className="w-1/3 text-sm text-gray-500">Ref: {test.refRange}</div>
                    <input 
                      type="text" 
                      placeholder="Enter Result"
                      value={test.result || ''}
                      onChange={(e) => handleResultChange(test.id, e.target.value)}
                      className="w-1/3 border p-2 rounded"
                    />
                  </div>
                ))}
                
                <button 
                  onClick={saveUpdatedReport}
                  className="bg-green-600 text-white font-bold py-2 px-6 rounded mt-4"
                >
                  Save Results
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3">Date</th>
                      <th className="p-3">Patient Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(record => (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">{record.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-sm ${record.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="p-3 flex space-x-2">
                          <button 
                            onClick={() => setEditingRecord(record)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                          >
                            Edit Results
                          </button>
                          <button 
                            onClick={() => generateReportPDF(record)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Download PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr><td colSpan="4" className="p-4 text-center text-gray-500">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Staff;
