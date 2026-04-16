import ProductCard from "../components/ProductCard";

const dummyProducts = [
  {
    _id: "1",
    name: "Plastic Bottle",
    image: "https://via.placeholder.com/150",
    variants: [
      { size: "250ml", material: "Plastic", price: 20 },
    ],
  },
];

const Home = () => {
  return (
    <div className="grid grid-cols-4 gap-6">
      {dummyProducts.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default Home;