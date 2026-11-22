import { NewPasswordForm } from '@/components/admin/login-form';
import { Logo } from '@/components/ui/logo';

export default function NewPasswordPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-admin p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center"><Logo href="/" className="items-center" /></div>
        <div className="card p-7"><h1 className="font-display text-3xl">Nouveau mot de passe</h1><NewPasswordForm /></div>
      </div>
    </div>
  );
}
