import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

function CustomerPortal() {
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  const [patient, setPatient] = useState({ name: "", phone: "", date: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        // 1. Fetch from the NEW database structure we created for Admin
        const catsSnap = await getDocs(collection(db, "testCategories"));
        const pkgsSnap = await getDocs(collection(db, "packages"));

        // 2. Extract and combine all individual tests and packages into one list
        let allItems = [];
        
        catsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.tests && data.tests.length > 0) {
            allItems = [...allItems, ...data.tests];
          }
        });

        pkgsSnap.docs.forEach(doc => {
          const data = doc.data();
          allItems.push({ ...data, isPackage: true });
        });

        setCatalog(allItems);
      } catch (error) {
        console.error("Error fetching catalog:", error);
      }
    };
    
    fetchCatalog();
  }, []);

  // Filter based on search input
  const filteredCatalog = catalog.filter(item => {
    if (!item || !item.name) return false;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate cart total
  const totalAmount = cart.reduce((sum, item) => {
    const price = item.discountedPrice || item.price || 0;
    return sum + Number(price);
  }, 0);

  const addToCart = (item) => {
    const exists = cart.find(cartItem => cartItem.name === item.name);
    if (!exists) setCart([...cart, item]);
  };

  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, idx) => idx !== indexToRemove));
  };

  const handleBooking = async () => {
    if (!patient.name || !patient.phone || !patient.date) {
      return alert("Please fill in your Name, Phone Number, and Preferred Date.");
    }
    if (cart.length === 0) {
      return alert("Please select at least one lab test.");
    }

    setIsSubmitting(true);
    try {
      // 3. Save the booking in the exact format the NEW Staff Portal expects
      await addDoc(collection(db, "bookings"), {
        name: patient.name,
        phone: patient.phone,
        date: patient.date,
        tests: cart,
        cartItems: cart, // Fallback for safety
        subtotal: totalAmount,
        total: totalAmount,
        status: "pending", // Triggers it to show in Staff "Web Collections"
        collectionType: "lab", 
        timeSlot: "Web Booking",
        createdAt: new Date().toISOString()
      });
      
      alert("Booking Confirmed! Our staff will contact you shortly.");
      setCart([]);
      setPatient({ name: "", phone: "", date: "" });
      setSearch("");
    } catch (error) {
      console.error("Booking error:", error);
      alert("Error saving booking. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Test Selection (Matches your screenshot) */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">1. Select Lab Tests</h2>
          
          <div className="relative mb-6">
            <span className="absolute left-4 top-3.5 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search for a test (e.g., Blood Sugar)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-blue-400 rounded-lg outline-none focus:border-blue-600 text-slate-700"
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
            {catalog.length === 0 ? (
              <p className="text-slate-500 text-center py-10">Loading catalog...</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="text-slate-500 text-center py-10">No tests match your search.</p>
            ) : (
              filteredCatalog.map((item, idx) => {
                const price = item.discountedPrice || item.price;
                return (
                  <div key={idx} className="flex justify-between items-center p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition">
                    <div>
                      <h4 className="font-bold text-slate-800">{item.name}</h4>
                      <p className="text-sm font-semibold text-emerald-600">₹{price}</p>
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

        {/* RIGHT COLUMN: Patient Details & Cart (Matches your screenshot) */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 self-start">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">2. Patient Details</h2>
          
          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="Enter patient name"
                value={patient.name}
                onChange={(e) => setPatient({...patient, name: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number (WhatsApp)</label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={patient.phone}
                onChange={(e) => setPatient({...patient, phone: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preferred Date</label>
              <input
                type="date"
                value={patient.date}
                onChange={(e) => setPatient({...patient, date: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-400 text-slate-600"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 mb-6 bg-slate-50">
            <h3 className="font-bold text-slate-800 mb-3">Booking Summary</h3>
            
            <div className="min-h-[60px] mb-4 border-b border-slate-200 pb-4">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No tests selected yet.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 font-medium">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">₹{item.discountedPrice || item.price}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700 font-bold text-lg leading-none">&times;</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800 text-lg">Total Amount</span>
              <span className="font-bold text-blue-800 text-xl">₹{totalAmount}</span>
            </div>
          </div>

          <button 
            onClick={handleBooking}
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg transition disabled:bg-slate-400 shadow-sm"
          >
            {isSubmitting ? "Processing..." : "Confirm Booking"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default CustomerPortal;
