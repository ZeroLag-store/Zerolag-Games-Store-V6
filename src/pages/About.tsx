import { Trophy, ShieldCheck, Zap, Heart, Users, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24 pb-24">
      {/* Hero */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black uppercase tracking-tighter"
        >
          THE <span className="text-[#00F0FF]">ZEROLAG</span> STORY
        </motion.h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Born from a passion for flawless gaming experiences, Zerolag Games Store was founded in Egypt to provide gamers with premium digital assets without the wait or the hassle.
        </p>
      </div>

      {/* Philosophy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/10 group">
           <img 
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            alt="Gaming Culture"
           />
           <div className="absolute inset-0 bg-[#00F0FF]/10 mix-blend-overlay"></div>
        </div>
        <div className="space-y-8">
           <h2 className="text-4xl font-black uppercase tracking-tighter">Why We Are Different</h2>
           <div className="space-y-6">
              {[
                { icon: <Zap className="text-[#00F0FF]" />, title: "Instant Speed", desc: "No more waiting for days. Our automated system delivers your digital keys and subscriptions instantly." },
                { icon: <ShieldCheck className="text-[#00F0FF]" />, title: "Trusted Warranty", desc: "We offer a lifetime warranty on most our digital games. Your investment is safe with us." },
                { icon: <Heart className="text-[#00F0FF]" />, title: "Gamers for Gamers", desc: "We play the games we sell. Our team understands your needs because we share them." },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                     <h4 className="font-bold uppercase tracking-tight">{item.title}</h4>
                     <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-12 lg:p-24 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
         {[
           { label: "Satisfied Gamers", value: "10K+", icon: <Users size={24} /> },
           { label: "Digital Products", value: "500+", icon: <Trophy size={24} /> },
           { label: "Support Cases", value: "100%", icon: <Zap size={24} /> },
           { label: "Average Rating", value: "5/5", icon: <Star size={24} /> },
         ].map((stat, i) => (
           <div key={i} className="space-y-4">
              <div className="w-12 h-12 bg-[#00F0FF]/10 rounded-2xl flex items-center justify-center mx-auto text-[#00F0FF]">
                 {stat.icon}
              </div>
              <div className="space-y-1">
                 <div className="text-3xl font-black">{stat.value}</div>
                 <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</div>
              </div>
           </div>
         ))}
      </div>

      {/* CTA */}
      <div className="text-center space-y-8 py-12">
         <h2 className="text-4xl font-black uppercase tracking-tighter">Ready to level up?</h2>
         <div className="flex justify-center gap-4">
            <Link to="/shop" className="px-10 py-5 bg-[#00F0FF] text-black font-black uppercase tracking-widest rounded-2xl hover:scale-110 transition-transform">
               Browse Store
            </Link>
         </div>
      </div>
    </div>
  );
}
