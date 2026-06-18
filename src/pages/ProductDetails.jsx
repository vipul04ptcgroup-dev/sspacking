const product = {
  _id: "1",
  name: "Bottle",
  image: "https://via.placeholder.com/300",
  sku: "BOTTLE-001",
  unit: "gram",
  stockQuantity: 10,
  capacity: "500ml",
  material: "Plastic",
  color: "Clear",
  pricingTiers: [
    { minQty: 1, maxQty: 99, unitPrice: 25 },
    { minQty: 100, maxQty: 499, unitPrice: 22 },
    { minQty: 500, maxQty: 999, unitPrice: 20 },
  ],
};

const ProductDetails = () => {
  const startingPrice = product.pricingTiers[0]?.unitPrice ?? 0;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
      <img src={product.image} alt={product.name} className="w-full rounded-xl" />

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="mt-3 text-sm text-gray-500">
          {product.capacity} {product.material ? `- ${product.material}` : ""} {product.color ? `- ${product.color}` : ""}
        </p>
        <p className="mt-2 text-sm text-gray-500">SKU: {product.sku}</p>

        <div className="mt-6 rounded-xl border border-gray-200 p-4">
          <p className="text-xl font-bold text-blue-600">Starting at Rs. {startingPrice}</p>
          <p className="mt-1 text-sm text-gray-500">Stock: {product.stockQuantity} {product.unit === "kg" ? "KG" : "GRAM"}</p>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold">Pricing Tiers</h3>
          <div className="mt-3 space-y-2">
            {product.pricingTiers.map((tier) => (
              <div key={`${tier.minQty}-${tier.maxQty}`} className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm">
                <span>
                  {tier.minQty} to {tier.maxQty} units
                </span>
                <span className="font-semibold text-blue-600">Rs. {tier.unitPrice}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-white"
        >
          Enquiry Now
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;
