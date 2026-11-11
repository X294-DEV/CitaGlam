export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f3ee] px-6 py-16 text-[#243b37]">
      <section className="mx-auto flex max-w-3xl flex-col items-center rounded-[2rem] bg-white/80 p-10 text-center shadow-xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#b98f70]">
          CitaGlam
        </p>
        <h1 className="text-4xl font-bold">Portal público de reservas</h1>
        <p className="mt-4 max-w-2xl text-lg text-[#62706d]">
          Abre el portal de un negocio usando su slug en la URL. Ejemplo:
        </p>
        <code className="mt-6 rounded-2xl bg-[#243b37] px-5 py-3 text-white">
          http://localhost:3000/mi-negocio
        </code>
      </section>
    </main>
  );
}
