export default function ConsentModal({ onAccept, onDecline }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
          Your Privacy Matters
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          Before your voice assessment begins, here's exactly how Agent Jake uses your information.
        </p>
        <ul className="space-y-3 mb-7">
          {[
            'This is a simulated demo — no real personal data is stored or shared.',
            'Your voice is processed only to answer risk questions. Nothing is recorded.',
            'Location data is used solely to look up public flood and weather risk.',
            'All AI explanations are educational, not official insurance advice.',
            'You can stop the assessment at any time.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
              <span className="text-green-600 font-bold mt-0.5 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            No Thanks
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-700 hover:bg-red-800 transition-colors"
          >
            I Understand & Agree
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Prototype built for WeHack 2026 · Not affiliated with State Farm®
        </p>
      </div>
    </div>
  )
}