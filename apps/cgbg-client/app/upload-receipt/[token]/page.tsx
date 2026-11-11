import ReceiptUploadForm from "../../components/ReceiptUploadForm";

export default async function UploadReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-[#f8f3ee] px-4 py-10 text-[#243b37]">
      <ReceiptUploadForm token={token} />
    </main>
  );
}
