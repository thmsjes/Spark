import { Outlet } from 'react-router-dom';
import UserSidebarMenu from '@/components/UserSidebarMenu';

export default function UserWorkspace() {
  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:gap-6 lg:px-8">
      <UserSidebarMenu />
      <Outlet />
    </section>
  );
}
