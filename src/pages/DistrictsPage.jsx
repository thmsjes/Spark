import SidebarMenu from '@/components/SidebarMenu';

export default function DistrictsPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:gap-6 lg:px-8">
      <SidebarMenu />
      <div className="glass-card rounded-2xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Geography</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Districts</h1>
        <p className="mt-3 text-slate-600">
          District assignments, route coverage, and service zones will appear here.
        </p>
      </div>
    </section>
  );
}
