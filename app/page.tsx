import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Automação de Instagram
      </h1>
      <p className="text-neutral-500 text-sm mt-2 mb-6">
        Comentário vira DM automaticamente.
      </p>
      <Link
        href="/dashboard"
        className="bg-neutral-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium"
      >
        Abrir painel
      </Link>
    </main>
  );
}
