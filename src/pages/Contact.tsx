import { Mail, Phone, MapPin, MessageSquare, Facebook, Instagram } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../App';

export default function Contact() {
  const { storeSettings } = useAuth();
  
  const phone = storeSettings?.phone || "01114763125";
  const email = storeSettings?.email || "zerolag0000@gmail.com";
  const address = storeSettings?.address || "City Star's Tower Mall, 6 October City, Egypt";
  const mapsLink = storeSettings?.googleMapsLink || "https://maps.google.com/?q=6+October+CityStar+Mall+Tower+3";
  const waNum = storeSettings?.whatsApp || "01114763125";
  const cleanWa = waNum.startsWith('0') ? '2' + waNum : (waNum.startsWith('+') ? waNum.slice(1) : '2' + waNum);

  const contactInfo = [
    { icon: <Phone className="text-[#00F0FF]" />, label: "Phone & WhatsApp", value: phone, link: `https://wa.me/${cleanWa}` },
    { icon: <Mail className="text-[#00F0FF]" />, label: "Email Support", value: email, link: `mailto:${email}` },
    { icon: <MapPin className="text-[#00F0FF]" />, label: "Store Location", value: address, link: mapsLink },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 space-y-24">
      <div className="text-center space-y-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black uppercase tracking-tighter"
        >
          GET IN <span className="text-[#00F0FF]">TOUCH</span>
        </motion.h1>
        <p className="text-gray-400 uppercase text-xs font-bold tracking-[0.4em] max-w-xl mx-auto">
          Expert support for all your gaming needs. We are here to help you level up.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Contact info cards */}
        <div className="space-y-8">
          <h2 className="text-2xl font-black uppercase tracking-tight">Direct Support</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contactInfo.map((item, i) => (
              <a 
                key={i}
                href={item.link}
                className="p-8 bg-[#151619] rounded-3xl border border-white/5 hover:border-[#00F0FF]/30 transition-all group"
              >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                  {item.icon}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{item.label}</div>
                  <div className="text-lg font-bold">{item.value}</div>
                </div>
              </a>
            ))}
            <div className="p-8 bg-[#151619] rounded-3xl border border-white/5 flex flex-col justify-center items-center gap-6">
                 <div className="text-center space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF]">Follow Us</div>
                    <div className="text-sm font-bold">Join the community</div>
                 </div>
                 <div className="flex gap-4">
                    <a href={storeSettings?.facebook || "https://facebook.com/zerolag.games"} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-[#1877F2] transition-colors"><Facebook size={20} /></a>
                    <a href={storeSettings?.instagram ? `https://instagram.com/${storeSettings.instagram.replace('@', '')}` : "https://instagram.com/zerolag_games"} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-[#E4405F] transition-colors"><Instagram size={20} /></a>
                    <a href={`https://wa.me/${cleanWa}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-[#25D366] transition-colors"><MessageSquare size={20} /></a>
                 </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-[#151619] p-8 lg:p-12 rounded-[2.5rem] border border-white/10 space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-tight">Send a Message</h2>
            <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your Name</label>
                        <input type="text" className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-[#00F0FF]/50 transition-colors" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Email Address</label>
                        <input type="email" className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-[#00F0FF]/50 transition-colors" placeholder="john@example.com" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Subject</label>
                    <select className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-[#00F0FF]/50 transition-colors appearance-none">
                        <option>Order Support</option>
                        <option>Account Issues</option>
                        <option>Partnership</option>
                        <option>Other</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Message</label>
                    <textarea rows={4} className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-[#00F0FF]/50 transition-colors" placeholder="How can we help?"></textarea>
                </div>
                <button type="button" className="w-full py-5 bg-[#00F0FF] text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_0_20px_#00F0FF55]">
                    Submit Message
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}
