import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ShaderBackground from '@/components/ui/shader-background';
import { TrendingUp, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950">
      {/* Dynamic Background */}
      <ShaderBackground />

      {/* Hero Content */}
      <main className="relative z-10 container mx-auto px-6 flex flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Zap className="w-4 h-4" />
          <span>Next-Gen Market Intelligence</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl leading-tight">
          Master Your Market with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Pixii AI</span>
        </h1>

        <p className="text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
          The all-in-one platform for Amazon sellers to track competitors, 
          estimate revenue, and extract deep customer insights using advanced NLP.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link 
            href="/dashboard" 
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }), 
              "bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-12 text-lg rounded-xl shadow-lg shadow-emerald-900/20"
            )}
          >
            Start Analyzing Now
          </Link>
          <Link 
            href="/dashboard" 
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }), 
              "border-slate-700 text-slate-300 hover:bg-slate-800 h-12 text-lg rounded-xl"
            )}
          >
            View Live Demo
          </Link>
        </div>

        {/* Feature Highlights (No results/data here) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {[
            { icon: <TrendingUp className="w-6 h-6 text-emerald-400" />, title: "Revenue Intelligence", desc: "Estimated monthly sales and market share trends." },
            { icon: <BarChart3 className="w-6 h-6 text-blue-400" />, title: "Sentiment Heatmaps", desc: "Visual scoring of competitive features and criteria." },
            { icon: <ShieldCheck className="w-6 h-6 text-purple-400" />, title: "Risk Mitigation", desc: "Identify common product complaints before you source." },
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm text-left hover:border-emerald-500/50 transition-colors">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-8 text-slate-500 text-sm">
        © 2026 Pixii AI. Built for the future of E-commerce.
      </footer>
    </div>
  );
}
