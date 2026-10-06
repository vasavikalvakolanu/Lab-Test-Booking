import React, { useState } from "react";
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { fullCatalog, defaultPackages } from "./seederData";

export function CatalogTab({ categories, fetchData }) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTest, setNewTest] = useState({ name: '', price: '', refRange: '', unit: '', categoryId: '' });
  const [editingTest, setEditingTest] = useState(null);

  const seedCatalog = async () => {
    if (!window.confirm("Load Full Catalog?")) return;
    const batch = writeBatch(db);
    fullCatalog.forEach(cat => batch.set(doc(collection(db, "testCategories")), cat));
    defaultPackages.forEach(pkg => batch.set(doc(collection(db, "packages")), { ...pkg, createdAt: serverTimestamp() }));
    await batch.commit(); fetchData(); alert("Catalog Loaded!");
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    await addDoc(collection(db, "testCategories"), { name: newCategoryName, tests: [] });
    setNewCategoryName(''); fetchData();
  };

  const addTest = async (e) => {
    e.preventDefault();
    if (!newTest.categoryId || !newTest.name || !newTest.price) return;
    const target = categories.find(c => c.id === newTest.categoryId);
    const updated = [...(target.tests || []), { id: Date.now().toString(), name: newTest.name, price: Number(newTest.price), refRange: newTest.refRange, unit: newTest.unit }];
    await updateDoc(doc(db, "testCategories", newTest.categoryId), { tests: updated });
    setNewTest({ name: '', price: '', refRange: '', unit: '', categoryId: newTest.categoryId }); fetchData();
  };

  const saveEdit = async () => {
    const cat = categories.find(c => c.id === editingTest.catId);
    const updated = cat.tests.map(t => t.id === editingTest.id ? { ...t, name: editingTest.name, price: Number(editingTest.price), refRange: editingTest.refRange, unit: editingTest.unit } : t);
    await updateDoc(doc(db, "testCategories", editingTest.catId), { tests: updated });
    setEditingTest(null); fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6 lg:col-span-1">
        <div className="bg-white p-5 rounded border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold">1. Add Subgroup</h2>
            {categories.length === 0 && <button onClick={seedCatalog} className="text-xs bg-slate-800 text-emerald-400 font-bold px-3 py-1.5 rounded">Load Defaults</button>}
          </div>
          <form onSubmit={addCategory} className="flex gap-2">
            <input type="text" placeholder="e.g. Biochemistry" className="w-full border p-2 text-sm rounded outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
            <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded">+</button>
          </form>
        </div>
        <div className="bg-white p-5 rounded border shadow-sm">
          <h2 className="text-sm font-semibold mb-4">2. Add Custom Test</h2>
          <form onSubmit={addTest} className="space-y-3">
            <select className="w-full border p-2 text-sm rounded outline-none" value={newTest.categoryId} onChange={e => setNewTest({...newTest, categoryId: e.target.value})}>
              <option value="">Select Subgroup</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" placeholder="Test Name" className="w-full border p-2 text-sm rounded outline-none" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
            <input type="number" placeholder="Price (₹)" className="w-full border p-2 text-sm rounded outline-none" value={newTest.price} onChange={e => setNewTest({...newTest, price: e.target.value})} />
            <div className="flex gap-2">
              <input type="text" placeholder="Ref. Range" className="w-1/2 border p-2 text-sm rounded outline-none" value={newTest.refRange} onChange={e => setNewTest({...newTest, refRange: e.target.value})} />
              <input type="text" placeholder="Unit" className="w-1/2 border p-2 text-sm rounded outline-none" value={newTest.unit} onChange={e => setNewTest({...newTest, unit: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-slate-800 text-white py-2 text-sm rounded">Add Test</button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white border rounded shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
              <h3 className="text-sm font-bold">{cat.name}</h3>
              <button onClick={async () => { await deleteDoc(doc(db, "testCategories", cat.id)); fetchData(); }} className="text-red-500 text-xs hover:underline">Delete Group</button>
            </div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {(cat.tests || []).map(t => editingTest?.id === t.id ? (
                  <tr key={t.id} className="bg-blue-50">
                    <td className="p-2"><input value={editingTest.name} onChange={e=>setEditingTest({...editingTest, name:e.target.value})} className="w-full border p-1 text-sm outline-none" /></td>
                    <td className="p-2"><input type="number" value={editingTest.price} onChange={e=>setEditingTest({...editingTest, price:e.target.value})} className="w-16 border p-1 text-sm outline-none" /></td>
                    <td className="p-2 flex gap-1"><input value={editingTest.refRange} onChange={e=>setEditingTest({...editingTest, refRange:e.target.value})} className="w-1/2 border p-1 text-xs outline-none" /><input value={editingTest.unit} onChange={e=>setEditingTest({...editingTest, unit:e.target.value})} className="w-1/2 border p-1 text-xs outline-none" /></td>
                    <td className="p-2 text-right"><button onClick={saveEdit} className="text-emerald-600 text-xs font-bold mr-3">Save</button><button onClick={()=>setEditingTest(null)} className="text-slate-500 text-xs">Cancel</button></td>
                  </tr>
                ) : (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium">{t.name}</td><td className="p-4 font-semibold">₹{t.price}</td><td className="p-4 text-xs text-slate-500"><span className="bg-slate-100 px-1 border rounded">{t.refRange}</span> {t.unit}</td>
                    <td className="p-4 text-right"><button onClick={()=>setEditingTest({catId: cat.id, ...t})} className="text-blue-500 text-xs mr-3 hover:underline">Edit</button><button onClick={async () => { await updateDoc(doc(db, "testCategories", cat.id), { tests: cat.tests.filter(x => x.id !== t.id) }); fetchData(); }} className="text-red-500 text-xs hover:underline">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PackagesTab({ packages, fetchData }) {
  const [pkgData, setPkgData] = useState({ name: "", includes: "", price: "", discountedPrice: "", allowCoupons: false });

  const addPackage = async () => {
    if (!pkgData.name || !pkgData.price) return;
    // Map custom strings into test objects for staff portal entry
    const subTests = pkgData.includes.split(',').map(item => ({ name: item.trim(), refRange: "Standard", unit: "-" })).filter(t => t.name !== "");
    await addDoc(collection(db, "packages"), { ...pkgData, price: Number(pkgData.price), discountedPrice: pkgData.discountedPrice ? Number(pkgData.discountedPrice) : null, isPackage: true, tests: subTests, createdAt: serverTimestamp() });
    setPkgData({ name: "", includes: "", price: "", discountedPrice: "", allowCoupons: false }); fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-5 rounded border shadow-sm self-start">
        <h3 className="text-sm font-semibold mb-4">Create Package</h3>
        <div className="space-y-3">
          <input type="text" placeholder="Package Name" value={pkgData.name} onChange={e => setPkgData({...pkgData, name: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
          <textarea placeholder="Tests Included (Comma Separated)" value={pkgData.includes} onChange={e => setPkgData({...pkgData, includes: e.target.value})} className="w-full p-2 border rounded text-sm h-20 outline-none" />
          <input type="number" placeholder="Total Value MRP (₹)" value={pkgData.price} onChange={e => setPkgData({...pkgData, price: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
          <input type="number" placeholder="Offer Price (₹)" value={pkgData.discountedPrice} onChange={e => setPkgData({...pkgData, discountedPrice: e.target.value})} className="w-full p-2 border rounded text-sm outline-none" />
          <label className="flex items-center text-sm text-slate-700 mt-2"><input type="checkbox" checked={pkgData.allowCoupons} onChange={e => setPkgData({...pkgData, allowCoupons: e.target.checked})} className="mr-2" /> Allow Extra Coupons</label>
          <button onClick={addPackage} className="w-full bg-slate-800 text-white py-2 rounded text-sm mt-2">Create Package</button>
        </div>
      </div>
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map(p => (
          <div key={p.id} className="bg-white border p-5 rounded shadow-sm relative">
            <button onClick={async () => { await deleteDoc(doc(db, "packages", p.id)); fetchData(); }} className="absolute top-4 right-4 text-xs text-red-500 hover:underline">Delete</button>
            <h3 className="text-base font-semibold pr-10 mb-1">{p.name}</h3>
            <span className="text-xs text-slate-500 border px-2 py-0.5 rounded bg-slate-50">{p.allowCoupons ? 'Coupons Allowed' : 'No Extra Coupons'}</span>
            <div className="mt-3 mb-4 flex flex-wrap gap-1">{(p.tests || []).map((t, i) => <span key={i} className="text-xs bg-slate-100 border px-1.5 py-0.5 rounded">{t.name}</span>)}</div>
            <div className="pt-3 border-t flex gap-2">{p.discountedPrice ? <><span className="line-through text-slate-400">₹{p.price}</span><span className="font-bold text-emerald-600 text-lg">₹{p.discountedPrice}</span></> : <span className="font-bold text-lg">₹{p.price}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 
