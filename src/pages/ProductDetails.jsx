import { useState } from "react";

const product = {
  _id: "1",
  name: "Bottle",
  image: "https://via.placeholder.com/300",
  variants: [
    { size: "250ml", material: "Plastic", price: 20, stock: 10 },
    { size: "250ml", material: "Glass", price: 30, stock: 5 },
    { size: "500ml", material: "Plastic", price: 25, stock: 8 },
    { size: "500ml", material: "Glass", price: 40, stock: 2 },
  ],
};

const ProductDetails = () => {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const sizes = [...new Set(product.variants.map((variant) => variant.size))];
  const materials = [...new Set(product.variants.map((variant) => variant.material))];

  const selectedVariant = product.variants.find(
    (variant) => variant.size === selectedSize && variant.material === selectedMaterial,
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
      <img src={product.image} alt={product.name} className="w-full rounded-xl" />

      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>

        <div className="mt-4">
          <h3 className="font-semibold">Select Size</h3>
          <div className="mt-2 flex gap-3">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`rounded border px-4 py-2 ${selectedSize === size ? "bg-blue-600 text-white" : ""}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold">Select Material</h3>
          <div className="mt-2 flex gap-3">
            {materials.map((material) => (
              <button
                key={material}
                onClick={() => setSelectedMaterial(material)}
                className={`rounded border px-4 py-2 ${selectedMaterial === material ? "bg-blue-600 text-white" : ""}`}
              >
                {material}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xl font-bold text-blue-600">
            {selectedVariant ? `Rs. ${selectedVariant.price}` : "Select options"}
          </p>

          {selectedVariant && <p className="text-sm text-gray-500">Stock: {selectedVariant.stock}</p>}
        </div>

        <button
          disabled={!selectedVariant}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-white disabled:bg-gray-400"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;