"use client";

import { FormEvent, useMemo, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function todayIsoDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatAppointmentDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function BookingForm({
  slug,
  branches,
  services,
}: {
  slug: string;
  branches: any[];
  services: any[];
}) {
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [date, setDate] = useState(todayIsoDate());
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [status, setStatus] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId],
  );

  async function loadSlots() {
    if (!branchId || !serviceId || !date) return;
    setLoadingSlots(true);
    setStatus("");
    setSlot("");
    try {
      const query = new URLSearchParams({
        branchId,
        serviceId,
        date: `${date}T12:00:00.000Z`,
      });
      const res = await fetch(`${apiUrl}/appointments/available?${query}`);
      if (!res.ok) throw new Error("No se pudo consultar disponibilidad.");
      setSlots(await res.json());
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!slot) {
      setStatus("Selecciona un horario disponible.");
      return;
    }

    setStatus("Enviando reserva...");
    try {
      const startTime = `${date}T${slot}:00.000Z`;

      const fullName = String(form.get("fullName") || "").trim();
      const [firstName, ...lastNameParts] = fullName.split(" ");

      const res = await fetch(`${apiUrl}/appointments/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          serviceId,
          startTime,
          clientInfo: {
            firstName: firstName || fullName,
            lastName: lastNameParts.join(" ") || "Cliente",
            email: form.get("email"),
            phone: form.get("phone"),
            termsAccepted: form.get("termsAccepted") === "on",
          },
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "No se pudo crear la reserva.");
      setConfirmation(body);
      setStatus("");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  if (confirmation) {
    return (
      <section className="rounded-[2rem] bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--secondary-color)]">
          Reserva creada
        </p>
        <h2 className="mt-2 text-3xl font-bold">Tu cita quedó pendiente de pago</h2>
        <div className="mt-6 space-y-3 rounded-3xl bg-[#f8f3ee] p-6">
          <p><strong>Servicio:</strong> {confirmation.service?.name}</p>
          <p><strong>Fecha:</strong> {formatAppointmentDateTime(confirmation.startTime)}</p>
          <p><strong>Monto:</strong> ${confirmation.payment?.amount}</p>
        </div>
        <p className="mt-6 text-[#62706d]">
          En local, el worker imprime en consola el link temporal para subir el comprobante.
          Ese link también queda disponible en Redis durante 24 horas.
        </p>
        <a href={`/${slug}`} className="mt-8 inline-flex rounded-2xl bg-[var(--primary-color)] px-5 py-3 font-semibold text-white">
          Crear otra reserva
        </a>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[2rem] bg-white p-8 shadow-xl">
      <h2 className="text-2xl font-bold">Agenda tu cita</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Servicio
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input">
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · ${service.price}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Sucursal
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input">
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Fecha
          <input value={date} min={todayIsoDate()} onChange={(e) => setDate(e.target.value)} type="date" className="input" />
        </label>

        <button type="button" onClick={loadSlots} className="mt-7 rounded-2xl bg-[#243b37] px-5 py-3 font-semibold text-white">
          {loadingSlots ? "Consultando..." : "Ver horarios"}
        </button>
      </div>

      {selectedService && (
        <p className="mt-4 text-sm text-[#62706d]">{selectedService.description}</p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {slots.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSlot(item)}
            className={`rounded-2xl border px-4 py-3 font-semibold transition ${
              slot === item
                ? "border-[var(--primary-color)] bg-[var(--primary-color)] text-white"
                : "border-[#e6d9cd] bg-[#f8f3ee] text-[#243b37]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4">
        <input name="fullName" required placeholder="Nombre completo" className="input" />
        <input name="email" required type="email" placeholder="Correo" className="input" />
        <input name="phone" required placeholder="Teléfono" className="input" />
        <label className="flex items-center gap-3 text-sm text-[#62706d]">
          <input name="termsAccepted" required type="checkbox" />
          Acepto términos y condiciones.
        </label>
      </div>

      {status && <p className="mt-4 rounded-2xl bg-[#fff4e8] p-4 text-sm text-[#8a4b1f]">{status}</p>}

      <button className="mt-6 w-full rounded-2xl bg-[var(--primary-color)] px-5 py-4 font-bold text-white">
        Confirmar reserva
      </button>
    </form>
  );
}
