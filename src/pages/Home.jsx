import ProductCard from "../components/ProductCard";

const dummyProducts = [
  {
    _id: "1",
    name: "Plastic Bottle",
    image: "https://via.placeholder.com/150",
    variants: [{ size: "250ml", material: "Plastic", price: 20 }],
  },
];

const Home = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {dummyProducts.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default Home;