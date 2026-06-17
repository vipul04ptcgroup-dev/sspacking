'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { createMaterial, deleteMaterial, getAllMaterials, updateMaterial } from '@/lib/firestore';
import type { Material } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge, EmptyState, Modal, Spinner } from '@/components/ui';
import { Boxes, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type MaterialFormState = {
  name: string;
  stock: string;
  status: boolean;
};

const emptyForm: MaterialFormState = {
  name: '',
  stock: '0',
  status: true,
};

function normalizeMaterialName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function parseStock(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

export default function AdminMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<MaterialFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      setMaterials(await getAllMaterials());
    } catch (error) {
      console.error('Failed to load materials:', error);
      toast.error('Failed to load materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaterials();
  }, []);

  const filteredMaterials = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return materials;

    return materials.filter((material) =>
      material.name.toLowerCase().includes(term) ||
      String(material.stock).includes(term) ||
      (material.status ? 'active' : 'inactive').includes(term),
    );
  }, [materials, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (material: Material) => {
    setEditing(material);
    setForm({
      name: material.name,
      stock: String(material.stock),
      status: material.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const normalizedName = normalizeMaterialName(form.name);
    const stock = parseStock(form.stock);

    if (!normalizedName) {
      toast.error('Material name is required.');
      return;
    }

    const duplicate = materials.find((material) =>
      material.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
      material.id !== editing?.id,
    );

    if (duplicate) {
      toast.error('A material with this name already exists. Edit it instead.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateMaterial(
          editing.id,
          {
            name: normalizedName,
            stock,
            status: form.status,
          },
          user?.email || user?.uid || 'admin',
        );
        toast.success('Material updated.');
      } else {
        await createMaterial(
          {
            name: normalizedName,
            stock,
            status: form.status,
          },
          user?.email || user?.uid || 'admin',
        );
        toast.success('Material created.');
      }

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await loadMaterials();
    } catch (error) {
      console.error('Failed to save material:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save material.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (material: Material) => {
    if (!window.confirm(`Delete material "${material.name}"?`)) return;

    try {
      await deleteMaterial(material.id, user?.email || user?.uid || 'admin');
      toast.success('Material deleted.');
      await loadMaterials();
    } catch (error) {
      console.error('Failed to delete material:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete material.');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Materials</h1>
          <p className="mt-1 text-stone-500">Manage raw materials, opening stock, and availability for production entry.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin/production"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
          >
            Back to Production
          </Link>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Material
          </Button>
        </div>
      </div>

      <div className="mb-5 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search materials by name, stock, or status"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-16 w-16" />}
          title={materials.length === 0 ? 'No materials yet' : 'No materials match your search'}
          description={
            materials.length === 0
              ? 'Create your first material so production entry can track consumption.'
              : 'Try a different search term.'
          }
          action={
            materials.length === 0 ? (
              <Button onClick={openCreate}>Create Material</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Material</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Stock</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Updated</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredMaterials.map((material) => (
                  <tr key={material.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{material.name}</p>
                        <p className="text-xs text-stone-500">Created {formatDate(material.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-stone-900">{material.stock}</td>
                    <td className="px-5 py-4">
                      <Badge variant={material.status ? 'success' : 'default'}>
                        {material.status ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDate(material.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(material)}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-amber-50 hover:text-amber-600"
                          title="Edit material"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(material)}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete material"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditing(null);
          setForm(emptyForm);
        }}
        title={editing ? 'Edit Material' : 'Add Material'}
      >
        <div className="space-y-4">
          <Input
            id="materialName"
            label="Material Name *"
            placeholder="e.g. PET Preform"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            id="materialStock"
            label="Current Stock *"
            type="number"
            min={0}
            placeholder="0"
            value={form.stock}
            onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
            helpText="Update this quantity whenever material inventory changes."
          />
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))}
              className="h-4 w-4 accent-amber-600"
            />
            <span className="text-sm font-medium text-stone-700">Active material</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Update Material' : 'Create Material'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
                setForm(emptyForm);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
