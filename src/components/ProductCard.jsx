import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  const firstVariant = product.variants?.[0];

  return (
    <div className="border rounded-xl p-4 shadow-sm hover:shadow-md transition">
      
      <img
        src={product.image}
        alt={product.name}
        className="h-40 w-full object-cover rounded-lg"
      />

      <h2 className="text-lg font-semibold mt-3">{product.name}</h2>

      <p className="text-gray-500 text-sm">
        {firstVariant?.material} • {firstVariant?.size}
      </p>

      <p className="text-blue-600 font-bold mt-2">
        ₹{firstVariant?.price}
      </p>

      <Link
        to={`/product/${product._id}`}
        className="block mt-3 text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        View Details
      </Link>
    </div>
  );
};

export default ProductCard;