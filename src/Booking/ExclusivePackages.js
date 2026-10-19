import React, { useState } from "react";

export function ExclusivePackages({
  exclusivePackages,
  isInCart,
  toggleCartItem
}) {
  const [expandedPkgName, setExpandedPkgName] = useState(null);

  return (
    <div className="bg-gradient-to-br from-[#fdf4ff] via-[#faf5ff] to-[#f3e8ff] p-6 md:p-7 rounded-2xl border border-purple-200 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#581c87] flex items-center gap-2">
          <span>✨</span> Exclusive Health Packages
        </h2>
        <span className="text-xs font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
          Free Home Sample Collection
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(exclusivePackages || []).map((pkg, idx) => {
          const added = isInCart(pkg.name);
          const finalPrice = Number(pkg.discountedPrice || pkg.price || 0);
          const mrpPrice = Number(
            pkg.originalPrice || Math.round(finalPrice * 1.6)
          );
          const savingsPercent = Math.round(
            ((mrpPrice - finalPrice) / mrpPrice) * 100
          );
          const pillList =
            pkg.highlights && pkg.highlights.length > 0
              ? pkg.highlights
              : (pkg.tests || []).map((t) => t.name);

          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm hover:shadow-md transition relative flex flex-col justify-between pt-6 px-5 pb-5"
            >
              <div className="absolute -top-3.5 right-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-full shadow-sm uppercase tracking-wider">
                Special Offer
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#3b0764] mb-2">
                  {pkg.name}
                </h3>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wide">
                    No Extra Coupons
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                    ⚡ {pkg.tat || "Same Day Report"}
                  </span>
                </div>

                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Package Includes:
                </p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {pillList.slice(0, 6).map((label, i) => (
                    <span
                      key={i}
                      className="bg-[#f5f3ff] text-[#5b21b6] border border-[#ddd6fe] px-2.5 py-1 rounded-md text-xs font-semibold"
                    >
                      {label}
                    </span>
                  ))}
                  {pillList.length > 6 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPkgName(
                          expandedPkgName === pkg.name ? null : pkg.name
                        )
                      }
                      className="text-xs font-bold text-purple-700 underline ml-1"
                    >
                      {expandedPkgName === pkg.name
                        ? "Show Less"
                        : `+${pillList.length - 6} More`}
                    </button>
                  )}
                </div>

                {expandedPkgName === pkg.name && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border text-xs text-slate-600 max-h-40 overflow-y-auto">
                    <p className="font-bold text-slate-700 mb-1">
                      Included Parameters:
                    </p>
                    {(pkg.tests || []).map((t, i) => (
                      <span key={i} className="inline-block mr-2 mb-1">
                        • {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 line-through font-semibold">
                      ₹{mrpPrice}
                    </span>
                    {savingsPercent > 0 && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                        {savingsPercent}% OFF
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-[#153e90]">
                    ₹{finalPrice}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleCartItem(pkg)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm ${
                    added
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-[#6d28d9] hover:bg-[#5b21b6] text-white"
                  }`}
                >
                  {added ? "✓ Added" : "Select Package"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
