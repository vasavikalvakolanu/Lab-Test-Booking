import React, { useState } from "react";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import {
  printPDFDirectly,
  generatePDF,
  printBillPDFDirectly
} from "./staffUtils";

export function CollectionsTab({
  pendingBookings,
  expandTests,
  userEmail,
  fetchData
}) {
  const markSampleCollected = async (b) => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const clinicalId = b.clinicalId || `SBD-${dateStr}-${randomId}`;

    const rawSource =
      b.cartItems && b.cartItems.length > 0 ? b.cartItems : b.tests || [];
    const flatTests = expandTests(rawSource);

    await updateDoc(doc(db, "bookings", b.id), {
      status: "processing",
      clinicalId: clinicalId,
      tests: flatTests,
      history: arrayUnion({
        action: "Sample Collected",
        by: userEmail,
        time: new Date().toISOString()
      })
    });
    fetchData();
  };

  return (
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
            <tr>
              <td colSpan="4" className="p-8 text-center text-slate-400">
                No pending web bookings.
              </td>
            </tr>
          ) : (
            pendingBookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="p-4 text-slate-600">
                  <span className="block font-bold">{b.date}</span>
                  {b.timeSlot}
                </td>
                <td className="p-4 font-semibold text-slate-800">
                  {b.name}
                  <span className="text-xs font-normal text-slate-500 block">
                    {b.phone} |{" "}
                    {b.collectionType === "home" ? "Home Visit" : "Lab Visit"}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-600 max-w-xs truncate">
                  {(b.cartItems || b.tests || []).map((t) => t.name).join(", ")}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => printBillPDFDirectly(b)}
                    className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded font-bold text-xs hover:bg-slate-50"
                  >
                    🖨️ Print Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => markSampleCollected(b)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold transition shadow-sm"
                  >
                    Verify &amp; Collect Sample
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PastRecordsTab({
  pastRecords,
  getDoctorName,
  expandTests,
  userEmail,
  staffPermissions,
  fetchData,
  onUnlockRecord
}) {
  const [recordSearch, setRecordSearch] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [useLetterhead, setUseLetterhead] = useState(true);

  const perms = staffPermissions || {
    canPrint: true,
    canWhatsapp: true,
    canDownload: false,
    canUnlock: false
  };

  const filteredRecords = (pastRecords || []).filter((b) => {
    const q = recordSearch.toLowerCase();
    const matchText =
      !q ||
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q)) ||
      (b.clinicalId && b.clinicalId.toLowerCase().includes(q));
    const matchDate = !recordDate || b.date === recordDate;
    return matchText && matchDate;
  });

  // DIRECT PRINTOUT HANDLER (NO FILE DOWNLOAD)
  const handlePrintReport = async (b) => {
    if (!perms.canPrint) {
      return alert(
        "Access Restricted: Your account does not have permission to print reports. Please contact the Administrator."
      );
    }

    if (Number(b.balanceDue || 0) > 0) {
      const proceed = window.confirm(
        `⚠️ UNPAID BALANCE ALERT: This patient still has a pending balance of ₹${b.balanceDue}.\n\nDo you still want to print the final report?`
      );
      if (!proceed) return;
    }

    const docName = getDoctorName(b);
    const currentTests = expandTests(b.tests || b.cartItems || []);
    const currentResults = b.results || {};

    printPDFDirectly(
      { ...b, doctorName: docName },
      currentTests,
      currentResults,
      useLetterhead
    );

    const logEntry = {
      by: `${userEmail} (Printed)`,
      time: new Date().toISOString()
    };

    await updateDoc(doc(db, "bookings", b.id), {
      reportGenerated: true,
      reportGeneratedBy: b.reportGeneratedBy || userEmail,
      reportGeneratedAt: b.reportGeneratedAt || new Date().toISOString(),
      downloadLogs: arrayUnion(logEntry),
      history: arrayUnion({
        action: "Report Printed Directly from Portal",
        by: userEmail,
        time: new Date().toISOString()
      })
    });

    fetchData();
  };

  // WHATSAPP FORWARD HANDLER (PERMISSION GUARDED + AUDIT LOGGED)
  const handleWhatsappForward = async (b) => {
    if (!perms.canWhatsapp) {
      return alert(
        "Access Restricted: Your account is not authorized to forward reports via WhatsApp."
      );
    }

    if (!b.phone) {
      return alert("No phone number recorded for this patient.");
    }

    const cleanPhone = b.phone.replace(/\D/g, "");
    const testsSummary = (b.cartItems || b.tests || [])
      .map((t) => t.name)
      .join(", ");
    const msg = `Hello *${b.name}*,\nYour clinical lab report at *Sri Balaji Clinical Laboratory* is ready.\n\n*Clinical ID:* ${b.clinicalId}\n*Date:* ${b.date}\n*Tests:* ${testsSummary}\n*Balance Due:* ₹${b.balanceDue || 0}\n\nThank you for choosing Sri Balaji Clinical Laboratory, Kothapeta.`;

    window.open(
      `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );

    await updateDoc(doc(db, "bookings", b.id), {
      history: arrayUnion({
        action: `Forwarded Report Notification via WhatsApp to ${cleanPhone}`,
        by: userEmail,
        time: new Date().toISOString()
      })
    });

    fetchData();
  };

  // OPTIONAL DOWNLOAD HANDLER (ONLY IF ADMIN EXPLICITLY ALLOWS DOWNLOAD)
  const handleDownloadPDF = async (b) => {
    if (!perms.canDownload) {
      return alert(
        "Access Restricted: Direct downloading is disabled for your account. Please use 'Print Report'."
      );
    }

    const docName = getDoctorName(b);
    const currentTests = expandTests(b.tests || b.cartItems || []);
    const currentResults = b.results || {};

    generatePDF(
      { ...b, doctorName: docName },
      currentTests,
      currentResults,
      useLetterhead
    );

    const downloadLog = {
      by: `${userEmail} (Downloaded)`,
      time: new Date().toISOString()
    };

    await updateDoc(doc(db, "bookings", b.id), {
      reportGenerated: true,
      reportGeneratedBy: b.reportGeneratedBy || userEmail,
      reportGeneratedAt: b.reportGeneratedAt || new Date().toISOString(),
      downloadLogs: arrayUnion(downloadLog),
      history: arrayUnion({
        action: "PDF File Downloaded to Computer",
        by: userEmail,
        time: new Date().toISOString()
      })
    });

    fetchData();
  };

  const handleUnlock = async (b) => {
    if (!perms.canUnlock) {
      return alert(
        "Access Restricted: Only authorized accounts can unlock and modify finalized reports."
      );
    }

    const msg =
      "Unlock this record? This will move it back to the Lab Desk so you can modify patient details, tests, billing, and results.";
    if (!window.confirm(msg)) return;

    const unpackedTests = expandTests(b.tests || b.cartItems || []);

    await updateDoc(doc(db, "bookings", b.id), {
      status: "processing",
      tests: unpackedTests,
      history: arrayUnion({
        action: "Record Unlocked for Modification",
        by: userEmail,
        time: new Date().toISOString()
      })
    });

    const unlockedBooking = {
      ...b,
      status: "processing",
      tests: unpackedTests
    };
    onUnlockRecord(unlockedBooking);
    fetchData();
  };

  return (
    <div>
      {/* Search, Date Filter & Letterhead Print Mode Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-slate-50 p-3 rounded-lg border">
        <input
          type="text"
          placeholder="Search by Patient Name, Phone, or Clinical ID (SBD-...)..."
          value={recordSearch}
          onChange={(e) => setRecordSearch(e.target.value)}
          className="flex-1 min-w-[220px] p-2 border rounded text-sm outline-none focus:border-emerald-500 bg-white"
        />
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="p-2 border rounded text-sm outline-none focus:border-emerald-500 bg-white"
        />
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3 py-2 rounded border cursor-pointer">
          <input
            type="checkbox"
            checked={useLetterhead}
            onChange={(e) => setUseLetterhead(e.target.checked)}
          />
          Include Digital Letterhead
        </label>
        {(recordSearch || recordDate) && (
          <button
            type="button"
            onClick={() => {
              setRecordSearch("");
              setRecordDate("");
            }}
            className="px-3 py-2 bg-white border rounded text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="p-4 font-bold text-slate-600">ID / Date</th>
              <th className="p-4 font-bold text-slate-600">Patient</th>
              <th className="p-4 font-bold text-slate-600">Billing</th>
              <th className="p-4 font-bold text-slate-600">Print Status</th>
              <th className="p-4 text-right">Authorized Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No matching completed records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((b) => {
                const logList = b.downloadLogs || [];
                const downloadTooltip = logList
                  .map(
                    (log) =>
                      `${log.by} at ${new Date(log.time).toLocaleString()}`
                  )
                  .join(" | ");

                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-slate-500">
                      <span className="block font-bold text-slate-800">
                        {b.clinicalId}
                      </span>
                      {b.date}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {b.name}
                      <span className="block text-xs font-normal text-slate-500">
                        {b.age || "N/A"}Y / {b.gender || "N/A"} |{" "}
                        {b.phone || "N/A"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">
                        ₹{b.total || 0}
                      </span>
                      {Number(b.balanceDue || 0) > 0 ? (
                        <span className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          Due: ₹{b.balanceDue}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700">
                          Paid in Full
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {b.reportGenerated ? (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold border border-emerald-200">
                          ✅ Printed by {b.reportGeneratedBy}
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold border border-amber-200">
                          ⏳ Ready to Print
                        </span>
                      )}

                      {logList.length > 0 && (
                        <div className="mt-1.5 text-xs text-slate-500">
                          <span
                            className="font-bold underline cursor-help"
                            title={downloadTooltip}
                          >
                            Printed/Issued {logList.length} time(s)
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => printBillPDFDirectly(b)}
                          className="bg-white border text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 rounded text-xs font-bold transition"
                        >
                          🧾 Print Bill
                        </button>

                        {perms.canWhatsapp && b.phone && (
                          <button
                            type="button"
                            onClick={() => handleWhatsappForward(b)}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded text-xs font-bold transition"
                          >
                            📲 WhatsApp
                          </button>
                        )}

                        {perms.canUnlock && (
                          <button
                            type="button"
                            onClick={() => handleUnlock(b)}
                            className="bg-white border text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded text-xs font-bold transition"
                          >
                            🔓 Unlock
                          </button>
                        )}

                        {perms.canPrint && (
                          <button
                            type="button"
                            onClick={() => handlePrintReport(b)}
                            className="bg-[#0f2d4a] hover:bg-slate-900 text-white px-3.5 py-1.5 rounded text-xs font-bold transition shadow-sm"
                          >
                            🖨️ Print Report
                          </button>
                        )}

                        {perms.canDownload && (
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(b)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-xs font-bold transition"
                          >
                            📥 Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
