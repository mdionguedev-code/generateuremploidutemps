'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WhatsAppSupportButtonProps {
  phoneNumber?: string;
  message?: string;
}

export default function WhatsAppSupportButton({
  phoneNumber = '221785927510',
  message = "Bonjour ! J'ai besoin d'assistance concernant l'application Planora Emplois du Temps."
}: WhatsAppSupportButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 pointer-events-auto">
      {/* Label Pill on Left */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 text-white text-xs shadow-2xl border border-emerald-500/40 backdrop-blur-md"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <span className="font-black text-xs tracking-wider text-emerald-400 uppercase">Assistance</span>
        <span className="text-[10px] text-gray-300 font-mono hidden sm:inline">78 592 75 10</span>
      </motion.div>

      {/* Main Round Floating WhatsApp Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white flex items-center justify-center shadow-2xl shadow-emerald-600/50 hover:shadow-emerald-500/70 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-emerald-300/50 cursor-pointer shrink-0"
        aria-label="Assistance WhatsApp (+221 78 592 75 10)"
        title="Assistance WhatsApp (+221 78 592 75 10)"
      >
        {/* Pulsing outer aura ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-40 blur-md group-hover:opacity-80 transition duration-500 animate-pulse -z-10" />

        {/* WhatsApp Icon */}
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8 fill-current text-white group-hover:rotate-12 transition-transform duration-300"
          viewBox="0 0 24 24"
        >
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.483 1.332 5.001l-1.417 5.176 5.297-1.389c1.464.798 3.116 1.218 4.778 1.219h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.669-1.038-5.177-2.926-7.066-1.887-1.888-4.396-2.927-7.067-2.94zm0 1.833c4.498 0 8.156 3.658 8.157 8.151 0 2.18-.847 4.229-2.389 5.772-1.542 1.542-3.593 2.39-5.768 2.39h-.003c-1.472 0-2.915-.39-4.175-1.127l-.299-.177-3.107.814.829-3.03-.195-.311c-.811-1.291-1.239-2.791-1.239-4.331 0-4.493 3.659-8.151 8.189-8.151zm-4.148 4.225c-.227 0-.594.085-.905.424-.311.339-1.189 1.16-1.189 2.827 0 1.667 1.217 3.277 1.386 3.504.17.227 2.394 3.655 5.8 5.124 2.836 1.223 3.411.979 4.033.922.623-.057 2.008-.821 2.292-1.614.283-.793.283-1.471.198-1.613-.085-.142-.311-.227-.651-.397-.339-.17-2.008-.991-2.32-1.104-.311-.113-.538-.17-.764.17-.227.34-.878 1.104-1.076 1.331-.198.227-.397.255-.737.085-.34-.17-1.435-.529-2.734-1.687-1.011-.902-1.694-2.016-1.893-2.356-.198-.34-.021-.524.149-.693.153-.153.34-.397.51-.595.17-.198.227-.34.34-.567.113-.227.057-.425-.028-.595-.085-.17-.764-1.841-1.047-2.521-.276-.662-.556-.572-.764-.582z" />
        </svg>

        {/* Green Online Dot Badge */}
        <span className="absolute top-0.5 right-0.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-slate-900" />
        </span>
      </a>
    </div>
  );
}
