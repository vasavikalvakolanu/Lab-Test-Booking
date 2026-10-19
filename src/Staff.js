import React, { useEffect, useState, useCallback } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

import {
  buildCatalogMaps,
  expandToIndividualTests,
  SriBalajiLogoSVG
} from "./Staff/staffUtils";
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
      const [snapBookings, snapCats, snapPkgs, snapRefs, snapStaff] =
        await Promise.all([
          getDocs(collection(db, "bookings")),
          getDocs(collection(db, "testCategories")),
          getDocs(collection(db, "packages")),
          getDocs(collection(db, "referrals")),
          getDocs(collection(db, "staff_accounts")).catch(() => null)
        ]);

      if (snapStaff && auth.currentUser) {
        const currentEmail = (auth.currentUser.email || "").toLowerCase();
        const matchedStaff = snapStaff.docs
          .map((d) => d.data())
          .find((s) => (s.email || "").toLowerCase() === currentEmail);

        if (matchedStaff && matchedStaff.disabled) {
          alert("Your staff account has been disabled by the Administrator.");
          await signOut(auth);
          return;
        }
      }

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
