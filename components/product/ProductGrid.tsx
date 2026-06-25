import ProductCard from './ProductCard';
import type { ClientProduct } from '@/lib/client-serialization';
import { EmptyState } from '@/components/ui';
import { Package } from 'lucide-react';

interface ProductGridProps {
  products: ClientProduct[];
  loading?: boolean;
}

export default function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-100 overflow-hidden animate-pulse">
            <div className="aspect-square bg-stone-100" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-stone-100 rounded w-1/3" />
              <div className="h-4 bg-stone-100 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-full" />
              <div className="h-5 bg-stone-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        icon={<Package className="w-16 h-16" />}
        title="No products found"
        description="Try adjusting your filters or search query."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
