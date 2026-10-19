import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { TIME_SLOTS } from "./bookingData";

export function CheckoutForm({
  cart,
  setCart,
  removeFromCart,
  coupons,
  settings
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    date: todayStr,
    timeSlot: "",
    address: ""
  });
  const [collectionType, setCollectionType] = useState("home");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.discountedPrice || item.price || 0),
    0
  );

  const discountableSubtotal = cart.reduce((sum, item) => {
    if (item.noExtraCoupons || item.isExclusive) return sum;
    return sum + Number(item.discountedPrice || item.price || 0);
  }, 0);

  const discountAmount = appliedPromo
    ? Math.round(
        (discountableSubtotal * Number(appliedPromo.discount || 0)) / 100
      )
    : 0;

  const baseHomeFee = Number((settings && settings.homeVisitFee) || 100);
  const freeThreshold = Number(
    (settings && settings.freeDeliveryThreshold) || 999
  );
  const deliveryFee =
    collectionType === "home"
      ? subtotal >= freeThreshold
        ? 0
        : baseHomeFee
      : 0;

  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  const applyPromoCode = () => {
    if (!promoInput.trim()) return;
    const found = (coupons || []).find(
      (c) => (c.code || "").toUpperCase() === promoInput.trim().toUpperCase()
    );
    if (!found) {
      alert("Invalid or expired promo code.");
      setAppliedPromo(null);
      return;
    }
    if (discountableSubtotal === 0 && cart.length > 0) {
      alert(
        "Exclusive Health Packages are already discounted and marked 'No Extra Coupons'. Promo codes apply to individual tests and routine profiles."
      );
      return;
    }
    setAppliedPromo(found);
  };

  const handleBooking = async () => {
    const cleanPhone = (patient.phone || "").replace(/\D/g, "");
    if (!patient.name.trim()) {
      return alert("Please enter the patient's full name.");
    }
    if (cleanPhone.length !== 10) {
      return alert("Please enter a valid 10-digit WhatsApp mobile number.");
    }
    if (!patient.age || Number(patient.age) <= 0) {
      return alert("Please enter the patient's age.");
    }
    if (!patient.date || !patient.timeSlot) {
      return alert("Please select a preferred date and time slot.");
    }
    if (collectionType === "home" && !patient.address.trim()) {
      return alert("Please enter your complete address for Home Collection.");
    }
    if (cart.length === 0) {
      return alert("Please select at least one test or health package.");
    }

    setIsSubmitting(true);
    try {
      const dateCode = patient.date.replace(/-/g, "");
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `WEB-${dateCode}-${randCode}`;

      const flatTests = cart.flatMap((t) =>
        t.isPackage && t.tests && t.tests.length > 0
          ? t.tests.map((sub) => ({ ...sub, parentPackage: t.name }))
          : [t]
      );

      const bookingPayload = {
        bookingRef,
        name: patient.name.trim(),
        phone: cleanPhone,
        age: patient.age,
        gender: patient.gender,
        date: patient.date,
        timeSlot: patient.timeSlot,
        address: collectionType === "home" ? patient.address.trim() : "",
        collectionType,
        tests: flatTests,
        cartItems: cart,
        subtotal,
        discount: discountAmount,
        couponUsed: appliedPromo ? appliedPromo.code : "",
        deliveryFee,
        total: grandTotal,
        balanceDue: grandTotal,
        cashPaid: 0,
        upiPaid: 0,
        status: "pending",
        createdAt: new Date().toISOString(),
        downloadLogs: [],
        history: [
          {
            action: "Online Booking Created by Patient",
            by: "Customer Portal",
            time: new Date().toISOString()
          }
        ]
      };

      await addDoc(collection(db, "bookings"), bookingPayload);

      setConfirmedBooking(bookingPayload);
      setCart([]);
      setPatient({
        name: "",
        phone: "",
        age: "",
        gender: "Male",
        date: todayStr,
        timeSlot: "",
        address: ""
      });
      setPromoInput("");
      setAppliedPromo(null);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Error saving booking. Please check your connection and try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 self-start sticky top-6">
      <h2 className="text-2xl font-extrabold text-[#153e90] mb-5">
        2. Patient Details
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-100 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => setCollectionType("home")}
          className={`py-2.5 rounded-lg font-bold text-sm transition ${
            collectionType === "home"
              ? "bg-white text-[#153e90] shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          🏠 Home Collection
        </button>
        <button
          type="button"
          onClick={() => setCollectionType("lab")}
          className={`py-2.5 rounded-lg font-bold text-sm transition ${
            collectionType === "lab"
              ? "bg-white text-[#153e90] shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          🏥 Lab Visit
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
            Full Name *
          </label>
          <input
            type="text"
            placeholder="Enter patient name"
            value={patient.name}
            onChange={(e) => setPatient({ ...patient, name: e.target.value })}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              WhatsApp Number *
            </label>
            <input
              type="tel"
              maxLength="10"
              placeholder="10-digit mobile number"
              value={patient.phone}
              onChange={(e) =>
                setPatient({ ...patient, phone: e.target.value })
              }
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Age (Yrs) *
              </label>
              <input
                type="number"
                placeholder="Age"
                value={patient.age}
                onChange={(e) =>
                  setPatient({ ...patient, age: e.target.value })
                }
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Gender *
              </label>
              <select
                value={patient.gender}
                onChange={(e) =>
                  setPatient({ ...patient, gender: e.target.value })
                }
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Child</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Preferred Date *
            </label>
            <input
              type="date"
              min={todayStr}
              value={patient.date}
              onChange={(e) => setPatient({ ...patient, date: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Preferred Time Slot *
            </label>
            <select
              value={patient.timeSlot}
              onChange={(e) =>
                setPatient({ ...patient, timeSlot: e.target.value })
              }
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Select Time Slot</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        {collectionType === "home" && (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Home Collection Address *
            </label>
            <textarea
              rows="2"
              placeholder="Door No, Street Name, Landmark, Area..."
              value={patient.address}
              onChange={(e) =>
                setPatient({ ...patient, address: e.target.value })
              }
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
            />
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-extrabold text-slate-800">Booking Summary</h3>
          <span className="text-xs font-bold text-slate-500">
            {cart.length} Item(s)
          </span>
        </div>

        <div className="space-y-2.5 mb-4 border-b border-slate-200 pb-4 max-h-48 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              No tests selected yet.
            </p>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-slate-100"
              >
                <div className="pr-2">
                  <span className="font-semibold text-slate-800 block">
                    {item.name}
                  </span>
                  {item.noExtraCoupons && (
                    <span className="text-[10px] text-orange-700 font-bold">
                      Special Offer (No Extra Coupon)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-bold text-slate-900">
                    ₹{Number(item.discountedPrice || item.price || 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(idx)}
                    className="text-rose-500 hover:bg-rose-50 w-6 h-6 rounded-full font-bold flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Promo Code (if any)"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            className="flex-1 p-2.5 border border-slate-300 rounded-lg uppercase text-xs font-bold outline-none focus:border-blue-500 bg-white"
          />
          <button
            type="button"
            onClick={applyPromoCode}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold transition"
          >
            Apply
          </button>
        </div>

        <div className="space-y-1.5 text-sm text-slate-600 mb-3">
          <div className="flex justify-between">
            <span>Tests Subtotal</span>
            <span className="font-bold text-slate-800">₹{subtotal}</span>
          </div>
          {appliedPromo && discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Promo Discount ({appliedPromo.code})</span>
              <span>- ₹{discountAmount}</span>
            </div>
          )}
          {collectionType === "home" && (
            <div className="flex justify-between">
              <span>Home Collection Fee</span>
              <span className="font-bold text-slate-800">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-600">FREE</span>
                ) : (
                  `₹${deliveryFee}`
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <span className="font-extrabold text-[#153e90] text-lg">
            Total Amount
          </span>
          <span className="font-extrabold text-[#153e90] text-2xl">
            ₹{grandTotal}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBooking}
        disabled={isSubmitting}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-extrabold rounded-xl transition disabled:bg-slate-400 shadow-md"
      >
        {isSubmitting ? "Confirming Booking..." : "Confirm Booking"}
      </button>

      {confirmedBooking && (
        <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl border text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ✓
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 mb-1">
              Booking Confirmed!
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reference ID:{" "}
              <span className="font-mono font-bold text-slate-800">
                {confirmedBooking.bookingRef}
              </span>
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border text-left text-xs space-y-2 mb-6">
              <p>
                <span className="font-bold">Patient:</span>{" "}
                {confirmedBooking.name} ({confirmedBooking.age}Y /{" "}
                {confirmedBooking.gender})
              </p>
              <p>
                <span className="font-bold">Schedule:</span>{" "}
                {confirmedBooking.date} | {confirmedBooking.timeSlot}
              </p>
              <p>
                <span className="font-bold">Visit Type:</span>{" "}
                {confirmedBooking.collectionType === "home"
                  ? "Home Sample Collection"
                  : "Lab Visit"}
              </p>
              <p>
                <span className="font-bold">Tests Booked:</span>{" "}
                {(confirmedBooking.cartItems || [])
                  .map((t) => t.name)
                  .join(", ")}
              </p>
              <p className="text-sm font-extrabold text-[#153e90] pt-2 border-t">
                Total Payable: ₹{confirmedBooking.total}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={`https://wa.me/919849923729?text=${encodeURIComponent(
                  `Hello Sri Balaji Diagnostics, I have booked a test.\nBooking ID: ${confirmedBooking.bookingRef}\nName: ${confirmedBooking.name}\nDate:${confirmedBooking.date} (${confirmedBooking.timeSlot})\nTotal: ₹${confirmedBooking.total}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition"
              >
                📲 Send Booking Details on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
