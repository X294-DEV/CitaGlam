"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  AvailabilityResponse,
  AvailabilitySlot,
  BranchDto,
  CreatePublicAppointmentRequest,
  PublicAppointmentResponse,
  PublicServiceDto,
} from "@cgbg/shared-types";
import { readApiError } from "../lib/api";
import { formatDateTime, formatRange, todayInZone } from "../lib/datetime";
import { COUNTRIES, toInternationalPhone } from "../lib/phone";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function BookingForm({
  slug,
  branches,
  services,
}: {
  slug: string;
  branches: BranchDto[];
  services: PublicServiceDto[];
}) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(() =>
    branches[0] ? todayInZone(branches[0].timezone) : "",
  );
  const [slots, setSlots] = useState<AvailabilityResponse | null>(null);
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dial, setDial] = useState<string>(COUNTRIES[0].dial);
  const [status, setStatus] = useState("");
  const [confirmation, setConfirmation] = useState<PublicAppointmentResponse | null>(null);

  const branch = useMemo(
    () => branches.find((item) => item.id === branchId),
    [branches, branchId],
  );
  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId],
  );
  const minDate = branch ? todayInZone(branch.timezone) : "";

  function resetSlots() {
    setSlots(null);
    setSlot(null);
    setStatus("");
  }

  function changeBranch(id: string) {
    setBranchId(id);
    const next = branches.find((item) => item.id === id);
    if (next) {
      const today = todayInZone(next.timezone);
      if (date < today) setDate(today);
    }
    resetSlots();
  }

  async function loadSlots() {
    if (!branchId || !serviceId || !date) return;
    setLoadingSlots(true);
    resetSlots();
    try {
      const query = new URLSearchParams({ branchId, serviceId, date });
      const res = await fetch(`${apiUrl}/appointments/available?${query}`);
      if (!res.ok) {
        throw new Error(await readApiError(res, "No se pudo consultar disponibilidad."));
      }
      setSlots((await res.json()) as AvailabilityResponse);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    if (!slot) {
      setStatus("Selecciona un horario disponible.");
      return;
    }
    if (form.get("termsAccepted") !== "on") {
      setStatus("Debes aceptar los términos y condiciones para reservar.");
      return;
    }
    const phone = toInternationalPhone(dial, String(form.get("phone") ?? ""));
    if (!phone) {
      setStatus("Escribe un teléfono válido, solo con números.");
      return;
    }

    const body: CreatePublicAppointmentRequest = {
      slug,
      branchId,
      serviceId,
      startTime: slot.startTime,
      clientInfo: {
        firstName: String(form.get("firstName") ?? "").trim(),
        lastName: String(form.get("lastName") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        phone,
      },
      termsAccepted: true,
    };

    setSubmitting(true);
    setStatus("Enviando reserva...");
    try {
      const res = await fetch(`${apiUrl}/appointments/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "No se pudo crear la reserva."));
      }
      setConfirmation((await res.json()) as PublicAppointmentResponse);
      setStatus("");
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    const zone = confirmation.branch.timezone;
    return (
      <section className="rounded-[2rem] bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--secondary-color)]">
          Reserva creada
        </p>
        <h2 className="mt-2 text-3xl font-bold">Tu cita quedó pendiente de pago</h2>
        <div className="mt-6 space-y-3 rounded-3xl bg-[#f8f3ee] p-6">
          <p>
            <strong>Servicio:</strong> {confirmation.service.name} ({confirmation.service.durationMin} min)
          </p>
          <p>
            <strong>Sucursal:</strong> {confirmation.branch.name}
          </p>
          <p>
            <strong>Fecha:</strong> {formatDateTime(confirmation.startTime, zone)}
          </p>
          <p>
            <strong>Horario:</strong> {formatRange(confirmation.startTime, confirmation.endTime, zone)}
          </p>
          {confirmation.payment && (
            <p>
              <strong>Monto:</strong> ${confirmation.payment.amount}
            </p>
          )}
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

  if (branches.length === 0 || services.length === 0) {
    return (
      <section className="rounded-[2rem] bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-bold">Reservas no disponibles</h2>
        <p className="mt-4 text-[#62706d]">
          Este negocio todavía no tiene {branches.length === 0 ? "sucursales" : "servicios"} publicados.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[2rem] bg-white p-8 shadow-xl">
      <h2 className="text-2xl font-bold">Agenda tu cita</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Servicio
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              resetSlots();
            }}
            className="input"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.durationMin} min · ${service.price}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Sucursal
          <select value={branchId} onChange={(e) => changeBranch(e.target.value)} className="input">
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Fecha
          <input
            value={date}
            min={minDate}
            onChange={(e) => {
              setDate(e.target.value);
              resetSlots();
            }}
            type="date"
            className="input"
          />
        </label>

        <button type="button" onClick={loadSlots} className="mt-7 rounded-2xl bg-[#243b37] px-5 py-3 font-semibold text-white">
          {loadingSlots ? "Consultando..." : "Ver horarios"}
        </button>
      </div>

      {selectedService && (
        <p className="mt-4 text-sm text-[#62706d]">
          {selectedService.description} Duración: {selectedService.durationMin} min.
        </p>
      )}

      {slots && slots.length === 0 && (
        <p className="mt-6 rounded-2xl bg-[#f8f3ee] p-4 text-sm text-[#62706d]">
          No hay horarios disponibles ese día. Prueba con otra fecha.
        </p>
      )}

      {branch && slots && slots.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((item) => (
            <button
              key={item.startTime}
              type="button"
              onClick={() => setSlot(item)}
              className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                slot?.startTime === item.startTime
                  ? "border-[var(--primary-color)] bg-[var(--primary-color)] text-white"
                  : "border-[#e6d9cd] bg-[#f8f3ee] text-[#243b37]"
              }`}
            >
              {formatRange(item.startTime, item.endTime, branch.timezone)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="firstName" required autoComplete="given-name" placeholder="Nombre" className="input" />
          <input name="lastName" required autoComplete="family-name" placeholder="Apellido" className="input" />
        </div>
        <input name="email" required type="email" autoComplete="email" placeholder="Correo" className="input" />
        <div className="grid grid-cols-[auto_1fr] gap-4">
          <select
            aria-label="País del teléfono"
            value={dial}
            onChange={(e) => setDial(e.target.value)}
            className="input"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.dial}>
                {country.name} ({country.dial})
              </option>
            ))}
          </select>
          <input name="phone" required type="tel" autoComplete="tel-national" inputMode="tel" placeholder="Teléfono" className="input" />
        </div>
        <label className="flex items-center gap-3 text-sm text-[#62706d]">
          <input name="termsAccepted" required type="checkbox" />
          Acepto términos y condiciones.
        </label>
      </div>

      {status && <p className="mt-4 rounded-2xl bg-[#fff4e8] p-4 text-sm text-[#8a4b1f]">{status}</p>}

      <button
        disabled={submitting}
        className="mt-6 w-full rounded-2xl bg-[var(--primary-color)] px-5 py-4 font-bold text-white disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Confirmar reserva"}
      </button>
    </form>
  );
}
