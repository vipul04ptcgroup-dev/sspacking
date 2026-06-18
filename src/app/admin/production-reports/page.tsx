'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  BarChart3,
  Boxes,
  Download,
  Factory,
  Filter,
  Search,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { isCoreProductCategorySlug } from '@/lib/product-categories';
import Button from '@/components/ui/Button';
import { EmptyState, Select, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

type ProductOption = {
  id: string;
  name: string;
};

type ProductionRawMaterial = {
  productId: string;
  productName: string;
  qty: number;
};

type ProductionEntry = {
  id: string;
  productId: string;
  productName: string;
  finishedInventoryTransactionId?: string;
  rawMaterialInventoryTransactionIds: string[];
  productionQty: number;
  quantityProducedBottles: number;
  bottleWeightGram: number;
  productionWeightGrams: number;
  productionWeightKg: number;
  productionDate: string;
  notes: string;
  rawMaterials: ProductionRawMaterial[];
  createdAt: Date | null;
};

const PAGE_SIZE = 10;

function mapProductOption(id: string, data: Record<string, unknown>): ProductOption | null {
  const rawCategoryId = String(data.categoryId || data.category || '').trim().toLowerCase();
  if (rawCategoryId && (!isCoreProductCategorySlug(rawCategoryId) || rawCategoryId !== 'production')) return null;
  const rawName = data.name || data.productName || data.title;
  if (typeof rawName !== 'string' || !rawName.trim()) return null;
  return { id, name: rawName.trim() };
}

function toDateOrNull(value: unknown): Date | null {
  return (value as { toDate?: () => Date })?.toDate?.() ?? null;
}

function formatDate(value: string): string {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function formatGrams(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function formatKilograms(value: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value);
}

function escapeCsv(value: string | number): string {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export default function AdminProductionReportsPage() {
  const [loading, setLoading] = useState(true);
  const [productions, setProductions] = useState<ProductionEntry[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [productSnap, productionSnap] = await Promise.all([
          getDocs(query(collection(db, 'products'), where('active', '==', true))),
          getDocs(query(collection(db, 'production'), orderBy('createdAt', 'desc'))),
        ]);

        const nextProducts = productSnap.docs
          .map((docSnap) => mapProductOption(docSnap.id, docSnap.data() as Record<string, unknown>))
          .filter((option): option is ProductOption => Boolean(option))
          .sort((a, b) => a.name.localeCompare(b.name));

        const nextProductions = productionSnap.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            productId: (data.productId as string) || '',
            productName: (data.productName as string) || '',
            finishedInventoryTransactionId: (data.finishedInventoryTransactionId as string) || undefined,
            rawMaterialInventoryTransactionIds: Array.isArray(data.rawMaterialInventoryTransactionIds)
              ? data.rawMaterialInventoryTransactionIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
              : [],
            productionQty: typeof data.productionQty === 'number' ? data.productionQty : 0,
            quantityProducedBottles:
              typeof data.quantityProducedBottles === 'number'
                ? data.quantityProducedBottles
                : typeof data.productionQty === 'number'
                  ? data.productionQty
                  : 0,
            bottleWeightGram: typeof data.bottleWeightGram === 'number' ? data.bottleWeightGram : 0,
            productionWeightGrams: typeof data.productionWeightGrams === 'number' ? data.productionWeightGrams : 0,
            productionWeightKg: typeof data.productionWeightKg === 'number' ? data.productionWeightKg : 0,
            productionDate: (data.productionDate as string) || '',
            notes: (data.notes as string) || '',
            rawMaterials: Array.isArray(data.rawMaterials)
              ? data.rawMaterials.map((rawMaterial) => ({
                  productId: ((rawMaterial as Record<string, unknown>).productId as string) || ((rawMaterial as Record<string, unknown>).materialId as string) || '',
                  productName: ((rawMaterial as Record<string, unknown>).productName as string) || ((rawMaterial as Record<string, unknown>).materialName as string) || 'Unnamed Raw Material',
                  qty: typeof (rawMaterial as Record<string, unknown>).qty === 'number'
                    ? ((rawMaterial as Record<string, unknown>).qty as number)
                    : 0,
                }))
              : Array.isArray(data.materials)
                ? data.materials.map((rawMaterial) => ({
                    productId: ((rawMaterial as Record<string, unknown>).productId as string) || ((rawMaterial as Record<string, unknown>).materialId as string) || '',
                    productName: ((rawMaterial as Record<string, unknown>).productName as string) || ((rawMaterial as Record<string, unknown>).materialName as string) || 'Unnamed Raw Material',
                    qty: typeof (rawMaterial as Record<string, unknown>).qty === 'number'
                      ? ((rawMaterial as Record<string, unknown>).qty as number)
                      : 0,
                  }))
              : [],
            createdAt: toDateOrNull(data.createdAt),
          } satisfies ProductionEntry;
        });

        setProducts(nextProducts);
        setProductions(nextProductions);
      } catch (error) {
        console.error('Failed to load production reports:', error);
        toast.error('Failed to load production reports.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const productOptions = useMemo(
    () => [{ value: '', label: 'All products' }, ...products.map((product) => ({ value: product.id, label: product.name }))],
    [products],
  );

  const filteredProductions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return productions.filter((entry) => {
      const matchesProduct = !selectedProductId || entry.productId === selectedProductId;
      const matchesStart = !startDate || entry.productionDate >= startDate;
      const matchesEnd = !endDate || entry.productionDate <= endDate;
      const rawMaterialsText = entry.rawMaterials.map((rawMaterial) => rawMaterial.productName).join(' ').toLowerCase();
      const matchesSearch =
        !term ||
        entry.productName.toLowerCase().includes(term) ||
        entry.notes.toLowerCase().includes(term) ||
        rawMaterialsText.includes(term);

      return matchesProduct && matchesStart && matchesEnd && matchesSearch;
    });
  }, [productions, selectedProductId, startDate, endDate, search]);

  useEffect(() => {
    setPage(1);
  }, [selectedProductId, startDate, endDate, search]);

  const summary = useMemo(() => {
    const totalBottles = filteredProductions.reduce((sum, entry) => sum + entry.quantityProducedBottles, 0);
    const totalProductionWeightGrams = filteredProductions.reduce((sum, entry) => sum + entry.productionWeightGrams, 0);
    const totalProductionWeightKg = filteredProductions.reduce((sum, entry) => sum + entry.productionWeightKg, 0);
    const rawMaterialConsumptionMap = filteredProductions.reduce<Map<string, number>>((map, entry) => {
      entry.rawMaterials.forEach((rawMaterial) => {
        map.set(rawMaterial.productName, (map.get(rawMaterial.productName) || 0) + rawMaterial.qty);
      });
      return map;
    }, new Map());

    const materialConsumption = Array.from(rawMaterialConsumptionMap.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    return {
      totalBottles,
      totalProductionWeightGrams,
      totalProductionWeightKg,
      materialConsumption,
    };
  }, [filteredProductions]);

  const totalPages = Math.max(1, Math.ceil(filteredProductions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProductions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProductions.slice(start, start + PAGE_SIZE);
  }, [filteredProductions, currentPage]);

  const selectedProductLabel = useMemo(
    () => products.find((product) => product.id === selectedProductId)?.name || 'All Products',
    [products, selectedProductId],
  );

  const handleExportCsv = () => {
    if (filteredProductions.length === 0) {
      toast.error('No report rows available to export.');
      return;
    }

    const rows = [
      ['Batch ID', 'Date', 'Product Name', 'Production Quantity', 'Raw Materials Used', 'Created At'],
      ...filteredProductions.map((entry) => [
        entry.id,
        entry.productionDate,
        entry.productName,
        `${entry.quantityProducedBottles} bottles | ${entry.productionWeightGrams} g | ${entry.productionWeightKg} kg`,
        entry.rawMaterials.map((rawMaterial) => `${rawMaterial.productName}: ${rawMaterial.qty}`).join(' | '),
        formatDateTime(entry.createdAt),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateLabel = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `production-report-${dateLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Production report exported to CSV.');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Production Reports</h1>
          <p className="mt-1 text-stone-500">Review production output, raw material usage, and export filtered reports.</p>
        </div>
        <Button onClick={handleExportCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="mb-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Filters</h2>
            <p className="text-sm text-stone-500">Filter by product, date range, and search text.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-[42px] h-4 w-4 text-stone-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product, note, or raw material"
              className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 transition hover:border-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <Select
            id="productFilter"
            label="Product Filter"
            options={productOptions}
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
          />
          <div>
            <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-stone-700">Start Date</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition hover:border-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-stone-700">End Date</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition hover:border-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Total Production</h2>
              <p className="text-sm text-stone-500">{selectedProductLabel}</p>
            </div>
          </div>
          <div className="text-4xl font-black text-stone-900">{summary.totalBottles}</div>
          <p className="mt-2 text-sm text-stone-500">bottles across {filteredProductions.length} production entr{filteredProductions.length === 1 ? 'y' : 'ies'}</p>
          <p className="mt-3 text-sm text-stone-600">{formatGrams(summary.totalProductionWeightGrams)} GRAM</p>
          <p className="text-sm text-stone-600">{formatKilograms(summary.totalProductionWeightKg)} KG</p>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Raw Material Consumption</h2>
              <p className="text-sm text-stone-500">Grouped by raw material product</p>
            </div>
          </div>

          {summary.materialConsumption.length === 0 ? (
            <p className="text-sm text-stone-500">No raw material consumption for the current filter.</p>
          ) : (
            <div className="space-y-3">
              {summary.materialConsumption.map((material) => (
                <div key={material.name} className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                  <span className="text-sm font-medium text-stone-700">{material.name}</span>
                  <span className="text-sm font-bold text-stone-900">{formatKilograms(material.qty)} KG</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredProductions.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-16 w-16" />}
          title={productions.length === 0 ? 'No production entries yet' : 'No production entries match your filters'}
          description={
            productions.length === 0
              ? 'Create production entries first to start generating reports.'
              : 'Try another product, date range, or search term.'
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-stone-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredProductions.length)} of {filteredProductions.length} records
            </div>
            <div className="text-sm text-stone-500">Page {currentPage} of {totalPages}</div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Batch</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Bottles</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Bottle Weight</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Production Weight</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Raw Materials Used</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {paginatedProductions.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50 transition">
                      <td className="px-5 py-4 text-sm text-stone-600">{formatDate(entry.productionDate)}</td>
                      <td className="px-5 py-4 text-sm text-stone-600">{entry.id}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-stone-900">{entry.productName}</td>
                      <td className="px-5 py-4 text-sm font-bold text-stone-900">{entry.quantityProducedBottles}</td>
                      <td className="px-5 py-4 text-sm text-stone-600">{formatGrams(entry.bottleWeightGram)} GRAM</td>
                      <td className="px-5 py-4 text-sm text-stone-600">
                        <div className="space-y-1">
                          <div>{formatGrams(entry.productionWeightGrams)} GRAM</div>
                          <div className="font-semibold text-stone-900">{formatKilograms(entry.productionWeightKg)} KG</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-600">
                        <div className="space-y-1">
                          {entry.rawMaterials.map((rawMaterial) => (
                            <div key={`${entry.id}-${rawMaterial.productId}-${rawMaterial.productName}`} className="flex items-center justify-between gap-4">
                              <span>{rawMaterial.productName}</span>
                              <span className="font-semibold text-stone-900">{formatKilograms(rawMaterial.qty)} KG</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-500">{formatDateTime(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 lg:hidden">
            {paginatedProductions.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-stone-900">{entry.productName}</p>
                    <p className="mt-1 text-xs text-stone-500">{formatDate(entry.productionDate)}</p>
                    <p className="mt-1 text-xs text-stone-500">Batch: {entry.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-stone-500">Bottles</p>
                    <p className="text-lg font-black text-stone-900">{entry.quantityProducedBottles}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-xl bg-stone-50 px-4 py-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Bottle Weight</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">{formatGrams(entry.bottleWeightGram)} GRAM</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Production Weight</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">{formatGrams(entry.productionWeightGrams)} GRAM</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Production Weight</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900">{formatKilograms(entry.productionWeightKg)} KG</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Raw Materials Used</p>
                  <div className="mt-2 space-y-2">
                    {entry.rawMaterials.map((rawMaterial) => (
                      <div key={`${entry.id}-${rawMaterial.productId}-${rawMaterial.productName}`} className="flex items-center justify-between text-sm">
                        <span className="text-stone-700">{rawMaterial.productName}</span>
                        <span className="font-semibold text-stone-900">{formatKilograms(rawMaterial.qty)} KG</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-xs text-stone-500">Created: {formatDateTime(entry.createdAt)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="text-sm text-stone-500">Page {currentPage} of {totalPages}</div>
            <Button
              variant="outline"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
