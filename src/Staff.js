import React, { useEffect, useState, useCallback } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

import { buildCatalogMaps, expandToIndividualTests } from "./Staff/staffUtils";
import { WalkInTab } from "./Staff/WalkInTab";
import { CollectionsTab, PastRecordsTab } from "./Staff/CollectionsAndRecords";
import { LabDeskTab } from "./Staff/LabDeskTab";

function Staff() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [activeView, setActiveView] = useState("registration");
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [referrals, setReferrals] = useState([]);

  const [processingBooking, setProcessingBooking] = useState(null);
  const [startInEditMode, setStartInEditMode] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [snapBookings, snapCats, snapPkgs, snapRefs] = await Promise.all([
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "testCategories")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "referrals"))
      ]);

      const sortedBookings = snapBookings.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

      setBookings(sortedBookings);
      setCategories(snapCats.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPackages(snapPkgs.docs.map((d) => ({ id: d.id, ...d.data() })));
      setReferrals(snapRefs.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Data fetch error:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchData();
    });
    return () => unsubscribe();
  }, [fetchData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Authentication failed. Please check credentials.");
    }
  };

  const pendingBookings = bookings.filter(
    (b) => b.status === "pending" || !b.status
  );
  const processingBookings = bookings.filter((b) => b.status === "processing");
  const pastRecords = bookings.filter(
    (b) => b.status === "completed" || b.status === "done"
  );

  const { testMap, allCatalogItems } = buildCatalogMaps(categories, packages);

  const expandTests = useCallback(
    (rawItems) =>
      expandToIndividualTests(rawItems, packages, categories, testMap),
    [packages, categories, testMap]
  );

  const getDoctorName = (b) => {
    if (!b) return "Self Walk-in";
    const docId = b.doctorId || b.referralDoctorId;
    const matchedDoc = referrals.find((r) => r.id === docId);
    return matchedDoc ? matchedDoc.doctorName : "Self Walk-in";
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded border shadow-sm w-96"
        >
          <h2 className="text-xl font-bold text-emerald-600 mb-6 text-center">
            Staff Portal Login
          </h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Staff Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-emerald-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded outline-none focus:border-emerald-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded mt-2"
            >
              Login to Desk
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Sri Balaji Diagnostics</h1>
            <p className="text-xs text-slate-500 font-medium">
              Laboratory Staff Desk
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border">
              {user.email}
            </span>
            <button
              onClick={() => signOut(auth)}
              className="text-sm font-medium border px-4 py-1.5 rounded hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="bg-white rounded border shadow-sm p-6">
          <div className="flex flex-wrap gap-4 mb-6 border-b pb-4">
            <button
              onClick={() => {
                setActiveView("registration");
                setProcessingBooking(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeView === "registration"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              1. Front Desk Walk-In
            </button>
            <button
              onClick={() => {
                setActiveView("collections");
                setProcessingBooking(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded flex items-center ${
                activeView === "collections"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              2. Web Collections
              {pendingBookings.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                  {pendingBookings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView("processing")}
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeView === "processing"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              3. Lab Result Desk ({processingBookings.length})
            </button>
            <button
              onClick={() => {
                setActiveView("records");
                setProcessingBooking(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeView === "records"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              4. Past Records ({pastRecords.length})
            </button>
          </div>

          {activeView === "registration" && (
            <WalkInTab
              categories={categories}
              packages={packages}
              referrals={referrals}
              allCatalogItems={allCatalogItems}
              expandTests={expandTests}
              userEmail={user.email}
              fetchData={fetchData}
            />
          )}

          {activeView === "collections" && (
            <CollectionsTab
              pendingBookings={pendingBookings}
              expandTests={expandTests}
              userEmail={user.email}
              fetchData={fetchData}
            />
          )}

          {activeView === "processing" && (
            <LabDeskTab
              processingBookings={processingBookings}
              processingBooking={processingBooking}
              setProcessingBooking={setProcessingBooking}
              startInEditMode={startInEditMode}
              clearStartEditFlag={() => setStartInEditMode(false)}
              referrals={referrals}
              allCatalogItems={allCatalogItems}
              expandTests={expandTests}
              getDoctorName={getDoctorName}
              userEmail={user.email}
              fetchData={fetchData}
              onReportFinalized={() => setActiveView("records")}
            />
          )}

          {activeView === "records" && (
            <PastRecordsTab
              pastRecords={pastRecords}
              getDoctorName={getDoctorName}
              expandTests={expandTests}
              userEmail={user.email}
              fetchData={fetchData}
              onUnlockRecord={(unlockedBooking) => {
                setProcessingBooking(unlockedBooking);
                setStartInEditMode(true);
                setActiveView("processing");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Staff;
