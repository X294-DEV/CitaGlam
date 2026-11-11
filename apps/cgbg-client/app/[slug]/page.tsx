import BookingForm from "../components/BookingForm";
import ThemeInjector from "../components/ThemeInjector";

const internalApiUrl = process.env.API_INTERNAL_URL || "http://cgbg-backend:3001";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${internalApiUrl}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export default async function TenantBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tenant, branches, services] = await Promise.all([
    getJson<any>(`/tenants/config/${slug}`),
    getJson<any[]>(`/tenants/public/${slug}/branches`),
    getJson<any[]>(`/tenants/public/${slug}/services`),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background-soft)] px-4 py-8 text-[#243b37]">
      <ThemeInjector tenant={tenant} />
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] bg-white/80 p-8 shadow-xl backdrop-blur">
          <div className="mb-8 flex items-center gap-4">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-color)] text-2xl font-bold text-white">
                {tenant.name?.slice(0, 1) || "C"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--secondary-color)]">
                Reserva online
              </p>
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
            </div>
          </div>
          <p className="text-lg leading-8 text-[#62706d]">
            {tenant.config?.welcomeMessage ||
              "Elige servicio, sucursal y horario. Tu espacio quedará reservado mientras subes tu comprobante de pago."}
          </p>
          <div className="mt-8 rounded-3xl bg-[#f8f3ee] p-5 text-sm text-[#62706d]">
            <strong className="text-[#243b37]">Flujo local completo:</strong>{" "}
            reserva, generación de link en Redis, comprobante y aprobación por el negocio.
          </div>
        </div>

        <BookingForm slug={slug} branches={branches} services={services} />
      </section>
    </main>
  );
}
