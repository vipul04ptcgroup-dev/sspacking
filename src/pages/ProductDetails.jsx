// import { useState } from "react";
// import { useDispatch } from "react-redux";
// import { useParams } from "react-router-dom";
// import { addToCart } from "../redux/cartSlice";

// // Dummy product (later from API)
// const product = {
//     _id: "1",
//     name: "Bottle",
//     image: "https://via.placeholder.com/300",
//     variants: [
//         { size: "250ml", material: "Plastic", price: 20, stock: 10 },
//         { size: "250ml", material: "Glass", price: 30, stock: 5 },
//         { size: "500ml", material: "Plastic", price: 25, stock: 8 },
//         { size: "500ml", material: "Glass", price: 40, stock: 2 },
//     ],
// };

// const ProductDetails = () => {
//     const { id } = useParams();

//     const dispatch = useDispatch();

//     const [selectedSize, setSelectedSize] = useState("");
//     const [selectedMaterial, setSelectedMaterial] = useState("");

//     // Extract unique sizes & materials
//     const sizes = [...new Set(product.variants.map(v => v.size))];
//     const materials = [...new Set(product.variants.map(v => v.material))];

//     // Find selected variant
//     const selectedVariant = product.variants.find(
//         (v) => v.size === selectedSize && v.material === selectedMaterial
//     );

//     return (
//         <div className="max-w-5xl mx-auto grid grid-cols-2 gap-10">

//             {/* Image */}
//             <img
//                 src={product.image}
//                 alt={product.name}
//                 className="w-full rounded-xl"
//             />

//             {/* Info */}
//             <div>
//                 <h1 className="text-2xl font-bold">{product.name}</h1>

//                 {/* Size Selector */}
//                 <div className="mt-4">
//                     <h3 className="font-semibold">Select Size</h3>
//                     <div className="flex gap-3 mt-2">
//                         {sizes.map((size) => (
//                             <button
//                                 key={size}
//                                 onClick={() => setSelectedSize(size)}
//                                 className={`px-4 py-2 border rounded ${selectedSize === size ? "bg-blue-600 text-white" : ""
//                                     }`}
//                             >
//                                 {size}
//                             </button>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Material Selector */}
//                 <div className="mt-4">
//                     <h3 className="font-semibold">Select Material</h3>
//                     <div className="flex gap-3 mt-2">
//                         {materials.map((mat) => (
//                             <button
//                                 key={mat}
//                                 onClick={() => setSelectedMaterial(mat)}
//                                 className={`px-4 py-2 border rounded ${selectedMaterial === mat ? "bg-blue-600 text-white" : ""
//                                     }`}
//                             >
//                                 {mat}
//                             </button>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Price */}
//                 <div className="mt-6">
//                     <p className="text-xl font-bold text-blue-600">
//                         {selectedVariant ? `₹${selectedVariant.price}` : "Select options"}
//                     </p>

//                     {/* Stock */}
//                     {selectedVariant && (
//                         <p className="text-sm text-gray-500">
//                             Stock: {selectedVariant.stock}
//                         </p>
//                     )}
//                 </div>

//                 {/* Add to Cart */}
//                 <button
//                     // onClick={() => {
//                     //     if (!selectedVariant) return;
//                     //     dispatch(
//                     //         addToCart({
//                     //             productId: product._id,
//                     //             name: product.name,
//                     //             image: product.image,
//                     //             price: selectedVariant.price,
//                     //             size: selectedVariant.size,
//                     //             material: selectedVariant.material,
//                     //         })
//                     //     );
//                     // }}
//                     className={`mt-6 w-full py-3 rounded-lg text-white ${selectedVariant
//                             ? "bg-blue-600 cursor-pointer"
//                             : "bg-gray-400 cursor-not-allowed pointer-events-none"
//                         }`}
//                 >
//                     Add to Cart
//                 </button>
//             </div>
//         </div >
//     );
// };

// export default ProductDetails;