import { getSystemSettings } from "@/lib/settings";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const settings = await getSystemSettings();

  return (
    <main className="max-w-xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-medium text-[var(--ink)] mb-1">
        Configurações
      </h1>
      <p className="text-sm text-[var(--ink-soft)] mb-8">
        Nome, logo e cores aplicam em todo o sistema assim que você salvar —
        painel, login, e-mails de marca e landing page.
      </p>
      <SettingsForm initial={settings} />
    </main>
  );
}
