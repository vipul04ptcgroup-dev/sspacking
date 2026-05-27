const ProductCard = ({ product }) => {
  const firstVariant = product.variants?.[0];

  return (
    <div className="rounded-xl border p-4 shadow-sm transition hover:shadow-md">
      <img
        src={product.image}
        alt={product.name}
        className="h-40 w-full rounded-lg object-cover"
      />

      <h2 className="mt-3 text-lg font-semibold">{product.name}</h2>
      <p className="text-sm text-gray-500">
        {firstVariant?.material} - {firstVariant?.size}
      </p>
      <p className="mt-2 font-bold text-blue-600">Rs. {firstVariant?.price}</p>
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
