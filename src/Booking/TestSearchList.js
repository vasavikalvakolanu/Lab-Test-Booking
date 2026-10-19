import React, { useState } from "react";

export function TestSearchList({
  searchableItems,
  categoryNames,
  isInCart,
  toggleCartItem
}) {
  const [search, setSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");

  const displayedTests = (searchableItems || []).filter((item) => {
    if (!item || !item.name) return false;
    const matchesSearch = search
      ? item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.category &&
          item.category.toLowerCase().includes(search.toLowerCase()))
      : true;
    const matchesCategory =
      activeCategoryFilter === "All" ||
      item.category === activeCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-[#153e90]">
            1. Select Lab Tests
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search individual tests (e.g., Blood Sugar, Platelet Count) or
            routine profiles (CBC, Lipid Profile)
          </p>
        </div>
        <a
          href="https://wa.me/919849923729?text=Hello%20Sri%20Balaji%20Diagnostics,%20I%20have%20a%20doctor%20prescription%20and%20need%20help%20booking%20tests."
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 transition inline-flex items-center gap-1.5 self-start"
        >
          <span>📄</span> Have a Prescription? WhatsApp Us
        </a>
      </div>

      <div className="relative mb-4">
        <span className="absolute left-4 top-3.5 text-lg">🔍</span>
        <input
          type="text"
          placeholder="Search for a test (e.g., Blood Sugar, CBC, Lipid Profile, Thyroid)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-10 py-3.5 border-2 border-blue-400 rounded-xl outline-none focus:border-blue-600 text-slate-700 font-medium"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {categoryNames && categoryNames.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {categoryNames.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                activeCategoryFilter === cat
                  ? "bg-[#153e90] text-white border-[#153e90]"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {displayedTests.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm font-medium">No matching lab tests found.</p>
            <p className="text-xs mt-1">
              Try searching a simpler keyword or clear the category filter.
            </p>
          </div>
        ) : (
          displayedTests.map((item, idx) => {
            const added = isInCart(item.name);
            const price = Number(item.discountedPrice || item.price || 0);
            const paramCount =
              item.tests && item.tests.length > 0 ? item.tests.length : null;

            return (
              <div
                key={idx}
                className={`flex justify-between items-center p-4 rounded-xl border transition ${
                  added
                    ? "border-emerald-500 bg-emerald-50/40"
                    : item.isPackage
                    ? "border-amber-200 bg-amber-50/30 hover:border-amber-400"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-base">
                      {item.name}
                    </h4>
                    {item.isPackage && (
                      <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                        Profile {paramCount ? `(${paramCount} Tests)` : ""}
                      </span>
                    )}
                    {item.category && !item.isPackage && (
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-base font-extrabold text-emerald-600">
                      ₹{price}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • Reports within 6-12 hrs
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleCartItem(item)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm border transition shrink-0 ${
                    added
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white"
                  }`}
                >
                  {added ? "✓ Added" : "Add +"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
