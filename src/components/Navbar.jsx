import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100/80 shadow-sm transition-shadow duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sf-blue/40 focus-visible:ring-offset-2 transition-opacity duration-300 hover:opacity-85 active:scale-[0.98]"
            aria-label="Home"
          >
            <img
              src="/statefarm-logo.png"
              alt="State Farm"
              className="h-14 w-auto"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest leading-none">
              Home Insurance
            </div>
            <div className="text-sm font-bold text-sf-blue leading-snug">
              Risk Assessment
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
