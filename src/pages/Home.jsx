import './Home.css';

export default function Home() {
  const fleetStats = [
    { label: 'Active Vehicles', value: '42', delta: '+3 today' },
    { label: 'Routes Completed', value: '188', delta: '+11% week' },
    { label: 'Average Delay', value: '4.2m', delta: '-0.8m trend' },
    { label: 'Energy Efficiency', value: '92%', delta: '+2.4% month' },
  ];

  const routeFeed = [
    { route: 'Route A12', status: 'On Time', passengers: 64, eta: '09:42' },
    { route: 'Route C04', status: 'Delayed', passengers: 51, eta: '09:55' },
    { route: 'Route B18', status: 'On Time', passengers: 72, eta: '10:03' },
    { route: 'Route E09', status: 'Boarding', passengers: 39, eta: '10:10' },
    { route: 'Route D22', status: 'On Time', passengers: 57, eta: '10:18' },
  ];

  const energyTrend = [
    { day: 'Mon', value: 72 },
    { day: 'Tue', value: 64 },
    { day: 'Wed', value: 81 },
    { day: 'Thu', value: 76 },
    { day: 'Fri', value: 88 },
    { day: 'Sat', value: 70 },
    { day: 'Sun', value: 67 },
  ];

  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 pb-10 pt-4 sm:gap-10 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-20">
      <div className="glow-orb glow-orb-left" />
      <div className="glow-orb glow-orb-right" />

      <div className="relative z-10">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl">
          Fleet Operations Overview
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Three live sections with sample operational data.
        </p>
      </div>

      <section className="relative z-10 glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Section 1: Snapshot Metrics</h2>
          <span className="rounded-full border border-orange-300/70 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">
            Live Sample
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fleetStats.map((item) => (
            <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_10px_rgba(15,23,42,0.04)]">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs font-semibold text-blue-700">{item.delta}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 glass-card rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Section 2: Route Performance Feed</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Passengers</th>
                <th className="px-4 py-3 font-semibold">ETA</th>
              </tr>
            </thead>
            <tbody>
              {routeFeed.map((item) => (
                <tr key={item.route} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.route}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'Delayed' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.passengers}</td>
                  <td className="px-4 py-3 text-slate-600">{item.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="relative z-10 glass-card rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Section 3: Weekly Energy Trend</h2>
        <div className="mt-4 grid gap-3">
          {energyTrend.map((item) => (
            <div key={item.day} className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.day}</span>
              <div className="h-3 rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-orange-500"
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="text-right text-xs font-semibold text-slate-600">{item.value}%</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-main">
          <div>
            <p className="home-footer-title">EV Fleet Control</p>
            <p className="home-footer-subtitle">Operational analytics and planning workspace</p>
          </div>

          <div className="home-footer-meta">
            <span className="home-footer-pill">Demo Data</span>
            <span className="home-footer-year">{new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </section>
  );
}