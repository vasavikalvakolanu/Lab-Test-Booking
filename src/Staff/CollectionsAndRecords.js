import React from "react";
import { updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { generatePDF } from "./staffUtils";

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
                <td className="p-4 text-right">
                  <button
                    onClick={() => markSampleCollected(b)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold transition shadow-sm"
                  >
                    Verify & Collect Sample
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
  fetchData,
  onUnlockRecord
}) {
  const downloadFinalPDF = async (b) => {
    const docName = getDoctorName(b);
    const currentTests = expandTests(b.tests || b.cartItems || []);
    const currentResults = b.results || {};

    generatePDF(
      { ...b, doctorName: docName },
      currentTests,
      currentResults,
      true
    );

    const downloadLog = {
      by: userEmail,
      time: new Date().toISOString()
    };

    await updateDoc(doc(db, "bookings", b.id), {
      reportGenerated: true,
      reportGeneratedBy: b.reportGeneratedBy || userEmail,
      reportGeneratedAt: b.reportGeneratedAt || new Date().toISOString(),
      downloadLogs: arrayUnion(downloadLog),
      history: arrayUnion({
        action: "PDF Downloaded",
        by: userEmail,
        time: new Date().toISOString()
      })
    });

    fetchData();
  };

  const handleUnlock = async (b) => {
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
    <div className="overflow-hidden rounded border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 border-b border-slate-200">
          <tr>
            <th className="p-4 font-bold text-slate-600">ID / Date</th>
            <th className="p-4 font-bold text-slate-600">Patient</th>
            <th className="p-4 font-bold text-slate-600">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pastRecords.length === 0 ? (
            <tr>
              <td colSpan="4" className="p-8 text-center text-slate-400">
                No completed records yet.
              </td>
            </tr>
          ) : (
            pastRecords.map((b) => {
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
                    <span className="block font-bold">{b.clinicalId}</span>
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
                    {b.reportGenerated ? (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold border border-emerald-200">
                        ✅ Generated by {b.reportGeneratedBy}
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold border border-amber-200">
                        ⏳ Pending Generation
                      </span>
                    )}

                    {logList.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        <span
                          className="font-bold underline cursor-help"
                          title={downloadTooltip}
                        >
                          Downloaded {logList.length} time(s)
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleUnlock(b)}
                      className="bg-white border text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded font-bold transition"
                    >
                      Unlock & Modify
                    </button>
                    <button
                      onClick={() => downloadFinalPDF(b)}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-bold transition shadow-sm"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
