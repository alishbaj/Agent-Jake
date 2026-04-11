import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ConsentModal from '../components/ConsentModal'

export default function LandingPage() {
  const [showConsent, setShowConsent] = useState(false)
  const navigate = useNavigate()

  function handleStart() {
    setShowConsent(true)
  }

  function handleAccept() {
    setShowConsent(false)
    navigate('/assessment')
  }

  function handleDecline() {
    setShowConsent(false)
  }

  return (
    <div className="min-h-screen bg-white font-body overflow-hidden">
      {showConsent && (
        <ConsentModal onAccept={handleAccept} onDecline={handleDecline} />
      )}

      <Navbar />

      <main className="pt-16 min-h-screen flex flex-col">

        {/* ── HERO — blue section ── */}
        <div className="relative bg-sf-blue flex-1 flex items-center overflow-hidden">

          {/* Background decorative circles */}
          <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-64 h-64 rounded-full bg-sf-red/10 blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 py-24 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">

            {/* LEFT — Copy */}
            <div className="text-white">
              <h1 className="font-display text-5xl lg:text-6xl font-black leading-[1.05] mb-6">
                Meet{' '}
                <em className="not-italic text-sf-gold">Agent Jake</em>,<br />
                Your Home Risk<br />
                Advisor
              </h1>

              <p className="text-white/75 text-lg leading-relaxed max-w-lg mb-10">
                Have a natural voice conversation with Agent Jake. He'll ask you a
                few questions about your home, analyze real property data, and
                deliver a personalized risk score with clear, actionable
                recommendations.
              </p>

              {/* Stats */}
              <div className="flex items-center gap-10 mb-10">
                {[
                  { val: '3 min', label: 'Voice assessment' },
                  { val: '100pt', label: 'Risk score' },
                  { val: 'Real', label: 'Property data' },
                ].map(({ val, label }) => (
                  <div key={label}>
                    <div className="font-display text-2xl font-bold text-sf-gold">{val}</div>
                    <div className="text-xs text-white/60 uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={handleStart}
                className="group inline-flex items-center gap-3 bg-sf-red hover:bg-sf-red-dark text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sf-red/30"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                </span>
                Start My Assessment with Agent Jake
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <p className="mt-4 text-xs text-white/40">
                No forms. Just speak. Your data stays private.
              </p>
            </div>

            {/* RIGHT — Agent Jake card */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-sf-red/20 blur-2xl scale-95 animate-pulse-slow" />

                <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-80">
                  <div className="text-[10px] font-bold tracking-[3px] uppercase text-gray-400 mb-5">
                    Agent Jake AI
                  </div>

                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-full bg-sf-red/20 orb-ring" />
                      <div className="absolute inset-0 rounded-full bg-sf-red/10 orb-ring" style={{ animationDelay: '0.8s' }} />
                      <div className="relative w-24 h-24 rounded-full bg-sf-red border-4 border-sf-red overflow-hidden shadow-lg">
                        <img
                          src="/agent-jake.png"
                          alt="Agent Jake"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-4xl">🏠</div>'
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="font-bold text-xl text-gray-900">Agent Jake</h3>
                    <p className="text-sm text-gray-500">AI Home Insurance Advisor</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {[
                      'Voice-powered risk assessment',
                      'Real-time property data lookup',
                      'Personalized safety recommendations',
                      'Weather & seasonal hazard alerts',
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-sf-green flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Powered by</span>
                    <span className="text-xs font-bold text-sf-blue tracking-wide">ElevenLabs Voice</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="bg-white py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-xs font-bold tracking-widest uppercase text-gray-400 mb-10">
              How It Works
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  icon: '🎙️',
                  title: 'Talk to Agent Jake',
                  desc: 'Answer a few voice questions about your home. No forms, no typing — just a natural conversation.',
                },
                {
                  step: '02',
                  icon: '📡',
                  title: 'We Pull Real Data',
                  desc: 'Agent Jake looks up your flood zone, fire station distance, and live weather alerts automatically.',
                },
                {
                  step: '03',
                  icon: '📊',
                  title: 'Get Your Risk Score',
                  desc: 'Receive a transparent 0–100 score with clear explanations and ranked actions to lower your risk.',
                },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="text-[10px] font-black tracking-widest text-sf-red mb-3 uppercase">
                    Step {step}
                  </div>
                  <div className="text-4xl mb-3">{icon}</div>
                  <h3 className="font-display font-bold text-gray-900 text-lg mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img
            src="/statefarm-logo.png"
            alt="State Farm"
            className="h-8 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <p className="text-xs text-gray-500">
            © 2026 State Farm · Agent Jake is a prototype built for WeHack 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
