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
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end pointer-events-auto">
      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/95 text-white text-xs shadow-2xl border border-emerald-500/30 backdrop-blur-md flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">Assistance Directe WhatsApp (+221 78 592 75 10)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main WhatsApp Floating Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 hover:shadow-2xl hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-emerald-300/40 cursor-pointer"
        aria-label="Contacter l'Assistance WhatsApp (+221 78 592 75 10)"
      >
        {/* Pulsing outer aura ring */}
        <span className="absolute -inset-0.5 rounded-full bg-[#25D366] opacity-40 blur-md group-hover:opacity-75 transition duration-500 animate-pulse -z-10" />

        {/* WhatsApp Icon */}
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-white shrink-0 group-hover:rotate-12 transition-transform duration-300"
          viewBox="0 0 24 24"
        >
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.483 1.332 5.001l-1.417 5.176 5.297-1.389c1.464.798 3.116 1.218 4.778 1.219h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.669-1.038-5.177-2.926-7.066-1.887-1.888-4.396-2.927-7.067-2.94zm0 1.833c4.498 0 8.156 3.658 8.157 8.151 0 2.18-.847 4.229-2.389 5.772-1.542 1.542-3.593 2.39-5.768 2.39h-.003c-1.472 0-2.915-.39-4.175-1.127l-.299-.177-3.107.814.829-3.03-.195-.311c-.811-1.291-1.239-2.791-1.239-4.331 0-4.493 3.659-8.151 8.189-8.151zm-4.148 4.225c-.227 0-.594.085-.905.424-.311.339-1.189 1.16-1.189 2.827 0 1.667 1.217 3.277 1.386 3.504.17.227 2.394 3.655 5.8 5.124 2.836 1.223 3.411.979 4.033.922.623-.057 2.008-.821 2.292-1.614.283-.793.283-1.471.198-1.613-.085-.142-.311-.227-.651-.397-.339-.17-2.008-.991-2.32-1.104-.311-.113-.538-.17-.764.17-.227.34-.878 1.104-1.076 1.331-.198.227-.397.255-.737.085-.34-.17-1.435-.529-2.734-1.687-1.011-.902-1.694-2.016-1.893-2.356-.198-.34-.021-.524.149-.693.153-.153.34-.397.51-.595.17-.198.227-.34.34-.567.113-.227.057-.425-.028-.595-.085-.17-.764-1.841-1.047-2.521-.276-.662-.556-.572-.764-.582z" />
        </svg>

        {/* Text Label */}
        <span className="tracking-wider uppercase font-extrabold text-xs sm:text-sm">Assistance</span>

        {/* Online Indicator Badge */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200" />
        </span>
      </a>
    </div>
  );
}
