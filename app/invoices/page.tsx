"use client";

import { useState } from "react";

export default function InvoicesPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    drone: "",
    inventory: "",
    repairs: "",
    estimate: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateSMS = () => {
    const message = `Cardinal Drones Invoice / Estimate

Customer: ${form.name}
Phone: ${form.phone}

Drone / Item:
${form.drone}

Items Left:
${form.inventory}

Repairs:
${form.repairs}

Estimated Cost:
$${form.estimate}

This estimate is based on similar repairs and may change depending on actual condition.
We will contact you before proceeding if the cost exceeds this estimate.

- Cardinal Drones`;

    const encoded = encodeURIComponent(message);
    window.location.href = `sms:${form.phone}?body=${encoded}`;
  };

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-md">

        <div className="mb-8 flex justify-center">
          <img src="/CDlogo.png" alt="Cardinal Drones" className="w-full max-w-xs" />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0b1220] p-5">
          <h1 className="text-xl font-bold text-center">New Invoice</h1>

          <input name="name" placeholder="Customer Name" onChange={handleChange} className="w-full p-3 rounded bg-[#030712]" />
          <input name="phone" placeholder="Phone Number" onChange={handleChange} className="w-full p-3 rounded bg-[#030712]" />
          <input name="drone" placeholder="Drone / Item" onChange={handleChange} className="w-full p-3 rounded bg-[#030712]" />
          <textarea name="inventory" placeholder="Items Left With Us" onChange={handleChange} className="w-full p-3 rounded bg-[#030712]" />
          <textarea name="repairs" placeholder="Repairs" onChange={handleChange} className="w-full p-3 rounded bg-[#030712]" />
          <input name="estimate" placeholder="Estimate" onChange={handleChange} className="w-full p-3 rounded bg-[#030712]" />

          <button
            onClick={generateSMS}
            className="w-full p-4 bg-red-600 rounded font-semibold"
          >
            Send Invoice via Text
          </button>
        </div>
      </div>
    </main>
  );
}
