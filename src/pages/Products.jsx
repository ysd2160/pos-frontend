import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const emptyForm = {
  name: "",
  category: "",
  hsn: "",
  unit: "pcs",
  costPrice: "",
  sellingPrice: "",
  gstPercent: "",
  quantity: "",
  lowStockThreshold: "5",
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [stockModal, setStockModal] = useState(null); // product being restocked

  const fetchProducts = async () => {
    try {
      const { data } = await api.get(`/products${search ? `?search=${search}` : ""}`);
      setProducts(data);
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (p) => {
    setForm({
      name: p.name,
      category: p.category,
      hsn: p.hsn || "",
      unit: p.unit,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      gstPercent: p.gstPercent,
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, form);
        toast.success("Product updated");
      } else {
        await api.post("/products", form);
        toast.success("Product added");
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product removed");
      fetchProducts();
    } catch (err) {
      toast.error("Failed to remove product");
    }
  };

  const handleStockAdd = async (e) => {
    e.preventDefault();
    const qty = e.target.qty.value;
    try {
      await api.patch(`/products/${stockModal._id}/stock`, {
        quantity: qty,
        type: "IN",
        reason: "Restocked via app",
      });
      toast.success("Stock updated");
      setStockModal(null);
      fetchProducts();
    } catch (err) {
      toast.error("Failed to update stock");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Products</h2>
        <button onClick={openAddForm} className="btn-primary text-sm px-3 py-2">
          + Add Product
        </button>
      </div>

      <input
        className="input-field"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No products found. Add your first product!</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p._id} className="card flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">{p.category} • ₹{p.sellingPrice}/{p.unit} • GST {p.gstPercent}%{p.hsn ? ` • HSN ${p.hsn}` : ""}</p>
                <p className={`text-sm font-medium mt-1 ${p.quantity <= p.lowStockThreshold ? "text-red-500" : "text-green-600"}`}>
                  Stock: {p.quantity} {p.unit}
                </p>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                <button onClick={() => setStockModal(p)} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg font-medium">
                  + Stock
                </button>
                <button onClick={() => openEditForm(p)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(p._id)} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg font-medium">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-30 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto p-5">
            <h3 className="text-lg font-bold mb-4">{editingId ? "Edit Product" : "Add Product"}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required className="input-field" placeholder="Product name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input-field" placeholder="Category (e.g. Frozen Snacks)" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Unit (pcs/kg)" value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                <input type="number" step="0.01" className="input-field" placeholder="GST %" value={form.gstPercent}
                  onChange={(e) => setForm({ ...form, gstPercent: e.target.value })} />
              </div>
              <input className="input-field" placeholder="HSN/SAC code (optional, for tax invoice)" value={form.hsn}
                onChange={(e) => setForm({ ...form, hsn: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" step="0.01" className="input-field" placeholder="Cost Price ₹" value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                <input required type="number" step="0.01" className="input-field" placeholder="Selling Price ₹" value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              </div>
              {!editingId && (
                <input type="number" className="input-field" placeholder="Initial Stock Quantity" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              )}
              <input type="number" className="input-field" placeholder="Low stock alert threshold" value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Add Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-30 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-5">
            <h3 className="text-lg font-bold mb-1">Add Stock</h3>
            <p className="text-sm text-gray-500 mb-4">{stockModal.name} — current: {stockModal.quantity} {stockModal.unit}</p>
            <form onSubmit={handleStockAdd} className="space-y-3">
              <input name="qty" type="number" required autoFocus className="input-field" placeholder="Quantity to add" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setStockModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
