import { useEffect, useState, useMemo } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import { 
  fetchBuses, fetchChargers, fetchDistricts, fetchUsers, 
  runInitialRouteCalculation, fetchOptimizedMatchups 
} from '@/apiCalls';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';

// --- Constants & Helpers ---

const SEASON_COLORS = {
  Spring: '#10b981', Fall: '#ef6d44',
  Summer: '#f59e0b', Winter: '#3b82f6',
};

const normalizeResponse = (res) => (Array.isArray(res) ? res : res?.data || res?.items || []);

/**
 * Optimized data transformation for Recharts
 */
const transformData = (busData) => {
  if (!busData?.seasons) return [];
  
  return Array.from({ length: 24 }, (_, hour) => {
    const timeStr = `${String(hour).padStart(2, '0')}:00:00`;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? 'am' : 'pm';
    
    const point = { time: timeStr, displayTime: `${displayHour}${period}` };

    busData.seasons.forEach(s => {
      const match = s.items.find(item => {
        const [h] = item.startTime.split(':').map(Number);
        return h === hour;
      });
      if (match) point[s.season] = match.batteryPercentRemaining;
    });
    return point;
  });
};

// --- Sub-Components ---

const OptimizationCard = ({ match }) => {
  // Mapping for Tailwind JIT to find classes
  const statusMap = {
    Green: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    Yellow: 'border-amber-500 bg-amber-50 text-amber-700',
    Red: 'border-rose-500 bg-rose-50 text-rose-700',
  };

  return (
    <div className={`glass-card p-4 border-l-4 shadow-sm transition-all hover:shadow-md ${statusMap[match.statusColor] || 'border-slate-300'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-800">{match.routeDescription}</h4>
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${statusMap[match.statusColor]}`}>
          {(match.safetyMargin * 100).toFixed(0)}% Margin
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-3">
        Suggested: <span className="font-mono font-bold text-blue-600 underline">Bus {match.busNumber}</span>
      </p>
      <div className="bg-white/50 p-2 rounded text-xs text-slate-500 italic border border-black/5">
        {match.reasoning}
      </div>
    </div>
  );
};

// --- Main Page Component ---

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('run-calculation');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const [stats, setStats] = useState({ users: 0, buses: 0, chargers: 0, districts: 0 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Feature States
  const [calculationState, setCalculationState] = useState({ data: null, loading: false, error: null });
  const [optState, setOptState] = useState({ data: [], loading: false });

  useEffect(() => {
    const initPage = async () => {
      try {
        const [u, b, c, d] = await Promise.all([fetchUsers(), fetchBuses(), fetchChargers(), fetchDistricts()]);
        const distList = normalizeResponse(d);
        setDistricts(distList);
        if (distList.length > 0) setSelectedDistrict(distList[0].id || distList[0].ID);
        
        setStats({
          users: normalizeResponse(u).length,
          buses: normalizeResponse(b).length,
          chargers: normalizeResponse(c).length,
          districts: distList.length,
        });
      } catch (err) {
        setError('Failed to initialize dashboard');
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, []);

  const handleRunAnalysis = async () => {
    setCalculationState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await runInitialRouteCalculation(selectedDistrict);
      setCalculationState({ data: res, loading: false, error: null });
    } catch (err) {
      setCalculationState({ data: null, loading: false, error: err.message });
    }
  };

  const handleOptimization = async () => {
    setOptState(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetchOptimizedMatchups(selectedDistrict);
      setOptState({ data: normalizeResponse(res), loading: false });
    } catch {
      setOptState(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <SidebarMenu />
      </aside>

      <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Reports</h1>
          <p className="text-slate-500 mt-1">Manage fleet performance and infrastructure analytics</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">Initializing...</div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {/* Report Selector */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['run-calculation', 'fleet-optimization', 'charger-network', 'district-performance'].map(id => (
                <button
                  key={id}
                  onClick={() => setSelectedReport(id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedReport === id 
                    ? 'border-blue-500 bg-white shadow-md' 
                    : 'border-transparent bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <span className="block text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {id.replace('-', ' ')}
                  </span>
                  <div className="text-slate-900 font-semibold">View Details</div>
                </button>
              ))}
            </section>

            {/* Context Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">District Focus:</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="rounded-lg border-slate-300 text-sm focus:ring-blue-500"
                >
                  {districts.map(d => (
                    <option key={d.id || d.ID} value={d.id || d.ID}>{d.name || d.Name}</option>
                  ))}
                </select>
              </div>
              
              {selectedReport === 'run-calculation' && (
                <button 
                  onClick={handleRunAnalysis}
                  disabled={calculationState.loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {calculationState.loading ? 'Processing...' : 'Execute Calculation'}
                </button>
              )}
            </div>

            {/* Dynamic Content Area */}
            <div className="min-h-[400px]">
              {selectedReport === 'run-calculation' && <CalculationView state={calculationState} />}
              {selectedReport === 'fleet-optimization' && (
                <OptimizationView state={optState} onRun={handleOptimization} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Specific View Components ---

function CalculationView({ state }) {
  if (state.error) return <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">{state.error}</div>;
  if (!state.data) return <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-2xl">Ready for calculation. Click "Execute" above.</div>;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
      {state.data.groupedData.map(bus => (
        <div key={bus.busNumber} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Bus {bus.busNumber} Performance Profile</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer>
              <LineChart data={transformData(bus)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayTime" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="5 5" label="Critical" />
                <Legend iconType="circle" />
                {Object.entries(SEASON_COLORS).map(([s, color]) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={color} strokeWidth={3} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

function OptimizationView({ state, onRun }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-900 text-white p-6 rounded-2xl">
        <div>
          <h3 className="text-lg font-bold">Smart Assignment Engine</h3>
          <p className="text-blue-200 text-sm">Matching buses to routes based on winter range safety buffers.</p>
          <p className="text-amber-500 text-sm">Margin is percentage above critical level to anticipate weather degradation.</p>
        </div>
        <button onClick={onRun} className="bg-white text-blue-900 px-5 py-2 rounded-lg font-bold hover:bg-blue-50">
          {state.loading ? 'Calculating...' : 'Run AI Matcher'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.data.map(match => <OptimizationCard key={match.routeId} match={match} />)}
      </div>
    </div>
  );
}