import { Lock, PhoneCall, RefreshCw } from 'lucide-react';

export default function DemoExpired() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">

        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <Lock size={28} className="text-red-400" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Demo Khatam Ho Gaya</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Aap ka 7 din ka demo period khatam ho gaya hai.<br />
            Full version khareedain aur apna kaam jaari rakhain.
          </p>
        </div>

        {/* Contact Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hamse Rabta Karain</p>

          <a
            href="https://wa.me/923239062418"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <PhoneCall size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs text-emerald-200 font-medium">WhatsApp / Call</p>
              <p className="text-sm font-bold text-white">+92 323 906 2418</p>
            </div>
          </a>
        </div>

        {/* Try Again */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw size={12} />
          Page reload karain
        </button>

      </div>
    </div>
  );
}
