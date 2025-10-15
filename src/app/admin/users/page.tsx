import { redirect } from 'next/navigation';
import { requireAdmin, AdminRequiredError, UserNotFoundError } from '@/lib/auth/requireAdmin';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  try {
    await requireAdmin();

    return <UsersClient />;

  } catch (error) {
    if (error instanceof AdminRequiredError) {
      redirect('/dashboard?error=admin_required');
    }

    if (error instanceof UserNotFoundError) {
      redirect('/login?error=profile_not_found');
    }

    redirect('/login?redirect=/admin/users');
  }
}

export const metadata = {
  title: 'User Management | Admin',
  description: 'Manage user accounts and permissions',
};
