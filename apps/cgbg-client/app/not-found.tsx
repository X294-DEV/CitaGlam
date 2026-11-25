export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f8f3ee] px-6 py-16 text-[#243b37]">
      <section className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] bg-white/80 p-10 text-center shadow-xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#b98f70]">
          CitaGlam
        </p>
        <h1 className="text-3xl font-bold">No encontramos este negocio</h1>
        <p className="mt-4 text-[#62706d]">
          Revisa que el enlace esté completo o pide al negocio que te lo envíe de nuevo.
        </p>
      </section>
    </main>
  );
}
