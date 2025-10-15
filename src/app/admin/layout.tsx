import { requireAdmin } from '@/lib/auth/requireAdmin';
import { redirect } from 'next/navigation';
import AdminNav from './AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    redirect('/dashboard?error=admin_required');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <AdminNav />
      <main className="max-w-7xl mx-auto py-3 sm:py-6 px-3 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export const metadata = {
  title: 'Admin Panel | Deserve',
  description: 'Administrative interface for managing products, users, and orders.',
};