import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalPatients: 0, totalRevenue: 0 });
  const [promoCodes, setPromoCodes] = useState([]);
  const [newPromo, setNewPromo] = useState({ code: '', discount: '', type: 'percentage' });
  const [distanceSettings, setDistanceSettings] = useState({ baseDistance: '', baseFee: '', extraPerKm: '' });
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTest, setNewTest] = useState({ name: '', price: '', refRange: '', unit: '', categoryId: '' });

  useEffect(() => {
    fetchDashboardStats();
    fetchPromoCodes();
    fetchDistanceSettings();
    fetchCategories();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "patients"));
      let totalRev = 0, count = 0;
      querySnapshot.forEach((doc) => {
        count++;
        totalRev += Number(doc.data().totalAmount || 0);
      });
      setStats({ totalPatients: count, totalRevenue: totalRev });
    } catch (error) { console.error(error); }
  };

  const fetchPromoCodes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "promoCodes"));
      setPromoCodes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error(error); }
  };

  const handleAddPromo = async (e) => {
    e.preventDefault();
    if (!newPromo.code || !newPromo.discount) return alert("Fill all fields");
    try {
      await addDoc(collection(db, "promoCodes"), {
        code: newPromo.code.toUpperCase(), discount: Number(newPromo.discount), type: newPromo.type, createdAt: new Date().toISOString()
      });
      setNewPromo({ code: '', discount: '', type: 'percentage' });
      fetchPromoCodes();
    } catch (error) { console.error(error); }
  };

  const handleDeletePromo = async (id) => {
    try { await deleteDoc(doc(db, "promoCodes", id)); fetchPromoCodes(); } 
    catch (error) { console.error(error); }
  };

  const fetchDistanceSettings = async () => {
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setDistanceSettings(docSnap.data());
      else setDistanceSettings({ baseDistance: 5, baseFee: 100, extraPerKm: 20 });
    } catch (error) { console.error(error); }
  };

  const docRef = doc(db, "settings", "homeCollection");
  const handleSaveDistanceSettings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(docRef, {
        baseDistance: Number(distanceSettings.baseDistance), baseFee: Number(distanceSettings.baseFee), extraPerKm: Number(distanceSettings.extraPerKm)
      });
      alert("Settings saved");
    } catch (error) { console.error(error); }
  };

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "testCategories"));
      const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(cats);
      if (cats.length > 0 && !newTest.categoryId) setNewTest(prev => ({ ...prev, categoryId: cats[0].id }));
    } catch (error) { console.error(error); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await addDoc(collection(db, "testCategories"), { name: newCategoryName, tests: [] });
      setNewCategoryName(''); fetchCategories();
    } catch (error) { console.error(error); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete subgroup?")) return;
    try { await deleteDoc(doc(db, "testCategories", id)); fetchCategories(); } 
    catch (error) { console.error(error); }
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    if (!newTest.categoryId || !newTest.name || !newTest.price) return alert("Fill required fields.");
    try {
      const targetCategory = categories.find(c => c.id === newTest.categoryId);
      const updatedTests = [...(targetCategory.tests || []), { id: Date.now().toString(), name: newTest.name, price: Number(newTest.price), refRange: newTest.refRange, unit: newTest.unit }];
      await updateDoc(doc(db, "testCategories", newTest.categoryId), { tests: updatedTests });
      setNewTest({ name: '', price: '', refRange: '', unit: '', categoryId: newTest.categoryId });
      fetchCategories();
    } catch (error) { console.error(error); }
  };

  const handleDeleteTest = async (categoryId, testId) => {
    try {
      const targetCategory = categories.find(c => c.id === categoryId);
      const updatedTests = targetCategory.tests.filter(t => t.id !== testId);
      await updateDoc(doc(db, "testCategories", categoryId), { tests: updatedTests });
      fetchCategories();
    } catch (error) { console.error(error); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">System Administration</h1>
        </div>
        
        <div className="flex gap-2 mb-6">
          {['dashboard', 'catalog', 'promo', 'distance'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${activeTab === tab ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {tab === 'catalog' ? 'Test Catalog' : tab.replace('distance', 'Logistics')}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</h3>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.totalPatients}</p>
            </div>
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</h3>
              <p className="text-2xl font-semibold text-emerald-600 mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 lg:col-span-1">
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h2 className="text-sm font-semibold mb-3">1. Add Subgroup</h2>
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input type="text" placeholder="e.g. Biochemistry" className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded focus:outline-none focus:border-slate-500"
                    value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button type="submit" className="bg-slate-800 text-white px-3 py-1.5 text-sm rounded hover:bg-slate-700">+</button>
                </form>
              </div>

              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h2 className="text-sm font-semibold mb-3">2. Add New Test</h2>
                <form onSubmit={handleAddTest} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Subgroup</label>
                    <select className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded focus:outline-none focus:border-slate-500"
                      value={newTest.categoryId} onChange={e => setNewTest({...newTest, categoryId: e.target.value})}>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Test Name</label>
                    <input type="text" className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded"
                      value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Price (₹)</label>
                    <input type="number" className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded"
                      value={newTest.price} onChange={e => setNewTest({...newTest, price: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Ref. Range</label>
                      <input type="text" className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded"
                        value={newTest.refRange} onChange={e => setNewTest({...newTest, refRange: e.target.value})} />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                      <input type="text" className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded"
                        value={newTest.unit} onChange={e => setNewTest({...newTest, unit: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-800 text-white font-medium py-1.5 text-sm rounded mt-2 hover:bg-slate-700">Add to Catalog</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white border border-slate-200 rounded overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-800">{cat.name}</h3>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 text-xs hover:underline">Delete Group</button>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-slate-500">Test</th>
                        <th className="px-4 py-2 text-xs font-medium text-slate-500">Price</th>
                        <th className="px-4 py-2 text-xs font-medium text-slate-500">Range</th>
                        <th className="px-4 py-2 text-xs font-medium text-slate-500">Unit</th>
                        <th className="px-4 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(cat.tests || []).map(test => (
                        <tr key={test.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2">{test.name}</td>
                          <td className="px-4 py-2">₹{test.price}</td>
                          <td className="px-4 py-2 text-slate-500">{test.refRange || '-'}</td>
                          <td className="px-4 py-2 text-slate-500">{test.unit || '-'}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => handleDeleteTest(cat.id, test.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'promo' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-slate-50 p-4 rounded border border-slate-200">
              <h2 className="text-sm font-semibold mb-3">New Campaign</h2>
              <form onSubmit={handleAddPromo} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
                  <input type="text" className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded uppercase"
                    value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                    <input type="number" className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded"
                      value={newPromo.discount} onChange={e => setNewPromo({...newPromo, discount: e.target.value})} />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                    <select className="w-full border border-slate-300 px-2 py-1.5 text-sm rounded"
                      value={newPromo.type} onChange={e => setNewPromo({...newPromo, type: e.target.value})}>
                      <option value="percentage">% Off</option>
                      <option value="flat">Flat ₹ Off</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white font-medium py-1.5 text-sm rounded">Create Promo</button>
              </form>
            </div>
            <div className="md:col-span-2">
              <table className="w-full text-left border border-slate-200 rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 font-medium text-slate-600">Promo Code</th>
                    <th className="px-4 py-2 font-medium text-slate-600">Discount</th>
                    <th className="px-4 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {promoCodes.map(promo => (
                    <tr key={promo.id}>
                      <td className="px-4 py-2 font-semibold text-slate-800">{promo.code}</td>
                      <td className="px-4 py-2">{promo.type === 'flat' ? `₹${promo.discount}` : `${promo.discount}%`}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleDeletePromo(promo.id)} className="text-red-500 text-xs">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'distance' && (
          <div className="bg-slate-50 p-5 rounded border border-slate-200 max-w-xl">
            <h2 className="text-sm font-semibold mb-4">Logistics Configuration</h2>
            <form onSubmit={handleSaveDistanceSettings} className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <label className="font-medium text-slate-700">Base Radius (km)</label>
                <input type="number" className="border border-slate-300 px-2 py-1.5 rounded w-24 text-right"
                  value={distanceSettings.baseDistance} onChange={e => setDistanceSettings({...distanceSettings, baseDistance: e.target.value})} />
              </div>
              <div className="flex justify-between items-center">
                <label className="font-medium text-slate-700">Base Fee (₹)</label>
                <input type="number" className="border border-slate-300 px-2 py-1.5 rounded w-24 text-right"
                  value={distanceSettings.baseFee} onChange={e => setDistanceSettings({...distanceSettings, baseFee: e.target.value})} />
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <label className="font-medium text-slate-700">Overage Rate (₹/km)</label>
                <input type="number" className="border border-slate-300 px-2 py-1.5 rounded w-24 text-right"
                  value={distanceSettings.extraPerKm} onChange={e => setDistanceSettings({...distanceSettings, extraPerKm: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white font-medium py-2 rounded">Save Configuration</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
