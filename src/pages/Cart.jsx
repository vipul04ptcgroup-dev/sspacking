import { useSelector, useDispatch } from "react-redux";
import { removeFromCart, updateQuantity } from "../redux/cartSlice";

const Cart = () => {
  const { cartItems } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  const total = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      {cartItems.length === 0 ? (
        <p>Cart is empty</p>
      ) : (
        cartItems.map((item, index) => (
          <div
            key={index}
            className="border p-4 rounded-lg mb-4 flex justify-between items-center"
          >
            <div className="flex items-center gap-4">
              <img
                src={item.image}
                className="w-16 h-16 object-cover rounded"
              />

              <div>
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-sm text-gray-500">
                  {item.size} • {item.material}
                </p>
                <p className="text-blue-600 font-bold">₹{item.price}</p>
              </div>
            </div>

            <input
              type="number"
              value={item.quantity}
              min="1"
              onChange={(e) =>
                dispatch(
                  updateQuantity({
                    id: item.id,
                    quantity: Number(e.target.value),
                  })
                )
              }
              className="w-16 border px-2 py-1"
            />

            <button
              onClick={() => dispatch(removeFromCart(item.id))}
              className="text-red-500"
            >
              Remove
            </button>
          </div>
        ))
      )}

      <div className="mt-6 text-right">
        <h2 className="text-xl font-bold">Total: ₹{total}</h2>
      </div>
    </div>
  );
};

export default Cart;