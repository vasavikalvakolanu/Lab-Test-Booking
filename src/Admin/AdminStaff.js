import React, { useState } from "react";
import { collection, addDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";

export function StaffManageTab({ staffAccounts, fetchData }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Lab Technician");
  const [isCreating, setIsCreating] = useState(false);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) return alert("All fields are required.");
    if (password.length < 6) {
      return alert("Password must be at least 6 characters.");
    }

    setIsCreating(true);
    try {
      const secondaryApp = initializeApp(
        auth.app.options,
        `TempApp_${Date.now()}`
      );
      const secondaryAuth = getAuth(secondaryApp);

      await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim().toLowerCase(),
        password
      );
      await secondaryAuth.signOut();

      await addDoc(collection(db, "staff_accounts"), {
        name: name.trim(),
        role,
        email: email.trim().toLowerCase(),
        password,
        disabled: false,
        createdAt: new Date().toISOString()
      });

      setEmail("");
      setPassword("");
      setName("");
      fetchData();
      alert("Staff account created and activated!");
    } catch (error) {
      console.error("Error creating staff:", error);
      alert("Failed to create staff account. Email may already be registered.");
    }
    setIsCreating(false);
  };

  const toggleStaffAccess = async (account) => {
    const nextState = !account.disabled;
    const actionWord = nextState ? "BLOCK" : "RESTORE";
    if (
      !window.confirm(
        `Are you sure you want to ${actionWord} portal access for ${account.email}?`
      )
    ) {
      return;
    }

    await updateDoc(doc(db, "staff_accounts", account.id), {
      disabled: nextState
    });
    fetchData();
  };

  const removeStaffRecord = async (id, staffEmail) => {
    if (!window.confirm(`Delete ${staffEmail} from staff directory?`)) return;
    await deleteDoc(doc(db, "staff_accounts", id));
    fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl border shadow-sm self-start">
        <h3 className="font-bold text-slate-800 mb-4">Create Staff Account</h3>
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              STAFF NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-blue-500 text-sm"
              placeholder="e.g. Ramesh Kumar"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              DESIGNATION / ROLE
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-blue-500 text-sm bg-white"
            >
              <option>Lab Technician</option>
              <option>Front Desk Receptionist</option>
              <option>Phlebotomist (Sample Collector)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              LOGIN EMAIL (USERNAME)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-blue-500 text-sm"
              placeholder="desk1@balajilabs.in"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              ACCOUNT PASSWORD
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-blue-500 text-sm"
              placeholder="Minimum 6 characters"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-2.5 bg-slate-800 text-white font-bold rounded hover:bg-slate-900 transition disabled:opacity-50"
          >
            {isCreating ? "Creating Account..." : "Create Staff Account"}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-slate-600 font-bold">Staff Member</th>
              <th className="p-4 text-slate-600 font-bold">Credentials</th>
              <th className="p-4 text-slate-600 font-bold">Status</th>
              <th className="p-4 text-right text-slate-600 font-bold">
                Access Control
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffAccounts.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400">
                  No staff accounts created yet.
                </td>
              </tr>
            ) : (
              staffAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <span className="font-bold text-slate-800 block">
                      {account.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {account.role || "Staff"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-700 block">
                      {account.email}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Pwd: {account.password}
                    </span>
                  </td>
                  <td className="p-4">
                    {account.disabled ? (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded border border-red-200">
                        🚫 Blocked
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded border border-emerald-200">
                        ✅ Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => toggleStaffAccess(account)}
                      className={`px-3 py-1 rounded text-xs font-bold border transition ${
                        account.disabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      {account.disabled ? "Unblock Login" : "Block Login"}
                    </button>
                    <button
                      onClick={() =>
                        removeStaffRecord(account.id, account.email)
                      }
                      className="text-red-500 hover:text-red-700 font-bold text-xs px-2"
                    >
                      Delete
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
