import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { Studio } from '@/components/Studio';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!(await currentUser())) redirect('/login');
  return <Studio />;
}
