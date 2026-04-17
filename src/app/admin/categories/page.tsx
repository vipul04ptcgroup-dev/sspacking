'use client';

import { useEffect, useState } from 'react';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/firestore';
import { uploadCategoryImage } from '@/lib/storage';
import type { Category } from '@/types';
import { slugify } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea, Modal, EmptyState } from '@/components/ui';
import { Spinner } from '@/components/ui';
import { Plus, Pencil, Trash2, Tags, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

const emptyForm = { name: '', slug: '', description: '', image: '', order: 0, active: true };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => { setCategories(await getAllCategories()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ name: cat.name, slug: cat.slug, description: cat.description, image: cat.image || '', order: cat.order, active: cat.active }); setModalOpen(true); };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: editing ? f.slug : slugify(name) }));
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    if (uploading) { toast.error('Please wait for the image upload to finish'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, form);
        toast.success('Category updated!');
      } else {
        await createCategory(form as Omit<Category, 'id'>);
        toast.success('Category created!');
      }
      setModalOpen(false);
      load();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    await deleteCategory(id);
    toast.success('Category deleted');
    load();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const categoryId = editing?.id || `temp_${Date.now()}`;
      const image = await uploadCategoryImage(file, categoryId);
      setForm(f => ({ ...f, image }));
      toast.success(editing ? 'Category image updated!' : 'Category image uploaded!');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Categories</h1>
          <p className="text-stone-500 mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Add Category</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : categories.length === 0 ? (
        <EmptyState icon={<Tags className="w-16 h-16" />} title="No categories yet" action={<Button onClick={openNew}>Create First Category</Button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Slug</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-stone-50 transition">
                  <td className="px-5 py-4 font-semibold text-stone-900">{cat.name}</td>
                  <td className="px-5 py-4 text-sm text-stone-500 font-mono">{cat.slug}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{cat.order}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cat.active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {cat.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(cat)} className="p-2 text-stone-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <div className="space-y-4">
          <Input label="Category Name *" id="cat-name" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Bamboo Packaging" />
          <Input label="Slug" id="cat-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
          <Textarea label="Description" id="cat-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief category description" />
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-stone-700">Category Image</p>
              <p className="text-xs text-stone-500 mt-1">Upload a category image instead of pasting an image URL.</p>
            </div>
            {form.image ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group">
                <Image src={form.image} alt={form.name || 'Category image'} fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, image: '' }))}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/65 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove category image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 text-stone-400 transition hover:border-amber-400 hover:text-amber-600">
                <Upload className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                <span className="text-xs mt-1">PNG, JPG, or WebP</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            )}
            {form.image && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Replace Image'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>
          <Input label="Display Order" id="cat-order" type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-amber-600" />
            <span className="text-sm font-medium text-stone-700">Active (Visible on store)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving || uploading} className="flex-1">
              {editing ? 'Update' : 'Create'}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
