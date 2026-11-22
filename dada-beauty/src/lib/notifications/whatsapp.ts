/**
 * WhatsApp Business Platform (Cloud API Meta) — adaptateur préparé.
 * Envoi automatique UNIQUEMENT si WHATSAPP_ACCESS_TOKEN et
 * WHATSAPP_PHONE_NUMBER_ID sont configurés ET que des modèles de messages
 * ont été approuvés par Meta. Sinon, l'équipe utilise le lien wa.me
 * pré-rempli (envoi manuel depuis son téléphone) : rien n'est prétendu envoyé.
 */
export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppTemplate(params: {
  to: string;               // E.164
  template: string;         // nom du modèle approuvé par Meta
  variables: string[];
}): Promise<{ status: 'sent' | 'not_configured' | 'failed'; providerMessageId?: string; error?: string }> {
  if (!isWhatsAppConfigured()) return { status: 'not_configured' };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: params.template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'fr' },
          components: [{ type: 'body', parameters: params.variables.map((text) => ({ type: 'text', text })) }],
        },
      }),
    });
    const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) return { status: 'failed', error: json.error?.message ?? `HTTP ${res.status}` };
    return { status: 'sent', providerMessageId: json.messages?.[0]?.id };
  } catch (e) {
    return { status: 'failed', error: (e as Error).message };
  }
}
