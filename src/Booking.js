import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import {
  DEFAULT_EXCLUSIVE_PACKAGES,
  parseCatalogFromSnapshots
} from "./Booking/bookingData";
import { ExclusivePackages } from "./Booking/ExclusivePackages";
import { TestSearchList } from "./Booking/TestSearchList";
import { CheckoutForm } from "./Booking/CheckoutForm";

function Booking() {
  const [exclusivePackages, setExclusivePackages] = useState(
    DEFAULT_EXCLUSIVE_PACKAGES
  );
  const [searchableItems, setSearchableItems] = useState([]);
  const [categoryNames, setCategoryNames] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [settings, setSettings] = useState({
    deliveryEnabled: true,
    homeVisitFee: 100,
    freeDeliveryThreshold: 999
  });

  const [cart, setCart] = useState([]);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [catsSnap, pkgsSnap, couponsSnap, settingsSnap] =
          await Promise.all([
            getDocs(collection(db, "testCategories")),
            getDocs(collection(db, "packages")),
            getDocs(collection(db, "coupons")),
            getDoc(doc(db, "settings", "general")).catch(() => null)
          ]);

        setCoupons(couponsSnap.docs.map((d) => d.data()));
        if (settingsSnap && settingsSnap.exists()) {
          setSettings((prev) => ({ ...prev, ...settingsSnap.data() }));
        }

        const parsed = parseCatalogFromSnapshots(catsSnap.docs, pkgsSnap.docs);
        setExclusivePackages(parsed.exclusivePackages);
        setSearchableItems(parsed.searchableItems);
        setCategoryNames(parsed.categoryNames);
      } catch (error) {
        console.error("Error fetching catalog:", error);
      }
    };

    fetchCatalog();
  }, []);

  const isInCart = (itemName) =>
    cart.some((c) => c.name.toLowerCase() === (itemName || "").toLowerCase());

  const toggleCartItem = (item) => {
    if (isInCart(item.name)) {
      setCart(
        cart.filter(
          (c) => c.name.toLowerCase() !== (item.name || "").toLowerCase()
        )
      );
    } else {
      const safePrice = Number(item.discountedPrice || item.price || 0);
      setCart([...cart, { ...item, price: safePrice }]);
    }
  };

  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans py-6 px-4 md:px-8">
      {/* Clinic Hero Header: Circular Logo + Full Clinic Title & Address */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border-t-4 border-[#0f2d4a] p-6 md:p-8 mb-8 text-center">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-4">
          {!logoError && (
            <img
              src="/logo.png"
              alt="Sri Balaji Clinical Laboratory Emblem"
              onError={() => setLogoError(true)}
              className="w-24 h-24 md:w-28 md:h-28 object-contain shrink-0"
            />
          )}
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-serif font-extrabold text-[#0f2d4a] tracking-wide leading-tight">
              SRI BALAJI
            </h1>
            <p className="text-sm md:text-lg font-extrabold text-[#0d5c85] tracking-[0.18em] uppercase mt-0.5">
              CLINICAL LABORATORY
            </p>
            <p className="text-slate-600 font-medium text-xs md:text-sm mt-1.5">
              Professional Lab Tests &amp; Home Sample Collection
            </p>
          </div>
        </div>

        {/* Ornamental Gold & Navy Divider */}
        <div className="max-w-2xl mx-auto flex items-center justify-center my-3">
          <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#0f2d4a] to-[#c59b46]"></div>
          <span className="text-[#c59b46] mx-2 text-xs leading-none">◆</span>
          <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-[#0f2d4a] to-[#c59b46]"></div>
        </div>

        <div className="inline-flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-full text-sm text-slate-700 mt-1">
          <span className="flex items-center gap-1.5">
            <span className="text-rose-500">📍</span>
            Sathiraju complex, near Ganapathi Bhojanam hotel, Main road,
            Kothapeta
          </span>
          <span className="hidden md:inline text-slate-300">|</span>
          <a
            href="tel:+919849923729"
            className="flex items-center gap-1.5 font-extrabold text-[#0f2d4a] hover:underline"
          >
            <span className="text-rose-500">📞</span> +91 9849923729
          </a>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <ExclusivePackages
            exclusivePackages={exclusivePackages}
            isInCart={isInCart}
            toggleCartItem={toggleCartItem}
          />
          <TestSearchList
            searchableItems={searchableItems}
            categoryNames={categoryNames}
            isInCart={isInCart}
            toggleCartItem={toggleCartItem}
          />
        </div>

        <div className="lg:col-span-5">
          <CheckoutForm
            cart={cart}
            setCart={setCart}
            removeFromCart={removeFromCart}
            coupons={coupons}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
}

export default Booking;
