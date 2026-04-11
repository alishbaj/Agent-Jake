export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left — Logo + purpose */}
        <div className="flex items-center gap-4">
          <img
            src="/statefarm-logo.png"
            alt="State Farm"
            className="h-10 w-auto"
            onError={(e) => { e.target.style.display = 'none' }}
          />
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

        {/* Right — Agent Jake badge only */}
        <div className="flex items-center gap-2 bg-sf-blue/5 border border-sf-blue/10 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-sf-blue tracking-wide">
            Agent Jake AI
          </span>
        </div>

      </div>
    </nav>
  )
}