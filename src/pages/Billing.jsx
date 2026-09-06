import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]); // {productId, name, price, unit, gstPercent, quantity, availableStock}
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("0");
  const [payments, setPayments] = useState([{ mode: "Cash", amount: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const cartSectionRef = useRef(null);

  // Load ALL products upfront so they're visible without needing to search
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get("/products");
        setProducts(data);
      } catch (err) {
        toast.error("Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  // Client-side filter as the person types - no extra API calls needed
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      toast.error("Out of stock!");
      return;
    }
    const existing = cart.find((c) => c.productId === product._id);
    if (existing) {
      if (existing.quantity + 1 > product.quantity) {
        toast.error("Not enough stock");
        return;
      }
      setCart(cart.map((c) => (c.productId === product._id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([
        ...cart,
        {
          productId: product._id,
          name: product.name,
          price: product.sellingPrice,
          unit: product.unit,
          gstPercent: product.gstPercent,
          quantity: 1,
          availableStock: product.quantity,
        },
      ]);
    }
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.productId !== productId));
      return;
    }
    const item = cart.find((c) => c.productId === productId);
    if (qty > item.availableStock) {
      toast.error(`Only ${item.availableStock} ${item.unit} available`);
      return;
    }
    setCart(cart.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c)));
  };

  const removeFromCart = (productId) => setCart(cart.filter((c) => c.productId !== productId));

  // Calculations
  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const totalGst = cart.reduce((sum, c) => sum + (c.price * c.quantity * c.gstPercent) / 100, 0);
  const discountAmount = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal + totalGst - discountAmount);

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  const addPaymentRow = () => setPayments([...payments, { mode: "Cash", amount: "" }]);
  const updatePayment = (idx, field, value) => {
    const updated = [...payments];
    updated[idx][field] = value;
    setPayments(updated);
  };
  const removePayment = (idx) => setPayments(payments.filter((_, i) => i !== idx));

  const autoFillFullAmount = () => {
    setPayments([{ mode: "Cash", amount: grandTotal.toFixed(2) }]);
  };

  const handleCreateBill = async () => {
    if (cart.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    const validPayments = payments.filter((p) => Number(p.amount) > 0);

    setSubmitting(true);
    try {
      const { data } = await api.post("/bills", {
        customerName: customerName || "Walk-in Customer",
        customerPhone,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        discount: discountAmount,
        payments: validPayments.length > 0 ? validPayments : [{ mode: "Cash", amount: grandTotal }],
      });
      toast.success(`Bill ${data.billNumber} created!`);
      navigate(`/bills/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create bill");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">New Bill</h2>

      {/* Customer Info */}
      <div className="card space-y-2">
        <input className="input-field" placeholder="Customer name (optional)" value={customerName}
          onChange={(e) => setCustomerName(e.target.value)} />
        <input className="input-field" placeholder="Phone number (optional)" value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)} />
      </div>

      {/* Products - always visible, tap to add */}
      <div className="card space-y-2">
        <input className="input-field" placeholder="🔍 Filter products (optional)..." value={search}
          onChange={(e) => setSearch(e.target.value)} />

        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === c ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto mt-2">
          {filteredProducts.map((p) => {
            const cartItem = cart.find((c) => c.productId === p._id);

            // Already in the cart: show a quick +/- stepper right on the card,
            // so quantity can be adjusted without scrolling down to the cart list.
            if (cartItem) {
              return (
                <div
                  key={p._id}
                  className="flex flex-col items-start p-3 rounded-xl border-2 border-primary-400 bg-primary-50 text-left"
                >
                  <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">₹{p.sellingPrice}/{p.unit}</p>
                  <div className="flex items-center justify-between gap-2 mt-2 w-full">
                    <button
                      onClick={() => updateQty(p._id, cartItem.quantity - 1)}
                      className="w-7 h-7 bg-white border border-primary-300 rounded-lg font-bold text-primary-700 shrink-0"
                    >
                      -
                    </button>
                    <span className="font-semibold text-sm text-primary-700">{cartItem.quantity} {p.unit}</span>
                    <button
                      onClick={() => updateQty(p._id, cartItem.quantity + 1)}
                      className="w-7 h-7 bg-white border border-primary-300 rounded-lg font-bold text-primary-700 shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={p._id}
                onClick={() => addToCart(p)}
                disabled={p.quantity <= 0}
                className="flex flex-col items-start p-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-left disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
              >
                <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">₹{p.sellingPrice}/{p.unit}</p>
                <p className={`text-xs mt-1 font-medium ${p.quantity <= p.lowStockThreshold ? "text-red-500" : "text-green-600"}`}>
                  Stock: {p.quantity}
                </p>
              </button>
            );
          })}
          {filteredProducts.length === 0 && <p className="text-sm text-gray-400 py-4 col-span-2 text-center">No products found</p>}
        </div>
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div ref={cartSectionRef} className="card space-y-3">
          <p className="font-semibold text-gray-700">Items ({cart.length})</p>
          {cart.map((item) => (
            <div key={item.productId} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">₹{item.price} x {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-7 h-7 bg-gray-100 rounded-lg font-bold">-</button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-7 h-7 bg-gray-100 rounded-lg font-bold">+</button>
                <button onClick={() => removeFromCart(item.productId)} className="text-red-500 text-sm ml-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      {cart.length > 0 && (
        <div className="card space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>GST</span><span>₹{totalGst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Discount</span>
            <input type="number" className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-right"
              value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t border-gray-100">
            <span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Split Payments */}
      {cart.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-700">Payment</p>
            <button onClick={autoFillFullAmount} className="text-xs text-primary-600 font-medium">Fill full amount</button>
          </div>
          {payments.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select className="input-field flex-1" value={p.mode} onChange={(e) => updatePayment(idx, "mode", e.target.value)}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Credit</option>
              </select>
              <input type="number" className="input-field flex-1" placeholder="Amount" value={p.amount}
                onChange={(e) => updatePayment(idx, "amount", e.target.value)} />
              {payments.length > 1 && (
                <button onClick={() => removePayment(idx)} className="text-red-500 px-2">✕</button>
              )}
            </div>
          ))}
          <button onClick={addPaymentRow} className="text-sm text-primary-600 font-medium">+ Add split payment</button>

          <div className="pt-2 border-t border-gray-100 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Total Paid</span><span>₹{totalPaid.toFixed(2)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-red-500 font-medium">
                <span>Balance Due (Credit)</span><span>₹{balanceDue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <button onClick={handleCreateBill} disabled={submitting} className="btn-primary w-full text-lg">
          {submitting ? "Creating Bill..." : `Generate Bill — ₹${grandTotal.toFixed(2)}`}
        </button>
      )}

      {/* Floating summary bar - stays visible while scrolling the product grid,
          so the running total/item count is never out of sight. Tapping it
          jumps straight to the cart for a final review. */}
      {cart.length > 0 && (
        <button
          onClick={() => cartSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-30 bg-gray-900 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between active:scale-[0.98] transition"
        >
          <span className="text-sm font-medium">🛒 {cart.reduce((s, c) => s + c.quantity, 0)} items</span>
          <span className="font-bold text-sm">₹{grandTotal.toFixed(2)} · Review ↓</span>
        </button>
      )}
    </div>
  );
};

export default Billing;
