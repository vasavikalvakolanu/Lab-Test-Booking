import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Staff = () => {
  const [activeTab, setActiveTab] = useState('new');
  
  const [categories, setCategories] = useState([]);
  const [patient, setPatient] = useState({ name: '', age: '', phone: '', gender: 'Male' });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    fetchCategories();
    if (activeTab === 'history') fetchRecords();
  }, [activeTab]);

  const fetchCategories = async () => {
    const querySnapshot = await getDocs(collection(db, "testCategories"));
    const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCategories(cats);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
  };

  const fetchRecords = async () => {
    const querySnapshot = await getDocs(collection(db, "patients"));
    setRecords(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleTestSelection = (test) => {
    const isSelected = selectedTests.find(t => t.id === test.id);
    if (isSelected) {
      setSelectedTests(selectedTests.filter(t => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, { ...test, result: '' }]);
    }
  };

  const calculateTotal = () => selectedTests.reduce((sum, test) => sum + test.price, 0);

  const savePatientAndGenerateBill = async () => {
    if (!patient.name || selectedTests.length === 0) return alert("Enter patient details and select tests.");
    
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
      setPatient({ name: '', age: '', phone: '', gender: 'Male' });
      setSelectedTests([]);
    } catch (error) { console.error(error); }
  };

  const generateBillPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BALAJI LABS - INVOICE", 14, 20);
    doc.setFontSize(10);
    doc.text(`Patient: ${data.name.toUpperCase()}`, 14, 30);
    doc.text(`Age/Sex: ${data.age} / ${data.gender.toUpperCase()}`, 14, 36);
    doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 14, 42);

    const tableRows = data.tests.map(test => [test.name, `Rs. ${test.price}`]);
    doc.autoTable({ startY: 50, head: [["Description", "Amount"]], body: tableRows, theme: 'grid' });
    doc.text(`TOTAL: Rs. ${data.totalAmount}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`${data.name}_Invoice.pdf`);
  };

  const handleResultChange = (testId, value) => {
    const updatedTests = editingRecord.tests.map(t => t.id === testId ? { ...t, result: value } : t);
    setEditingRecord({ ...editingRecord, tests: updatedTests });
  };

  const saveUpdatedReport = async () => {
    try {
      await updateDoc(doc(db, "patients", editingRecord.id), { tests: editingRecord.tests, status: 'Completed' });
      setEditingRecord(null);
      fetchRecords();
    } catch (error) { console.error(error); }
  };

  const generateReportPDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BALAJI LABS - DIAGNOSTIC REPORT", 14, 20);
    doc.setFontSize(10);
    doc.text(`Patient: ${data.name.toUpperCase()}`, 14, 30);
    doc.text(`Age/Sex: ${data.age} / ${data.gender.toUpperCase()}`, 14, 36);
    doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 14, 42);

    const tableRows = data.tests.map(test => [test.name, test.result || 'Pending', test.refRange, test.unit]);
    doc.autoTable({ startY: 50, head: [["Test Name", "Result", "Reference Range", "Unit"]], body: tableRows, theme: 'grid' });
    doc.save(`${data.name}_Report.pdf`);
  };

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);
  const activeTests = activeCategoryObj ? activeCategoryObj.tests || [] : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Lab Operations</h1>
        </div>
        
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('new')} className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === 'new' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Registration & Billing
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Records & Results
          </button>
        </div>

        {activeTab === 'new' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-50 p-5 rounded border border-slate-200">
                <h2 className="text-sm font-semibold mb-4">Patient Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Full Name" className="border border-slate-300 px-3 py-1.5 text-sm rounded w-full"
                    value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} />
                  <input type="tel" placeholder="Phone Number" className="border border-slate-300 px-3 py-1.5 text-sm rounded w-full"
                    value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} />
                  <input type="number" placeholder="Age" className="border border-slate-300 px-3 py-1.5 text-sm rounded w-full"
                    value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} />
                  <select className="border border-slate-300 px-3 py-1.5 text-sm rounded w-full"
                    value={patient.gender} onChange={e => setPatient({...patient, gender: e.target.value})}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-5 rounded border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-semibold">Test Selection</h2>
                  <select className="border border-slate-300 px-2 py-1 text-sm rounded"
                    value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeTests.length === 0 && <p className="text-sm text-slate-500">No tests in this subgroup.</p>}
                  {activeTests.map(test => (
                    <label key={test.id} className="flex items-center space-x-2 text-sm p-2 border border-slate-100 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={!!selectedTests.find(t => t.id === test.id)}
                        onChange={() => handleTestSelection(test)} className="h-4 w-4 rounded border-slate-300 text-slate-800" />
                      <span className="flex-1">{test.name}</span>
                      <span className="font-medium">₹{test.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="bg-slate-800 text-white p-5 rounded border border-slate-700 shadow-md sticky top-6">
                <h2 className="text-sm font-semibold mb-4 text-slate-200">Invoice Summary</h2>
                <ul className="mb-4 space-y-2 text-sm border-b border-slate-600 pb-4">
                  {selectedTests.length === 0 ? <li className="text-slate-400">No tests selected</li> : null}
                  {selectedTests.map(test => (
                    <li key={test.id} className="flex justify-between">
                      <span className="truncate pr-2">{test.name}</span>
                      <span>₹{test.price}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-lg font-semibold flex justify-between mb-6">
                  <span>Total Due</span>
                  <span>₹{calculateTotal()}</span>
                </div>
                <button onClick={savePatientAndGenerateBill} className="w-full bg-white text-slate-900 font-semibold py-2 rounded text-sm hover:bg-slate-100 transition-colors">
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {editingRecord ? (
              <div className="bg-white p-5 rounded border border-slate-200">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-semibold">Update Results: {editingRecord.name}</h2>
                  <button onClick={() => setEditingRecord(null)} className="text-sm font-medium text-slate-500 hover:text-slate-800">Close Editor</button>
                </div>
                
                <table className="w-full text-left text-sm mb-6">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-medium text-slate-600">Test</th>
                      <th className="p-3 font-medium text-slate-600">Reference</th>
                      <th className="p-3 font-medium text-slate-600">Result Input</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editingRecord.tests.map(test => (
                      <tr key={test.id}>
                        <td className="p-3 font-medium">{test.name}</td>
                        <td className="p-3 text-slate-500">{test.refRange} {test.unit}</td>
                        <td className="p-3">
                          <input type="text" placeholder="Enter value" className="border border-slate-300 px-2 py-1.5 rounded w-48 text-sm"
                            value={test.result || ''} onChange={(e) => handleResultChange(test.id, e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={saveUpdatedReport} className="bg-slate-800 text-white font-medium py-2 px-6 rounded text-sm">Save & Lock Results</button>
              </div>
            ) : (
              <table className="w-full text-left text-sm border border-slate-200 rounded overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-medium text-slate-600">Date</th>
                    <th className="p-3 font-medium text-slate-600">Patient</th>
                    <th className="p-3 font-medium text-slate-600">Status</th>
                    <th className="p-3 font-medium text-slate-600 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{record.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${record.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="p-3 flex justify-end space-x-3">
                        <button onClick={() => setEditingRecord(record)} className="text-slate-600 font-medium hover:text-slate-900">Update</button>
                        <button onClick={() => generateReportPDF(record)} className="text-indigo-600 font-medium hover:text-indigo-900">Print</button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-400">No patient records found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Staff;
