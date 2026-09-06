import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const BillView = () => {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const { data } = await api.get(`/bills/${id}`);
        setBill(data);
      } catch (err) {
        toast.error("Failed to load bill");
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/bills/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${bill.billNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  const shareOnWhatsApp = () => {
    const itemsText = bill.items.map((i) => `${i.name} x${i.quantity} = ₹${(i.lineTotal + i.gstAmount).toFixed(2)}`).join("\n");
    const message = `*Bill ${bill.billNumber}*\n${new Date(bill.createdAt).toLocaleDateString("en-IN")}\n\n${itemsText}\n\n*Grand Total: ₹${bill.grandTotal.toFixed(2)}*\nStatus: ${bill.paymentStatus}\n\nThank you for your business!`;
    const phone = bill.customerPhone ? bill.customerPhone.replace(/\D/g, "") : "";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (!bill) return <p className="text-gray-400">Bill not found</p>;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="card">
        <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
          <h2 className="text-lg font-bold text-gray-800">{bill.billNumber}</h2>
          <p className="text-sm text-gray-500">{new Date(bill.createdAt).toLocaleString("en-IN")}</p>
        </div>

        <div className="text-sm space-y-1 mb-3">
          <p><span className="text-gray-500">Customer:</span> {bill.customerName}</p>
          {bill.customerPhone && <p><span className="text-gray-500">Phone:</span> {bill.customerPhone}</p>}
          {bill.createdBy?.name && <p><span className="text-gray-500">Billed by:</span> {bill.createdBy.name}</p>}
        </div>

        <div className="border-t border-dashed border-gray-300 pt-3 space-y-2">
          {bill.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.name} x{item.quantity}</span>
              <span className="font-medium">₹{(item.lineTotal + item.gstAmount).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-600"><span>GST</span><span>₹{bill.totalGst.toFixed(2)}</span></div>
          {bill.discount > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span>-₹{bill.discount.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-base pt-1"><span>Grand Total</span><span>₹{bill.grandTotal.toFixed(2)}</span></div>
        </div>

        <div className="border-t border-dashed border-gray-300 mt-3 pt-3 text-sm space-y-1">
          {bill.payments.map((p, idx) => (
            <div key={idx} className="flex justify-between text-gray-600">
              <span>{p.mode}</span><span>₹{p.amount.toFixed(2)}</span>
            </div>
          ))}
          {bill.balanceDue > 0 && (
            <div className="flex justify-between text-red-500 font-semibold pt-1">
              <span>Balance Due</span><span>₹{bill.balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={downloadPDF} className="btn-secondary">📄 Download PDF</button>
        <button onClick={shareOnWhatsApp} className="btn-primary">💬 Share WhatsApp</button>
      </div>
    </div>
  );
};

export default BillView;
