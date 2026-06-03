import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MobileTopbar } from '@/components/MobileTopbar';
import { SidebarProvider } from '@/components/SidebarContext';
import { getCurrentUserPublic } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserPublic();
  if (!user) redirect('/login');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopbar user={user} />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
