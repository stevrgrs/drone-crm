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
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-xl font-bold">New Invoice</h1>

        <input name="name" placeholder="Customer Name" onChange={handleChange} className="w-full p-3 rounded bg-[#0b1220]" />
        <input name="phone" placeholder="Phone Number" onChange={handleChange} className="w-full p-3 rounded bg-[#0b1220]" />
        <input name="drone" placeholder="Drone / Item" onChange={handleChange} className="w-full p-3 rounded bg-[#0b1220]" />
        <textarea name="inventory" placeholder="Items Left With Us" onChange={handleChange} className="w-full p-3 rounded bg-[#0b1220]" />
        <textarea name="repairs" placeholder="Repairs" onChange={handleChange} className="w-full p-3 rounded bg-[#0b1220]" />
        <input name="estimate" placeholder="Estimate" onChange={handleChange} className="w-full p-3 rounded bg-[#0b1220]" />

        <button
          onClick={generateSMS}
          className="w-full p-4 bg-red-600 rounded font-semibold"
        >
          Send Invoice via Text
        </button>
      </div>
    </main>
  );
}
