import React, { useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";

export function StaffManageTab({ staffAccounts, fetchData }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Lab Technician");
  const [isCreating, setIsCreating] = useState(false);

  // Default permissions for a new staff account
  const [perms, setPerms] = useState({
    canPrint: true,
    canWhatsapp: true,
    canDownload: false, // Off by default so staff print directly instead of downloading
    canUnlock: false,
    accessWalkIn: true,
    accessCollections: true,
    accessLabDesk: true,
    accessRecords: true
  });

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
        ...perms,
        createdAt: new Date().toISOString()
      });

      setEmail("");
      setPassword("");
      setName("");
      fetchData();
      alert("Staff account created with configured permissions!");
    } catch (error) {
      console.error("Error creating staff:", error);
      alert("Failed to create staff account. Email may already be registered.");
    }
    setIsCreating(false);
  };

  // Toggle any boolean permission field on an existing staff member
  const togglePermission = async (account, field, currentVal) => {
    await updateDoc(doc(db, "staff_accounts", account.id), {
      [field]: !currentVal
    });
    fetchData();
  };

  const toggleStaffAccess = async (account) => {
    const nextState = !account.disabled;
    const actionWord = nextState ? "BLOCK" : "RESTORE";
    if (
      !window.confirm(
        `Are you sure you want to ${actionWord} portal login for ${account.email}?`
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT (4 Cols): Create Staff Account + Initial Permissions */}
      <div className="lg:col-span-4 bg-white p-6 rounded-xl border shadow-sm self-start">
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

          {/* Report Action Permissions */}
          <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
            <span className="block text-[11px] font-extrabold text-slate-600 uppercase">
              Report &amp; Action Permissions
            </span>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={perms.canPrint}
                onChange={(e) =>
                  setPerms({ ...perms, canPrint: e.target.checked })
                }
              />
              🖨️ Allow Direct Printout of Reports
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={perms.canWhatsapp}
                onChange={(e) =>
                  setPerms({ ...perms, canWhatsapp: e.target.checked })
                }
              />
              📲 Allow WhatsApp Report Forwarding
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={perms.canDownload}
                onChange={(e) =>
                  setPerms({ ...perms, canDownload: e.target.checked })
                }
              />
              📥 Allow PDF File Download to Computer
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={perms.canUnlock}
                onChange={(e) =>
                  setPerms({ ...perms, canUnlock: e.target.checked })
                }
              />
              🔓 Allow Unlocking &amp; Modifying Final Reports
            </label>
          </div>

          {/* Tab Visibility Restrictions */}
          <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
            <span className="block text-[11px] font-extrabold text-slate-600 uppercase">
              Allowed
