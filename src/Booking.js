import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

function CustomerPortal() {
  const [catalog, setCatalog] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  const [patient, setPatient] = useState({ name: "", phone: "", date: "", timeSlot: "", address: "" });
  const [collectionType, setCollectionType] = useState("home"); 
  
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSlots = [
    "06:00 AM - 07:00 AM", "07:00 AM - 08:00 AM", "08:00 AM - 09:00 AM", 
    "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
    "04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM", "06:00 PM - 07:00 PM"
  ];

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const catsSnap = await getDocs(collection(db, "testCategories"));
        const pkgsSnap = await getDocs(collection(db, "packages"));
        const couponsSnap = await getDocs(collection(db, "coupons"));

        setCoupons(couponsSnap.docs.map((d) => d.data()));

        let pkgs = [];
        pkgsSnap.docs.forEach((doc) => {
          pkgs.push({ ...doc.data(), isPackage: true });
        });

        const testMap = new Map();
        
        // 1. Get tests from regular categories
        catsSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.tests && data.tests.length > 0) {
            data.tests.forEach(t => testMap.set(t.name.toLowerCase(), { ...t, isPackage: false }));
          }
        });

        // 2. EXTRACT sub-tests from inside Packages (Fixes Issue 1)
        pkgsSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.tests && data.tests.length > 0) {
            data.tests.forEach(t => {
              // Only add if it doesn't already exist to prevent duplicates
              if (!testMap.has(t.name.toLowerCase())) {
                testMap.set(t.name.toLowerCase(), { ...t, isPackage: false });
              }
            });
          }
        });

        // Combine packages first, then all unique individual tests
        const allItems = [...pkgs, ...Array.from(testMap.values())];
        setCatalog(allItems);
      } catch (error) {
        console.error("Error fetching catalog:", error);
      }
    };
    fetchCatalog();
  }, []);

  const filteredCatalog = catalog.filter((item) => {
    if (!item || !item.name) return false;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const subtotal = cart.reduce((sum, item) => {
    const price = item.discountedPrice ? item.discountedPrice : item.price;
    return sum + Number(price);
  }, 0);

  const discountAmount = appliedPromo ? (subtotal * appliedPromo.discount) / 100 : 0;
  const deliveryFee = collectionType === "home" ? 200 : 0; 
  const grandTotal = subtotal - discountAmount + deliveryFee;

  const addToCart = (item) => {
    const exists = cart.find((cartItem) => cartItem.name === item.name);
    if (!exists) setCart([...cart, item]);
  };

  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, idx) => idx !== indexToRemove));
  };

  const applyPromoCode = () => {
    if (!promoInput) return;
    const found = coupons.find((c) => c.code.toUpperCase() === promoInput.toUpperCase());
    if (found) {
      setAppliedPromo(found);
      alert(`Promo code applied! ${found.discount}% off.`);
    } else {
      alert("Invalid or expired promo code.");
      setAppliedPromo(null);
    }
  };

  const handleBooking = async () => {
    if (!patient.name || !patient.phone || !patient.date || !patient.timeSlot) {
      return alert("Please fill in Name, Phone, Date, and Select a Time Slot.");
    }
    if (collectionType === "home" && !patient.address) {
      return alert("Please provide your address for the Home Visit.");
    }
    if (cart.length === 0) {
      return alert("Please select at least one lab test or package.");
    }

    setIsSubmitting(true);
    try {
      // Flatten packages so staff gets clinical entry fields, but keep cartItems for billing
      const flatTests = cart.flatMap(t => t.isPackage ? t.tests : [t]);

      await addDoc(collection(db, "bookings"), {
        name: patient.name,
        phone: patient.phone,
        date: patient.date,
        timeSlot: patient.timeSlot,
        address: collectionType === "home" ? patient.address : "",
        collectionType: collectionType,
        tests: flatTests,      // Used by staff for result entry
        cartItems: cart,       // Used for billing and receipts
        subtotal: subtotal,
        discount: discountAmount,
        couponUsed: appliedPromo ? appliedPromo.code : "",
        deliveryFee: deliveryFee,
        total: grandTotal,
        status: "pending", 
        createdAt: new Date().toISOString(),
        downloadLogs: [],
        history: []
      });
      
      alert("Booking Confirmed! Our team will contact you shortly.");
      setCart([]);
      setPatient({ name: "", phone: "", date: "", timeSlot: "", address: "" });
      setSearch("");
      setPromoInput("");
      setAppliedPromo(null);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Error saving booking. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Catalog */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">1. Select Lab Tests & Packages</h2>
          
          <div className="relative mb-6">
            <span className="absolute left-4 top-3.5 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search for tests or health profiles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-blue-400 rounded-lg outline-none focus:border-blue-600 text-slate-700"
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2">
            {catalog.length === 0 ? (
              <p className="text-slate-500 text-center py-10">Loading catalog...</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="text-slate-500 text-center py-10">No tests match your search.</p>
            ) : (
              filteredCatalog.map((item, idx) => {
                const price = item.discountedPrice ? item.discountedPrice : item.price;
                return (
                  <div key={idx} className={`flex justify-between items-center p-4 border rounded-lg transition ${item.isPackage ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-blue-300'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                        {item.isPackage && <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">Package</span>}
                      </div>
                      <p className="text-sm font-semibold text-emerald-600 mt-1">₹{price}</p>
                    </div>
                    <button 
                      onClick={() => addToCart(item)}
                      className="bg-blue-50 text-blue-700 font-bold border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
                    >
                      Add +
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Booking Form */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 self-start">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">2. Patient & Booking Details</h2>
          
          <div className="flex gap-4 mb-6">
            <button onClick={() => setCollectionType("home")} className={`flex-1 py-3 rounded-lg font-bold border-2 transition ${collectionType === "home" ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-500'}`}>🏠 Home Collection</button>
            <button onClick={() => setCollectionType("lab")} className={`flex-1 py-3 rounded-lg font-bold border-2 transition ${collectionType === "lab" ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-500'}`}>🏥 Lab Visit</button>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
              <input type="text" value={patient.name} onChange={(e) => setPatient({...patient, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                <input type="tel" value={patient.phone} onChange={(e) => setPatient({...patient, phone: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Date</label>
                <input type="date" value={patient.date} onChange={(e) => setPatient({...patient, date: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Time Slot</label>
              <select value={patient.timeSlot} onChange={(e) => setPatient({...patient, timeSlot: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white">
                <option value="">-- Select a Time Slot --</option>
                {timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>

            {collectionType === "home" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address for Home Visit</label>
                <textarea rows="2" value={patient.address} onChange={(e) => setPatient({...patient, address: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400"></textarea>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl p-5 mb-6 bg-slate-50">
            <h3 className="font-bold text-slate-800 mb-3">Booking Summary</h3>
            
            <div className="min-h-[60px] mb-4 border-b border-slate-200 pb-4 space-y-2">
              {cart.length === 0 ? <p className="text-sm text-slate-500 italic">No tests selected yet.</p> : cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 font-medium">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">₹{item.discountedPrice ? item.discountedPrice : item.price}</span>
                    <button onClick={() => removeFromCart(idx)} className="text-red-500 font-bold text-lg leading-none">&times;</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4 pb-4 border-b border-slate-200">
              <input type="text" placeholder="Promo Code" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded uppercase outline-none text-sm" />
              <button onClick={applyPromoCode} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold">Apply</button>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600 mb-4">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">₹{subtotal}</span></div>
              {appliedPromo && <div className="flex justify-between text-emerald-600 font-bold"><span>Discount ({appliedPromo.discount}%)</span><span>- ₹{discountAmount}</span></div>}
              {collectionType === "home" && <div className="flex justify-between"><span>Home Visit Fee</span><span className="font-medium">₹{deliveryFee}</span></div>}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-300">
              <span className="font-bold text-blue-800 text-lg">Grand Total</span>
              <span className="font-bold text-blue-800 text-2xl">₹{grandTotal}</span>
            </div>
          </div>

          <button onClick={handleBooking} disabled={isSubmitting} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg transition disabled:bg-slate-400 shadow-sm">
            {isSubmitting ? "Processing..." : "Confirm Booking"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default CustomerPortal;
