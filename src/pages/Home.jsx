import './Home.css';

export default function Home() {
  const serviceHighlights = [
    'Route feasibility and conversion planning',
    'Charging strategy and utility peak optimization',
    'Facility safety and infrastructure readiness',
  ];

  const routesterCapabilities = [
    'Route electrification simulation based on real operational constraints',
    'Vehicle and charger matching with best-practice recommendations',
    'Utility load and peak demand analysis for capacity planning',
    'Battery and charging power recommendations by route profile',
    'Software-generated charging schedules to preserve readiness and lower demand costs',
    'Long-term degradation and replacement planning support',
  ];

  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 pb-10 pt-4 sm:gap-10 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-20">
      <div className="glow-orb glow-orb-left" />
      <div className="glow-orb glow-orb-right" />

      <div className="relative z-10 home-hero float-slow">
        <div className="home-hero-header">
          <p className="home-hero-kicker">EV Fleet Consulting Services</p>
          <h1 className="home-hero-title">Plan, Deploy, and Scale Fleet Electrification with Confidence</h1>
          <p className="home-hero-subtitle">
            EVFCS helps districts and fleet operators move from early planning to operational execution with practical strategy,
            software-backed decision support, and safety-first infrastructure guidance.
          </p>
        </div>

        <div className="home-hero-metrics" role="list" aria-label="Experience highlights">
          <article className="home-hero-metric" role="listitem">
            <p className="home-hero-metric-value">5+ yrs</p>
            <p className="home-hero-metric-label">EV School Bus Market Experience</p>
          </article>
          <article className="home-hero-metric" role="listitem">
            <p className="home-hero-metric-value">30+ yrs</p>
            <p className="home-hero-metric-label">Automotive Industry Expertise</p>
          </article>
          <article className="home-hero-metric" role="listitem">
            <p className="home-hero-metric-value">Safety-First</p>
            <p className="home-hero-metric-label">Facility and Operations Readiness Focus</p>
          </article>
        </div>
      </div>

      <section className="relative z-10 home-section-card">
        <div className="home-section-heading">
          <h2 className="home-section-title">About Us</h2>
          <span className="home-section-tag">Consulting</span>
        </div>

        <div className="home-section-body">
          <p className="home-section-paragraph">
            Our team brings 5+ years of direct experience in the EV school bus market, helping school
districts with practical Fleet Electrification Planning. We specialize in converting traditional
vehicles to electric for route feasibility studies, charging operations, deployment strategies, and
product recommendations tailored to district needs.
          </p>
          <p className="home-section-paragraph">
            We also have 5+ years of EV vehicle and infrastructure safety expertise, helping districts
evaluate their facilities for the safe storage, charging, and maintenance of electric vehicles.
Backed by 30+ years of automotive industry experience and in-house software expertise, we
combine technical know-how and data-driven tools to deliver reliable, cost-effective
electrification solutions.
          </p>

          <ul className="home-feature-list" aria-label="EVFCS highlights">
            {serviceHighlights.map((highlight) => (
              <li key={highlight} className="home-feature-item">{highlight}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative z-10 home-section-card">
        <div className="home-section-heading">
          <h2 className="home-section-title">ROUTESTER</h2>
          <span className="home-section-tag">Software</span>
        </div>

        <div className="home-section-body">
          <p className="home-section-paragraph">
            A purpose-built software for fleet operators to identify which routes can be converted to EVs with
today’s technology. Users choose vehicle and charger models, plan routes, and instantly see
which combinations work. Routester offers best-practice recommendations while allowing users
to test alternative products and compare multiple options.
          </p>

          <div className="home-capabilities" aria-label="Routester capabilities">
            {routesterCapabilities.map((capability) => (
              <p key={capability} className="home-capability-item">{capability}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 home-section-card">
        <div className="home-section-heading">
          <h2 className="home-section-title">FACILITY EV READINESS REPORT</h2>
          <span className="home-section-tag">Assessment</span>
        </div>

        <div className="home-section-body">
          <p className="home-section-paragraph">
Our Facility EV Readiness Report assesses your garage and support facilities specifically for
electric vehicle storage, charging, and maintenance. Many existing facilities were not designed
for EVs; our industry experts perform on-site evaluations to identify gaps and risks, then provide
clear, prioritized recommendations for upgrades.

          </p>
          <p className="home-section-paragraph">
Deliverables include: a facility condition assessment, recommended infrastructure and
equipment changes, electrical service and charging layout guidance, safety and operational
procedure recommendations, and documentation tailored for district decision-makers,
regulators, insurers, and funding applications. Safety is paramount—our report ensures your
facility meets operational, regulatory, and insurance requirements for a safe transition to electric
fleets.
          </p>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-main">
          <div>
            <p className="home-footer-title">SparK</p>
            <p className="home-footer-subtitle">Fleet Management</p>
          </div>

          <div className="home-footer-meta">
            <span className="home-footer-pill">EVFCS </span>
            <span className="home-footer-year">{new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </section>
  );
}