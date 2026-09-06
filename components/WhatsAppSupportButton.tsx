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
    <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-2 pointer-events-auto">
      {/* Discrete Tooltip / Label on Hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 5, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="px-2.5 py-1 rounded-full bg-slate-950/90 text-emerald-400 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>Assistance</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discrete Round Floating WhatsApp Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-lg shadow-emerald-950/40 hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer shrink-0"
        aria-label="Assistance WhatsApp"
        title="Assistance WhatsApp"
      >
        {/* WhatsApp Icon */}
        <svg
          className="w-6 h-6 fill-current text-white transition-transform duration-300 group-hover:scale-110"
          viewBox="0 0 24 24"
        >
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.483 1.332 5.001l-1.417 5.176 5.297-1.389c1.464.798 3.116 1.218 4.778 1.219h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.669-1.038-5.177-2.926-7.066-1.887-1.888-4.396-2.927-7.067-2.94zm0 1.833c4.498 0 8.156 3.658 8.157 8.151 0 2.18-.847 4.229-2.389 5.772-1.542 1.542-3.593 2.39-5.768 2.39h-.003c-1.472 0-2.915-.39-4.175-1.127l-.299-.177-3.107.814.829-3.03-.195-.311c-.811-1.291-1.239-2.791-1.239-4.331 0-4.493 3.659-8.151 8.189-8.151zm-4.148 4.225c-.227 0-.594.085-.905.424-.311.339-1.189 1.16-1.189 2.827 0 1.667 1.217 3.277 1.386 3.504.17.227 2.394 3.655 5.8 5.124 2.836 1.223 3.411.979 4.033.922.623-.057 2.008-.821 2.292-1.614.283-.793.283-1.471.198-1.613-.085-.142-.311-.227-.651-.397-.339-.17-2.008-.991-2.32-1.104-.311-.113-.538-.17-.764.17-.227.34-.878 1.104-1.076 1.331-.198.227-.397.255-.737.085-.34-.17-1.435-.529-2.734-1.687-1.011-.902-1.694-2.016-1.893-2.356-.198-.34-.021-.524.149-.693.153-.153.34-.397.51-.595.17-.198.227-.34.34-.567.113-.227.057-.425-.028-.595-.085-.17-.764-1.841-1.047-2.521-.276-.662-.556-.572-.764-.582z" />
        </svg>

        {/* Small Discreet Green Dot */}
        <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
      </a>
    </div>
  );
}
