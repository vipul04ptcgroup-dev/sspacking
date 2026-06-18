const ProductCard = ({ product }) => {
  const firstTier = product.pricingTiers?.[0];
  const specification = [product.capacity, product.material, product.color].filter(Boolean).join(" - ");

  return (
    <div className="rounded-xl border p-4 shadow-sm transition hover:shadow-md">
      <img
        src={product.image || product.images?.[0]}
        alt={product.name}
        className="h-40 w-full rounded-lg object-cover"
      />

      <h2 className="mt-3 text-lg font-semibold">{product.name}</h2>
      <p className="text-sm text-gray-500">{specification || product.sku || "Single product"}</p>
      <p className="mt-2 font-bold text-blue-600">Rs. {firstTier?.unitPrice ?? 0}</p>
      <button
        type="button"
        className="mt-3 inline-flex items-center rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600"
      >
        Enquiry
      </button>
    </div>
  );
};

export default ProductCard;
