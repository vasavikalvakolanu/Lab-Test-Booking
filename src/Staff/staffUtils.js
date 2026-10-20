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
              Allowed Portal Tabs
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.accessWalkIn}
                  onChange={(e) =>
                    setPerms({ ...perms, accessWalkIn: e.target.checked })
                  }
                />
                1. Walk-In Billing
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.accessCollections}
                  onChange={(e) =>
                    setPerms({ ...perms, accessCollections: e.target.checked })
                  }
                />
                2. Web Collections
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.accessLabDesk}
                  onChange={(e) =>
                    setPerms({ ...perms, accessLabDesk: e.target.checked })
                  }
                />
                3. Lab Result Desk
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perms.accessRecords}
                  onChange={(e) =>
                    setPerms({ ...perms, accessRecords: e.target.checked })
                  }
                />
                4. Past Records
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-2.5 bg-[#0f2d4a] text-white font-bold rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
          >
            {isCreating ? "Creating Account..." : "Create Staff Account"}
          </button>
        </form>
      </div>

      {/* RIGHT (8 Cols): Staff Permission Matrix */}
      <div className="lg:col-span-8 bg-white rounded-xl border shadow-sm overflow-hidden self-start">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Staff Access &amp; Permission Control Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Click any permission badge below to instantly enable or restrict
              access for that staff member
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {staffAccounts.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">
              No staff accounts created yet.
            </p>
          ) : (
            staffAccounts.map((account) => {
              const canPrint = account.canPrint !== false;
              const canWhatsapp = account.canWhatsapp !== false;
              const canDownload = Boolean(account.canDownload);
              const canUnlock = Boolean(account.canUnlock);

              const accessWalkIn = account.accessWalkIn !== false;
              const accessCollections = account.accessCollections !== false;
              const accessLabDesk = account.accessLabDesk !== false;
              const accessRecords = account.accessRecords !== false;

              return (
                <div
                  key={account.id}
                  className={`p-4 space-y-3 transition ${
                    account.disabled ? "bg-red-50/40" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-base">
                          {account.name}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold border">
                          {account.role || "Staff"}
                        </span>
                        {account.disabled ? (
                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded border border-red-200">
                            🚫 Login Blocked
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded border border-emerald-200">
                            ✅ Login Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Email: <b>{account.email}</b> | Password:{" "}
                        <span className="font-mono">{account.password}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStaffAccess(account)}
                        className={`px-3 py-1 rounded text-xs font-bold border transition ${
                          account.disabled
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {account.disabled ? "Unblock Login" : "Block Login"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          removeStaffRecord(account.id, account.email)
                        }
                        className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 border rounded bg-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Row 1: Report Actions (Print, WhatsApp, Download, Unlock) */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">
                      Report Actions:
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(account, "canPrint", canPrint)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        canPrint
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      🖨️ Print Report: {canPrint ? "Allowed" : "Restricted"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(account, "canWhatsapp", canWhatsapp)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        canWhatsapp
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      📲 WhatsApp Forward:{" "}
                      {canWhatsapp ? "Allowed" : "Restricted"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(account, "canDownload", canDownload)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        canDownload
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      📥 PDF Download: {canDownload ? "Allowed" : "Restricted"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(account, "canUnlock", canUnlock)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        canUnlock
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      🔓 Unlock &amp; Edit:{" "}
                      {canUnlock ? "Allowed" : "Restricted"}
                    </button>
                  </div>

                  {/* Row 2: Tab Access Restrictions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">
                      Portal Tabs:
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(account, "accessWalkIn", accessWalkIn)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        accessWalkIn
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      1. Walk-In: {accessWalkIn ? "ON" : "OFF"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(
                          account,
                          "accessCollections",
                          accessCollections
                        )
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        accessCollections
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      2. Collections: {accessCollections ? "ON" : "OFF"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(
                          account,
                          "accessLabDesk",
                          accessLabDesk
                        )
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        accessLabDesk
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      3. Lab Desk: {accessLabDesk ? "ON" : "OFF"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        togglePermission(
                          account,
                          "accessRecords",
                          accessRecords
                        )
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                        accessRecords
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                      }`}
                    >
                      4. Past Records: {accessRecords ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
