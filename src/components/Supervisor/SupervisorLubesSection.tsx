import React, { useState, useMemo } from 'react';
import {
  Droplet,
  Plus,
  Trash2,
  Package,
  Search,
  Filter,
  Layers,
  Sparkles,
  ChevronDown,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  SupervisorLubeRecord,
  LubricantProduct,
  GHANA_LUBRICANTS_MASTER_CATALOG,
  LUBRICANT_BRANDS,
  LUBRICANT_CATEGORIES,
} from '../../types';

interface SupervisorLubesSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  disabled?: boolean;
}

export const SupervisorLubesSection: React.FC<SupervisorLubesSectionProps> = ({
  form,
  onUpdateForm,
  formatGhc,
  disabled = false,
}) => {
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('All Brands');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<string>(
    GHANA_LUBRICANTS_MASTER_CATALOG[0]?.id || ''
  );
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // Custom Item Modal State
  const [customBrand, setCustomBrand] = useState<string>('Universal / Generic');
  const [customName, setCustomName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('Motor Oil');
  const [customViscosity, setCustomViscosity] = useState<string>('SAE 40');
  const [customUnit, setCustomUnit] = useState<string>('1LT');
  const [customConsumerPrice, setCustomConsumerPrice] = useState<number>(65);
  const [customDealerPrice, setCustomDealerPrice] = useState<number>(55);
  const [customOpeningStock, setCustomOpeningStock] = useState<number>(10);

  // Filtered master catalog for dropdown & modal browser
  const filteredCatalog = useMemo(() => {
    return GHANA_LUBRICANTS_MASTER_CATALOG.filter((item) => {
      const matchBrand =
        selectedBrandFilter === 'All Brands' || item.brand === selectedBrandFilter;
      const matchCategory =
        selectedCategoryFilter === 'All Categories' || item.category === selectedCategoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.viscosityGrade && item.viscosityGrade.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q);

      return matchBrand && matchCategory && matchQuery;
    });
  }, [selectedBrandFilter, selectedCategoryFilter, searchQuery]);

  // Keep dropdown selection valid when filtering
  React.useEffect(() => {
    if (filteredCatalog.length > 0) {
      if (!filteredCatalog.some((c) => c.id === selectedCatalogItem)) {
        setSelectedCatalogItem(filteredCatalog[0].id);
      }
    }
  }, [filteredCatalog, selectedCatalogItem]);

  const handleAddLubeItem = (catalogId?: string) => {
    const targetId = catalogId || selectedCatalogItem;
    const catalogItem =
      GHANA_LUBRICANTS_MASTER_CATALOG.find((c) => c.id === targetId) ||
      GHANA_LUBRICANTS_MASTER_CATALOG[0];

    const newLube: SupervisorLubeRecord = {
      id: 'slube_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      catalogId: catalogItem.id,
      brand: catalogItem.brand,
      category: catalogItem.category,
      viscosityGrade: catalogItem.viscosityGrade,
      name: catalogItem.name,
      unit: catalogItem.unit,
      unitPrice: catalogItem.consumerPrice,
      dealerPrice: catalogItem.dealerPrice,
      openingStock: 10,
      received: 0,
      soldQty: 1,
      closingStock: 9,
      totalAmount: catalogItem.consumerPrice,
    };

    onUpdateForm({
      lubricantSales: [...(form.lubricantSales || []), newLube],
    });
  };

  const handleAddFastMovingPack = () => {
    const currentSales = form.lubricantSales || [];
    const existingCatalogIds = new Set(currentSales.map((s) => s.catalogId).filter(Boolean));

    // Curated high-volume forecourt fast-movers across Ghana stations
    const fastMoverIds = [
      'tot-rubia-fleet-sae40-1l',
      'tot-q3000-20w50-1l',
      'tot-rubia-7400-15w40-4l',
      'sh-helix-hx3-sae40-1l',
      'sh-helix-hx3-20w50-4l',
      'goil-supertaxi-sae40-1l',
      'goil-supermotor-20w50-4l',
      'goil-diesel-sigma-15w40-4l',
      'st-atf3-1l',
      'ss-brake-dot4-05l',
      'sc-coolant-1l',
    ];

    const toAdd: SupervisorLubeRecord[] = [];
    fastMoverIds.forEach((id) => {
      if (!existingCatalogIds.has(id)) {
        const item = GHANA_LUBRICANTS_MASTER_CATALOG.find((c) => c.id === id);
        if (item) {
          toAdd.push({
            id: 'slube_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            catalogId: item.id,
            brand: item.brand,
            category: item.category,
            viscosityGrade: item.viscosityGrade,
            name: item.name,
            unit: item.unit,
            unitPrice: item.consumerPrice,
            dealerPrice: item.dealerPrice,
            openingStock: 10,
            received: 0,
            soldQty: 0,
            closingStock: 10,
            totalAmount: 0,
          });
        }
      }
    });

    if (toAdd.length > 0) {
      onUpdateForm({
        lubricantSales: [...currentSales, ...toAdd],
      });
    }
  };

  const handleCreateCustomLube = () => {
    if (!customName.trim()) return;

    const newLube: SupervisorLubeRecord = {
      id: 'slube_custom_' + Date.now(),
      brand: customBrand || 'Universal / Generic',
      category: customCategory,
      viscosityGrade: customViscosity,
      name: `${customBrand !== 'Universal / Generic' ? customBrand + ' ' : ''}${customName.trim()}`,
      unit: customUnit || '1LT',
      unitPrice: Number(customConsumerPrice) || 65,
      dealerPrice: Number(customDealerPrice) || 55,
      openingStock: Number(customOpeningStock) || 10,
      received: 0,
      soldQty: 0,
      closingStock: Number(customOpeningStock) || 10,
      totalAmount: 0,
    };

    onUpdateForm({
      lubricantSales: [...(form.lubricantSales || []), newLube],
    });

    setCustomName('');
    setShowCustomModal(false);
  };

  const handleUpdateLube = (
    id: string,
    field: keyof SupervisorLubeRecord,
    val: any
  ) => {
    const updated = (form.lubricantSales || []).map((l) => {
      if (l.id !== id) return l;
      const next = { ...l, [field]: val };
      if (field === 'catalogId') {
        const match = GHANA_LUBRICANTS_MASTER_CATALOG.find((c) => c.id === val);
        if (match) {
          next.brand = match.brand;
          next.category = match.category;
          next.viscosityGrade = match.viscosityGrade;
          next.name = match.name;
          next.unit = match.unit;
          next.unitPrice = match.consumerPrice;
          next.dealerPrice = match.dealerPrice;
        }
      }
      const sold = Number(next.soldQty) || 0;
      const price = Number(next.unitPrice) || 0;
      next.totalAmount = sold * price;
      const open = Number(next.openingStock) || 0;
      const rec = Number(next.received) || 0;
      // Closing Stock formula: Opening + Received - Sold
      next.closingStock = Math.max(0, open + rec - sold);
      return next;
    });
    onUpdateForm({ lubricantSales: updated });
  };

  const handleRemoveLube = (id: string) => {
    onUpdateForm({
      lubricantSales: (form.lubricantSales || []).filter((l) => l.id !== id),
    });
  };

  const totalUnitsSold = (form.lubricantSales || []).reduce(
    (acc, l) => acc + (Number(l.soldQty) || 0),
    0
  );
  const totalLubeSales = (form.lubricantSales || []).reduce(
    (acc, l) =>
      acc + (Number(l.soldQty) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  const getBrandBadgeColor = (brand?: string) => {
    switch (brand) {
      case 'TotalEnergies':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'Shell':
        return 'bg-amber-500/15 text-yellow-400 border-yellow-500/30';
      case 'GOIL':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'StarOil':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'Puma Energy':
        return 'bg-red-500/15 text-rose-400 border-rose-500/30';
      case 'Castrol':
        return 'bg-green-500/15 text-emerald-300 border-green-500/30';
      case 'Mobil':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-stone-500/15 text-stone-300 border-stone-500/30';
    }
  };

  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            5
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <Droplet className="w-4 h-4 text-amber-400" />
                5. Forecourt Lubricants & Specialty Products
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
                All Ghana OMCs & Brands
              </span>
            </div>
            <p className="text-xs text-[#8d9195]">
              Account for all forecourt motor oils, heavy-duty diesel lubes, synthetic blends, transmission fluids, brake fluids, and coolants across TotalEnergies, Shell, GOIL, StarOil, Puma, Castrol, Mobil, and independent station products.
            </p>
          </div>
        </div>

        {!disabled && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCatalogModal(true)}
              className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
              title="Browse complete catalog of lubricants across all Ghana brands"
            >
              <Package size={13} />
              <span>Browse All Ghana Catalog ({GHANA_LUBRICANTS_MASTER_CATALOG.length})</span>
            </button>

            <button
              type="button"
              onClick={handleAddFastMovingPack}
              className="py-1.5 px-3 rounded-xl bg-[#23262a] hover:bg-[#2a2e33] border border-[#333739] text-[#ece8e0] text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              title="Quick-add popular high-volume forecourt lubricant products"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>+ Quick Fast-Movers</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="py-1.5 px-3 rounded-xl bg-[#23262a] hover:bg-[#2a2e33] border border-[#333739] text-[#ece8e0] text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>+ Custom Brand/Item</span>
            </button>
          </div>
        )}
      </div>

      {/* BRAND & CATEGORY FILTER BAR */}
      {!disabled && (
        <div className="bg-[#15171a] p-3 rounded-xl border border-[#333739] space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[#8d9195]" />
              <input
                type="text"
                placeholder="Search by brand, name, viscosity (e.g. 15W40, SAE 40, ATF, DOT 4, Coolant)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#191c1f] border border-[#333739] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#ece8e0] placeholder-[#8d9195] outline-hidden focus:border-amber-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-[#8d9195] hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Catalog Item Select & Add */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[280px]">
              <select
                value={selectedCatalogItem}
                onChange={(e) => setSelectedCatalogItem(e.target.value)}
                className="flex-1 bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] outline-hidden font-medium truncate"
              >
                {filteredCatalog.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    [{cat.brand}] {cat.name} ({cat.unit}) — GH₵ {cat.consumerPrice}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddLubeItem(selectedCatalogItem)}
                disabled={filteredCatalog.length === 0}
                className="py-1.5 px-3 rounded-lg bg-amber-500 text-stone-950 text-xs font-bold cursor-pointer hover:bg-amber-400 transition-colors whitespace-nowrap flex items-center gap-1 disabled:opacity-50"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {/* Quick Brand Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
            <span className="text-[#8d9195] font-bold text-[10px] uppercase mr-1 whitespace-nowrap flex items-center gap-1">
              <Filter size={11} /> Brands:
            </span>
            {LUBRICANT_BRANDS.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrandFilter(brand)}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors cursor-pointer text-xs ${
                  selectedBrandFilter === brand
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-[#191c1f] text-[#8d9195] hover:text-[#ece8e0] border border-[#333739]'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
            <span className="text-[#8d9195] font-bold text-[10px] uppercase mr-1 whitespace-nowrap flex items-center gap-1">
              <Layers size={11} /> Category:
            </span>
            {LUBRICANT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded-md whitespace-nowrap text-[10.5px] transition-colors cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? 'bg-[#333739] text-amber-300 font-bold border border-amber-500/50'
                    : 'bg-[#191c1f]/60 text-[#8d9195] hover:text-[#ece8e0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* METRIC SUMMARY BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-[#15171a] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Product Lines in Shift
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#ece8e0]">
            {(form.lubricantSales || []).length} Recorded
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#15171a] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Total Units Sold
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-amber-400">
            {totalUnitsSold} Units
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#15171a] border border-[#333739] col-span-2 sm:col-span-1">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Total Lubricants Revenue
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#e8b93b]">
            GH₵ {formatGhc(totalLubeSales)}
          </span>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-[#333739]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#15171a] text-[#8d9195] uppercase font-bold text-[10px] tracking-wider border-b border-[#333739]">
            <tr>
              <th className="p-3 min-w-[260px]">Brand & Product Description</th>
              <th className="p-3 text-center w-20">Unit</th>
              <th className="p-3 text-right w-24">Opening Stock</th>
              <th className="p-3 text-right w-24">Received</th>
              <th className="p-3 text-right w-28">Quantity Sold</th>
              <th className="p-3 text-right w-24">Closing Stock</th>
              <th className="p-3 text-right w-28">Unit Price (GH₵)</th>
              <th className="p-3 text-right w-32">Total Amount Sold</th>
              {!disabled && <th className="p-3 text-center w-12">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333739] bg-[#191c1f]">
            {(form.lubricantSales || []).length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-[#8d9195]">
                  <Package size={32} className="mx-auto mb-2 opacity-30 text-amber-400" />
                  <p className="font-semibold text-sm text-[#ece8e0]">
                    No lubricant products added for this shift yet
                  </p>
                  <p className="text-xs mt-1">
                    Select products from the Ghana master catalog above or click "+ Quick Fast-Movers".
                  </p>
                </td>
              </tr>
            ) : (
              (form.lubricantSales || []).map((l) => {
                const sold = Number(l.soldQty) || 0;
                const price = Number(l.unitPrice) || 0;
                const total = sold * price;
                const open = Number(l.openingStock) || 0;
                const rec = Number(l.received) || 0;
                const closing = Math.max(0, open + rec - sold);

                return (
                  <tr key={l.id} className="hover:bg-[#1d2023]/60 transition-colors">
                    <td className="p-2.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            disabled={disabled}
                            value={l.name}
                            onChange={(e) => handleUpdateLube(l.id, 'name', e.target.value)}
                            className="w-full bg-[#15171a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-bold outline-hidden focus:border-amber-400"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {l.brand && (
                            <span
                              className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border ${getBrandBadgeColor(
                                l.brand
                              )}`}
                            >
                              {l.brand}
                            </span>
                          )}
                          {l.category && (
                            <span className="text-[9.5px] text-[#8d9195] bg-[#15171a] px-1.5 py-0.5 rounded border border-[#333739]">
                              {l.category}
                            </span>
                          )}
                          {l.viscosityGrade && (
                            <span className="text-[9.5px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {l.viscosityGrade}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5 text-center">
                      <input
                        type="text"
                        disabled={disabled}
                        value={l.unit}
                        onChange={(e) => handleUpdateLube(l.id, 'unit', e.target.value)}
                        className="w-16 bg-[#15171a] border border-[#333739] rounded-lg px-1.5 py-1.5 text-xs text-[#ece8e0] font-mono text-center outline-hidden"
                      />
                    </td>

                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="1"
                        disabled={disabled}
                        value={l.openingStock ?? ''}
                        onChange={(e) =>
                          handleUpdateLube(l.id, 'openingStock', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 bg-[#15171a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right outline-hidden"
                      />
                    </td>

                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="1"
                        disabled={disabled}
                        value={l.received ?? ''}
                        onChange={(e) =>
                          handleUpdateLube(l.id, 'received', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 bg-[#15171a] border border-blue-900/60 rounded-lg px-2 py-1.5 text-xs text-blue-200 font-mono text-right outline-hidden"
                      />
                    </td>

                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="1"
                        disabled={disabled}
                        value={l.soldQty ?? ''}
                        onChange={(e) =>
                          handleUpdateLube(l.id, 'soldQty', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 bg-[#15171a] border border-amber-900/60 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono text-right font-bold outline-hidden"
                      />
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-[#ece8e0]">
                      {closing}
                    </td>

                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        disabled={disabled}
                        value={l.unitPrice || ''}
                        onChange={(e) =>
                          handleUpdateLube(l.id, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 bg-[#15171a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right outline-hidden"
                      />
                    </td>

                    <td className="p-2.5 text-right font-mono font-extrabold text-[#e8b93b] text-sm">
                      GH₵ {formatGhc(total)}
                    </td>

                    {!disabled && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLube(l.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                          title="Delete Lubricant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-[#15171a] font-bold text-xs border-t border-[#333739]">
            <tr>
              <td colSpan={4} className="p-3 text-right text-[#8d9195] uppercase text-[11px]">
                Lubricants Totals:
              </td>
              <td className="p-3 text-right font-mono text-amber-400">
                {totalUnitsSold} Units Sold
              </td>
              <td colSpan={2} className="p-3 text-right text-[#8d9195]">
                Total Lubricants Sales:
              </td>
              <td className="p-3 text-right font-mono text-[#e8b93b] text-sm">
                GH₵ {formatGhc(totalLubeSales)}
              </td>
              {!disabled && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="space-y-3 lg:hidden">
        {(form.lubricantSales || []).map((l) => {
          const sold = Number(l.soldQty) || 0;
          const price = Number(l.unitPrice) || 0;
          const total = sold * price;
          const open = Number(l.openingStock) || 0;
          const rec = Number(l.received) || 0;
          const closing = Math.max(0, open + rec - sold);

          return (
            <div
              key={l.id}
              className="bg-[#15171a] border border-[#333739] rounded-xl p-3.5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    disabled={disabled}
                    value={l.name}
                    onChange={(e) => handleUpdateLube(l.id, 'name', e.target.value)}
                    className="bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1 text-xs text-[#ece8e0] font-bold w-full"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {l.brand && (
                      <span
                        className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border ${getBrandBadgeColor(
                          l.brand
                        )}`}
                      >
                        {l.brand}
                      </span>
                    )}
                    {l.unit && (
                      <span className="text-[9.5px] font-mono text-[#8d9195] bg-[#191c1f] px-1.5 py-0.5 rounded border border-[#333739]">
                        {l.unit}
                      </span>
                    )}
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLube(l.id)}
                    className="p-1 rounded text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-[#8d9195] font-bold block mb-1">
                    Opening
                  </label>
                  <input
                    type="number"
                    disabled={disabled}
                    value={l.openingStock ?? ''}
                    onChange={(e) =>
                      handleUpdateLube(l.id, 'openingStock', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-blue-300 font-bold block mb-1">
                    Received
                  </label>
                  <input
                    type="number"
                    disabled={disabled}
                    value={l.received ?? ''}
                    onChange={(e) =>
                      handleUpdateLube(l.id, 'received', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-blue-900/60 rounded-lg px-2 py-1.5 text-xs text-blue-200 font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">
                    Sold Qty
                  </label>
                  <input
                    type="number"
                    disabled={disabled}
                    value={l.soldQty ?? ''}
                    onChange={(e) =>
                      handleUpdateLube(l.id, 'soldQty', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-amber-900/60 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono text-right font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-[#8d9195] font-bold block mb-1">
                    Unit Price (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={l.unitPrice ?? ''}
                    onChange={(e) =>
                      handleUpdateLube(l.id, 'unitPrice', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8d9195] font-bold block mb-1">
                    Closing Stock
                  </label>
                  <div className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2 py-1.5 text-xs font-mono text-right text-[#ece8e0] font-bold">
                    {closing} Units
                  </div>
                </div>
              </div>

              <div className="bg-[#191c1f] rounded-lg p-2.5 border border-[#333739] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#8d9195]">Line Revenue:</span>
                <span className="font-mono font-extrabold text-[#e8b93b] text-sm">
                  GH₵ {formatGhc(total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: GHANA MASTER LUBRICANTS BROWSER */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-[#191c1f] border border-[#333739] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#333739] flex items-center justify-between bg-[#15171a]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#ece8e0] flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  Ghana National Forecourt Lubricants Master Catalog
                </h3>
                <p className="text-xs text-[#8d9195] mt-0.5">
                  Browse {GHANA_LUBRICANTS_MASTER_CATALOG.length} official lubricant SKUs across all brands in Ghana (TotalEnergies, Shell, GOIL, StarOil, Puma, Castrol, Mobil, Universal).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 rounded-lg text-[#8d9195] hover:text-white hover:bg-[#23262a] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Filters & Search */}
            <div className="p-4 border-b border-[#333739] bg-[#15171a]/50 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-[#8d9195]" />
                <input
                  type="text"
                  placeholder="Search products by brand, name, grade (e.g. 5W40, 15W40, SAE 40, ATF, DOT 4, Coolant)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#191c1f] border border-[#333739] rounded-xl pl-9 pr-8 py-2 text-xs text-[#ece8e0] placeholder-[#8d9195] outline-hidden focus:border-amber-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-[#8d9195] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Brand Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {LUBRICANT_BRANDS.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrandFilter(brand)}
                    className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors ${
                      selectedBrandFilter === brand
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'bg-[#23262a] text-[#8d9195] hover:text-white border border-[#333739]'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Items List */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-[#2a2d30] max-h-[55vh]">
              {filteredCatalog.length === 0 ? (
                <div className="p-8 text-center text-[#8d9195]">
                  <p className="font-semibold text-sm">No lubricants match your filter criteria.</p>
                  <p className="text-xs mt-1">Try changing the brand filter or clearing the search box.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredCatalog.map((prod) => {
                    const isAdded = (form.lubricantSales || []).some(
                      (s) => s.catalogId === prod.id || s.name === prod.name
                    );

                    return (
                      <div
                        key={prod.id}
                        className="bg-[#15171a] p-3 rounded-xl border border-[#333739] flex items-center justify-between gap-3 hover:border-amber-500/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${getBrandBadgeColor(
                                prod.brand
                              )}`}
                            >
                              {prod.brand}
                            </span>
                            <span className="text-[9.5px] text-[#8d9195] bg-[#191c1f] px-1.5 py-0.5 rounded border border-[#333739]">
                              {prod.unit}
                            </span>
                            {prod.viscosityGrade && (
                              <span className="text-[9.5px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                {prod.viscosityGrade}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-[#ece8e0] truncate" title={prod.name}>
                            {prod.name}
                          </h4>
                          <div className="text-[11px] text-[#8d9195] mt-1 flex items-center gap-2">
                            <span>
                              Retail: <strong className="text-amber-400 font-mono">GH₵ {prod.consumerPrice.toFixed(2)}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Wholesale: <span className="font-mono text-[#ece8e0]">GH₵ {prod.dealerPrice.toFixed(2)}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleAddLubeItem(prod.id);
                          }}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                            isAdded
                              ? 'bg-[#23262a] text-amber-400 border border-amber-500/30'
                              : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={12} /> Added (+1)
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> Add to Shift
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#333739] bg-[#15171a] flex items-center justify-between">
              <span className="text-xs text-[#8d9195]">
                Showing {filteredCatalog.length} of {GHANA_LUBRICANTS_MASTER_CATALOG.length} products
              </span>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="py-1.5 px-4 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer hover:bg-amber-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM BRAND / LUBRICANT CREATOR */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#191c1f] border border-[#333739] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#333739] flex items-center justify-between bg-[#15171a]">
              <div>
                <h3 className="text-base font-bold text-[#ece8e0] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  Add Custom Forecourt Lubricant
                </h3>
                <p className="text-xs text-[#8d9195]">
                  Add any specific brand, local specialty lube, or custom packaging SKU not in the catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded text-[#8d9195] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] text-[#8d9195] font-bold block mb-1">
                  Operating Brand / OMC
                </label>
                <select
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3 py-2 text-xs text-[#ece8e0] outline-hidden focus:border-amber-400"
                >
                  <option value="TotalEnergies">TotalEnergies</option>
                  <option value="Shell">Shell / Vivo Energy</option>
                  <option value="GOIL">GOIL (Ghana Oil Company)</option>
                  <option value="StarOil">StarOil Ghana</option>
                  <option value="Puma Energy">Puma Energy</option>
                  <option value="Castrol">Castrol</option>
                  <option value="Mobil">Mobil</option>
                  <option value="Allied Oil">Allied Oil</option>
                  <option value="Zen Petroleum">Zen Petroleum</option>
                  <option value="Petrosol">Petrosol</option>
                  <option value="Frimps Oil">Frimps Oil</option>
                  <option value="Benab Oil">Benab Oil</option>
                  <option value="Dukes Petroleum">Dukes Petroleum</option>
                  <option value="Pacific Oil">Pacific Oil</option>
                  <option value="Universal / Generic">Universal / Generic / Other OMC</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#8d9195] font-bold block mb-1">
                  Product Description / Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Super Heavy Fleet Engine Oil"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3 py-2 text-xs text-[#ece8e0] outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#8d9195] font-bold block mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3 py-2 text-xs text-[#ece8e0] outline-hidden"
                  >
                    <option value="Motor Oil">Motor Oil</option>
                    <option value="Diesel Engine Oil">Diesel Engine Oil</option>
                    <option value="Fully Synthetic">Fully Synthetic</option>
                    <option value="Semi-Synthetic">Semi-Synthetic</option>
                    <option value="Transmission & Gear">Transmission & Gear</option>
                    <option value="Coolant & Brake">Coolant & Brake</option>
                    <option value="Grease & Specialty">Grease & Specialty</option>
                    <option value="2T & 4T Motorcycle / Marine">2T & 4T Motorcycle / Marine</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8d9195] font-bold block mb-1">
                    Viscosity / Grade
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15W-40, SAE 40, ATF"
                    value={customViscosity}
                    onChange={(e) => setCustomViscosity(e.target.value)}
                    className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3 py-2 text-xs text-[#ece8e0] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[#8d9195] font-bold block mb-1">
                    Packaging Unit
                  </label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3 py-2 text-xs text-[#ece8e0] outline-hidden"
                  >
                    <option value="1LT">1LT</option>
                    <option value="4LT">4LT</option>
                    <option value="5LT">5LT</option>
                    <option value="20L">20L Pail</option>
                    <option value="208L">208L Drum</option>
                    <option value="0.5L">0.5L / 500ml</option>
                    <option value="250ml">250ml</option>
                    <option value="1kg">1kg Grease</option>
                    <option value="15kg">15kg Grease</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-amber-300 font-bold block mb-1">
                    Retail Price (GH₵) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customConsumerPrice}
                    onChange={(e) => setCustomConsumerPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3 py-2 text-xs text-[#ece8e0] font-mono text-right outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#8d9195] font-bold block mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={customOpeningStock}
                    onChange={(e) => setCustomOpeningStock(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3 py-2 text-xs text-[#ece8e0] font-mono text-right outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#333739] bg-[#15171a] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="py-2 px-4 rounded-xl bg-[#23262a] text-[#8d9195] hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomLube}
                disabled={!customName.trim()}
                className="py-2 px-5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                Save & Add to Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
