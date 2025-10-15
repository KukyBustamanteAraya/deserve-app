// Theme Manager - Admin page for customizing visual elements
import { redirect } from 'next/navigation';
import { requireAdmin, AdminRequiredError, UserNotFoundError } from '@/lib/auth/requireAdmin';
import ThemeManagerClient from '@/components/admin/ThemeManagerClient';

export default async function ThemePage() {
  try {
    const { user, profile } = await requireAdmin();

    return (
      <div className="min-h-screen px-3 sm:px-0">
        <div className="mb-4 sm:mb-5 md:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">Theme Manager</h1>
          <p className="text-gray-400 text-sm sm:text-base">Customize colors, branding, and visual elements</p>
        </div>

        <ThemeManagerClient />
      </div>
    );

  } catch (error) {
    if (error instanceof AdminRequiredError) {
      redirect('/dashboard?error=admin_required');
    }

    if (error instanceof UserNotFoundError) {
      redirect('/login?error=profile_not_found');
    }

    redirect('/login?redirect=/admin/theme');
  }
}

export const metadata = {
  title: 'Theme Manager | Admin | Deserve',
  description: 'Customize visual elements and branding for the Deserve platform.',
};
