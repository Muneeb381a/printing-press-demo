import { Lock } from 'lucide-react';

export default function DemoExpired() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <Lock size={28} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Demo Expired</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Your 7-day demo period has ended.<br />
            Contact us to get full access.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
          <p className="text-sm text-slate-300">WhatsApp / Call: <span className="text-white font-semibold">+92 XXX XXX XXXX</span></p>
        </div>
      </div>
    </div>
  );
}
