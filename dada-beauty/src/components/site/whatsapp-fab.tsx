import { MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/lib/phone';

export function WhatsAppFab({ phone }: { phone: string }) {
  return (
    <a
      href={whatsappLink('Bonjour Dada Beauty 🌸', phone)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-10px_rgb(37_211_102/0.7)] transition-transform hover:scale-105"
    >
      <MessageCircle className="size-7" fill="currentColor" strokeWidth={1.5} />
    </a>
  );
}
