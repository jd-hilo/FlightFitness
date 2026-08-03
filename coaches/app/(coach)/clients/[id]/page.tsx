import { ClientDetailView } from "@/components/ClientDetailView";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const initialTab = sp.tab === "messages" ? "messages" : "overview";
  return <ClientDetailView clientId={id} initialTab={initialTab} />;
}
