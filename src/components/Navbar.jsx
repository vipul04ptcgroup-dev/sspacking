import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md px-6 py-3 flex items-center justify-between">
      
      {/* Logo */}
      <Link to="/" className="text-xl font-bold text-blue-600">
        SSPacking
      </Link>

      {/* Search */}
      <div className="flex-1 mx-6">
        <input
          type="text"
          placeholder="Search bottles, containers..."
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        <Link to="/cart" className="font-medium hover:text-blue-600">
          Cart
        </Link>
        <Link to="/login" className="font-medium hover:text-blue-600">
          Login
        </Link>
      </div>

    </nav>
  );
};

export default Navbar;