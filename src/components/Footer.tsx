import { Link } from 'react-router-dom';
import { Facebook, Instagram, Phone, MapPin, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '../App';
import Logo from './Logo';

export default function Footer() {
  const { storeSettings } = useAuth();

  const storeDesc = storeSettings?.storeDescription || "Premium digital gaming store based in Egypt. We provide the best subscriptions, games, and digital services with instant delivery.";
  const facebookUrl = storeSettings?.facebook || "https://facebook.com/zerolag.games";
  const instagramHandle = storeSettings?.instagram || "@zerolag_games";
  const addressVal = storeSettings?.address || "City Star's Tower Mall, 6 October City, Egypt";
  const phoneVal = storeSettings?.phone || "01114763125";
  
  // Format WhatsApp number cleanly for API links
  const waRaw = storeSettings?.whatsApp || "01114763125";
  const waClean = waRaw.replace(/[^\d]/g, "");
  const whatsAppUrl = `https://wa.me/${waClean}`;

  const footerNotice = storeSettings?.footerContent || "© 2026 ZeroLag Games Egypt. Authorized gaming licensing and account distribution division.";

  return (
    <footer className="bg-[#050507] border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="group">
              <Logo />
            </Link>
            <p className="text-gray-400 text-xs font-semibold leading-relaxed uppercase tracking-wider">
              {storeDesc}
            </p>
            <div className="flex items-center gap-4">
              <a href={facebookUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#1877F2] hover:border-transparent transition-all">
                <Facebook size={18} />
              </a>
              <a href={`https://instagram.com/${instagramHandle.replace("@", "")}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#E4405F] hover:border-transparent transition-all">
                <Instagram size={18} />
              </a>
              <a href={whatsAppUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#25D366] hover:border-transparent transition-all">
                <MessageSquare size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-[#00F0FF]">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Home</Link></li>
              <li><Link to="/shop" className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Shop All Games</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Support Center</Link></li>
            </ul>
          </div>

          {/* Terms */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-[#00F0FF]">Policies</h4>
            <ul className="space-y-4">
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Terms of Service</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Refund Policy</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-[#00F0FF]">Contact Coordinates</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[#00F0FF] shrink-0" />
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{addressVal}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-[#00F0FF] shrink-0" />
                <span className="text-gray-400 text-xs font-mono">{phoneVal}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[#00F0FF] shrink-0" />
                <span className="text-gray-400 text-xs font-mono">zerolag0000@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1.5 text-center md:text-left">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
              {footerNotice}
            </p>
            <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest font-mono">
              Created by <span className="text-[#00F0FF]/80 font-sans">Eng. Shehab Osama</span> • Phone: <span className="text-gray-500">01114763249</span> • Email: <span className="text-gray-500 hover:text-white transition-colors">shehabosama553@gmail.com</span>
            </p>
          </div>
          <div className="flex items-center gap-4 grayscale opacity-50">
            <span className="text-[10px] font-bold border border-white/20 px-2 py-1 rounded">VODAFONE CASH</span>
            <span className="text-[10px] font-bold border border-white/20 px-2 py-1 rounded">INSTAPAY</span>
            <span className="text-[10px] font-bold border border-white/20 px-2 py-1 rounded">CASH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
