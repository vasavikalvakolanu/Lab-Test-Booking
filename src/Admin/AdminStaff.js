import React, { useState } from "react";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";

export function StaffManageTab({ staffAccounts, fetchData }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) return alert("All fields are required.");
    if (password.length < 6) return alert("Password must be at least 6 characters.");
    
    setIsCreating(true);
    
    try {
      // Create a secondary app to avoid logging the Admin out
      const secondaryApp = initializeApp(auth.app.options, `TempApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      // Create the Auth account
      await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await secondaryAuth.signOut(); // Clean up the temp instance

      // Save a record to Firestore so the Admin can see the list of active staff
      await addDoc(collection(db, "staff_accounts"), {
        name,
        email,
        password, // Saved for Admin reference
        createdAt: new Date().toISOString()
      });

      setEmail("");
      setPassword("");
      setName("");
      fetchData();
      alert("Staff account created successfully!");
      
    } catch (error) {
      console.error("Error creating staff:", error);
      alert("Failed to create staff account. Email may already be in use.");
    }
    
    setIsCreating(false);
  };

  const removeStaffRecord = async (id, staffEmail) => {
    if (!window.confirm(`Remove ${staffEmail} from this list? (Note: To permanently revoke login access, you must also delete them in the Firebase Auth console)`)) return;
    
    await deleteDoc(doc(db, "staff_accounts", id));
    fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Add Staff Form */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl border shadow-sm self-start">
        <h3 className="font-bold text-slate-800 mb-4">Create Staff Account</h3>
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">STAFF NAME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded outline-none focus:border-blue-500 text-sm" placeholder="e.g. Front Desk 1" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">LOGIN EMAIL (USERNAME)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded outline-none focus:border-blue-500 text-sm" placeholder="desk1@clinic.com" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ACCOUNT PASSWORD</label>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded outline-none focus:border-blue-500 text-sm" placeholder="Minimum 6 characters" required />
          </div>
          <button type="submit" disabled={isCreating} className="w-full py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-900 transition disabled:opacity-50">
            {isCreating ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>

      {/* Staff List */}
      <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-slate-600 font-bold">Staff Name</th>
              <th className="p-4 text-slate-600 font-bold">Login Email</th>
              <th className="p-4 text-slate-600 font-bold">Password</th>
              <th className="p-4 text-right text-slate-600 font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffAccounts.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-400">No staff accounts created yet.</td></tr>
            ) : (
              staffAccounts.map(account => (
                <tr key={account.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{account.name}</td>
                  <td className="p-4 text-slate-600">{account.email}</td>
                  <td className="p-4 font-mono text-slate-500">{account.password}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => removeStaffRecord(account.id, account.email)} className="text-red-500 hover:text-red-700 font-bold text-xs">
                      Remove Record
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
