"use client";

import { FormEvent, useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatAppointmentDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function ReceiptUploadForm({ token }: { token: string }) {
  const [appointment, setAppointment] = useState<any>(null);
  const [status, setStatus] = useState("Validando enlace...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/receipts/validate/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "El enlace no es válido.");
        setAppointment(body);
        setStatus("");
      })
      .catch((error) => setStatus((error as Error).message));
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Subiendo comprobante...");
    try {
      const res = await fetch(`${apiUrl}/receipts/upload/${token}`, {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "No se pudo subir el comprobante.");
      setDone(true);
      setStatus(body.message);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b98f70]">
        Comprobante de pago
      </p>
      <h1 className="mt-2 text-3xl font-bold">Sube tu comprobante</h1>

      {appointment && (
        <div className="mt-6 space-y-2 rounded-3xl bg-[#f8f3ee] p-5 text-sm">
          <p><strong>Negocio:</strong> {appointment.tenantName}</p>
          <p><strong>Servicio:</strong> {appointment.serviceName}</p>
          <p><strong>Sucursal:</strong> {appointment.branchName}</p>
          <p><strong>Fecha:</strong> {formatAppointmentDateTime(appointment.startTime)}</p>
          <p><strong>Monto:</strong> ${appointment.amount}</p>
        </div>
      )}

      {!done && appointment && (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <input
            name="file"
            required
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="block w-full rounded-2xl border border-[#e6d9cd] p-4"
          />
          <button className="w-full rounded-2xl bg-[#243b37] px-5 py-4 font-bold text-white">
            Enviar comprobante
          </button>
        </form>
      )}

      {status && (
        <p className="mt-6 rounded-2xl bg-[#fff4e8] p-4 text-sm text-[#8a4b1f]">
          {status}
        </p>
      )}
    </section>
  );
}
