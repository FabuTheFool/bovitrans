import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { getCurrentUserPublic } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Belt-and-suspenders: el middleware ya protege, pero acá leemos el user
  // para pasarlo al sidebar y, por si acaso, redirigimos si falta.
  const user = await getCurrentUserPublic();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <div className="flex-1 min-w-0">
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
