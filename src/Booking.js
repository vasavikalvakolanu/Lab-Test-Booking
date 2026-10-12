import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

function CustomerPortal() {
  const [packages, setPackages] = useState([]);
  const [individualTests, setIndividualTests] = useState([]);
  const [coupons, setCoupons] = useState([]);
  
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  // Booking State
  const [patient, setPatient] = useState({ name: "", phone: "", date: "", timeSlot: "", address: "" });
  const [collectionType, setCollectionType] = useState("home"); // "home" or "lab"
  
  // Promo Code Engine
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

        const exclusivePkgs = [];
        const routinePkgs = [];

        // 1. Smart Filtering: Separate Big Packages from Routine Packages
        pkgsSnap.docs.forEach((doc) => {
          const data = doc.data();
          const nameLower = (data.name || "").toLowerCase();
          
          // Words that define a routine, normal package
          const isRoutine = 
            nameLower.includes("cbc") || 
            nameLower.includes("blood count") || 
            nameLower.includes("lipid") || 
            nameLower.includes("liver") || 
            nameLower.includes("thyroid") || 
            nameLower.includes("urine") || 
            nameLower.includes("stool") || 
            nameLower.includes("renal") || 
            nameLower.includes("kidney") || 
            nameLower.includes("profile") ||
            nameLower.includes("analysis") ||
            nameLower.includes("examination");

          let isExclusive = false;
          
          // Words that define a major health checkup
          if (nameLower.includes("checkup") || nameLower.includes("body") || nameLower.includes("health") || nameLower.includes("master") || nameLower.includes("comprehensive") || nameLower.includes("exclusive") || nameLower.includes("basic")) {
            isExclusive = true;
          } else if (isRoutine) {
            isExclusive = false;
          } else if ((data.price || data.discountedPrice) >= 800) {
            isExclusive = true; // Fallback: expensive items are usually big packages
          } else {
            isExclusive = false;
          }

          if (isExclusive) {
            exclusivePkgs.push({ ...data, isPackage: true });
          } else {
            routinePkgs.push({ ...data, isPackage: true });
          }
        });

        // Set ONLY the exclusive checkups to the Big Cards section
        setPackages(exclusivePkgs);

        // 2. Build the Universal Search Map
        const searchItemsMap = new Map();

        // Add routine packages (CBC, Lipid, etc.) strictly to the search bar
        routinePkgs.forEach(p => searchItemsMap.set(p.name.toLowerCase(), p));
        
        // Add exclusive packages to search as well, just in case
        exclusivePkgs.forEach(p => searchItemsMap.set(p.name.toLowerCase(), p));

        // Add individual tests from test Categories
        catsSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.tests && data.tests.length > 0) {
            data.tests.forEach(t => searchItemsMap.set(t.name.toLowerCase(), { ...t, isPackage: false }));
          }
        });

        // FORCE EXTRACT: Pull every single sub-parameter (Total Cholesterol, Haemoglobin) out of ALL packages and make them individually searchable
        pkgsSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.tests && data.tests.length > 0) {
            data.tests.forEach(t => {
              if (!searchItemsMap.has(t.name.toLowerCase())) {
                searchItemsMap.set(t.name.toLowerCase(), { ...t, isPackage: false });
              }
            });
          }
        });

        setIndividualTests(Array.from(searchItemsMap.values()));
      } catch (error) {
        console.error("Error fetching catalog:", error);
      }
    };
    fetchCatalog();
  }, []);

  // Search Logic
  const searchResults = search ? individualTests.filter((item) => {
    if (!item || !item.name) return false;
    return item.name.toLowerCase().includes(search.toLowerCase());
  }) : [];

  // Math Logic for Cart, Discount, and Delivery
  const subtotal = cart.reduce((sum, item) => {
    const price = item.discountedPrice ? item.discountedPrice : item.price;
    return sum + Number(price);
  }, 0);

  const discountAmount = appliedPromo ? (subtotal * appliedPromo.discount) / 100 : 0;
  const deliveryFee = collectionType === "home" ? 200 : 0; // Flat fee for home visits
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
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      
      {/* HEADER */}
      <div className="bg-white py-8 border-b-4 border-blue-600 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-extrabold text-blue-800 mb-2 tracking-tight">Sri Balaji Diagnostics</h1>
          <p className="text-slate-600 font-medium text-lg">Professional Lab Tests & Home Collection</p>
          
          <div className="mt-6 inline-flex flex-col md:flex-row items-center gap-4 bg-slate-50 border border-slate-200 px-6 py-3 rounded-full text-sm font-medium text-slate-700">
            <span className="flex items-center"><span className="text-rose-500 mr-2 text-lg">📍</span> Sathiraju complex, near Ganapathi Bhojanam hotel, Main road, Kothapeta</span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="flex items-center font-bold text-blue-700"><span className="text-rose-500 mr-2 text-lg">📞</span> +91 9849923729</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Catalog (8 columns wide) */}
        <div className="xl:col-span-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
          
          {/* Universal Search Bar */}
          <div className="relative mb-10">
            <span className="absolute left-5 top-4 text-xl">🔍</span>
            <input
              type="text"
              placeholder="Search for individual tests (e.g. Urine Sugar, Platelet Count) or packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 border-2 border-blue-200 rounded-full outline-none focus:border-blue-600 text-slate-700 text-lg shadow-inner transition"
            />
          </div>

          {/* Conditional Rendering: Show Search Results OR Show Big Packages */}
          {search ? (
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Search Results</h3>
              <div className="space-y-3">
                {searchResults.length === 0 ? (
                  <p className="text-slate-500 italic py-4">No individual tests or packages match your search.</p>
                ) : (
                  searchResults.map((item, idx) => {
                    const price = item.discountedPrice ? item.discountedPrice : item.price;
                    return (
                      <div key={idx} className={`flex justify-between items-center p-4 border rounded-xl transition ${item.isPackage ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-lg">{item.name}</h4>
                            {item.isPackage && <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">Package</span>}
                          </div>
                          <p className="text-lg font-bold text-emerald-600 mt-1">₹{price}</p>
                        </div>
                        <button 
                          onClick={() => addToCart(item)}
                          className="bg-blue-50 text-blue-700 font-bold border border-blue-200 px-6 py-3 rounded-lg hover:bg-blue-600 hover:text-white transition shadow-sm"
                        >
                          Add +
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-purple-50/50 p-6 md:p-8 rounded-2xl border border-purple-100">
              <h2 className="text-2xl font-bold text-purple-900 mb-6 flex items-center">✨ Exclusive Health Packages</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packages.length === 0 ? <p className="text-slate-500 italic">No exclusive packages found.</p> : packages.map((pkg, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition overflow-hidden relative flex flex-col">
                    
                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-lg uppercase tracking-wider">
                      Special Offer
                    </div>
                    
                    <div className="p-6 flex-1">
                      <h3 className="text-xl font-bold text-purple-900 mb-2 pr-16">{pkg.name}</h3>
                      <span className="inline-block bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide mb-4">No Extra Coupons</span>
                      
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Package Includes:</p>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {(pkg.tests || []).map((t, i) => (
                          <span key={i} className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded text-xs font-medium">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Package Price</p>
                        <p className="text-2xl font-extrabold text-emerald-600">₹{pkg.discountedPrice || pkg.price}</p>
                      </div>
                      <button onClick={() => addToCart(pkg)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-lg shadow-sm transition">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Booking Form (4 columns wide) */}
        <div className="xl:col-span-4 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 self-start sticky top-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Patient Details</h2>
          
          <div className="flex gap-3 mb-6 bg-slate-100 p-1.5 rounded-xl">
            <button onClick={() => setCollectionType("home")} className={`flex-1 py-2.5 rounded-lg font-bold transition text-sm ${collectionType === "home" ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>🏠 Home Collection</button>
            <button onClick={() => setCollectionType("lab")} className={`flex-1 py-2.5 rounded-lg font-bold transition text-sm ${collectionType === "lab" ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>🏥 Lab Visit</button>
          </div>

          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
              <input type="text" placeholder="Enter patient name" value={patient.name} onChange={(e) => setPatient({...patient, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">WhatsApp Number</label>
              <input type="tel" placeholder="10-digit number" value={patient.phone} onChange={(e) => setPatient({...patient, phone: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Preferred Date</label>
                <input type="date" value={patient.date} onChange={(e) => setPatient({...patient, date: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Time Slot</label>
                <select value={patient.timeSlot} onChange={(e) => setPatient({...patient, timeSlot: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition text-sm">
                  <option value="">Select Time</option>
                  {timeSlots.map(slot => <option key={slot} value={slot}>{slot.split(" - ")[0]}</option>)}
                </select>
              </div>
            </div>

            {collectionType === "home" && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Complete Address</label>
                <textarea rows="2" placeholder="House no, Street, Landmark" value={patient.address} onChange={(e) => setPatient({...patient, address: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"></textarea>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-6 mb-6">
            <h3 className="font-bold text-slate-800 mb-4 text-lg">Booking Summary</h3>
            
            <div className="min-h-[40px] mb-6 space-y-3">
              {cart.length === 0 ? <p className="text-sm text-slate-400 italic">No tests selected yet.</p> : cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-700 font-medium pr-4">{item.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-slate-800">₹{item.discountedPrice || item.price}</span>
                    <button onClick={() => removeFromCart(idx)} className="text-rose-500 hover:text-rose-700 font-bold text-lg leading-none bg-rose-50 hover:bg-rose-100 w-6 h-6 rounded-full flex items-center justify-center transition">&times;</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
              <input type="text" placeholder="Got a Promo Code?" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} className="flex-1 p-3 border border-slate-200 rounded-lg uppercase outline-none focus:border-blue-500 text-sm bg-slate-50 focus:bg-white transition" />
              <button onClick={applyPromoCode} className="bg-slate-800 hover:bg-slate-900 text-white px-5 rounded-lg text-sm font-bold transition">Apply</button>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-bold text-slate-800">₹{subtotal}</span></div>
              {appliedPromo && <div className="flex justify-between text-emerald-600 font-bold"><span>Discount ({appliedPromo.discount}%)</span><span>- ₹{discountAmount}</span></div>}
              {collectionType === "home" && <div className="flex justify-between"><span>Home Visit Fee</span><span className="font-bold text-slate-800">₹{deliveryFee}</span></div>}
              
              <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200">
                <span className="font-bold text-blue-900 text-lg">Total Amount</span>
                <span className="font-extrabold text-blue-700 text-2xl">₹{grandTotal}</span>
              </div>
            </div>
          </div>

          <button onClick={handleBooking} disabled={isSubmitting} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl transition disabled:bg-slate-400 shadow-lg shadow-blue-200">
            {isSubmitting ? "Processing Request..." : "Confirm Booking"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default CustomerPortal;
