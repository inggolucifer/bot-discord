'use client';
import { motion, AnimatePresence } from 'framer-motion';
export default function BreakthroughAnimation({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="relative flex flex-col items-center justify-center p-12 text-center" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
            <motion.div className="absolute inset-0 bg-[#c5a880]/30 rounded-full blur-[100px]" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="relative z-10 w-32 h-32 mb-8 bg-gradient-to-tr from-[#8b0000] to-[#c5a880] rounded-full border-4 border-[#ffdf00] shadow-[0_0_50px_#ffdf00]" animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl">✨</span></div>
            </motion.div>
            <motion.h2 className="relative z-10 text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#ffdf00] to-[#c5a880] mb-4 font-playfair drop-shadow-[0_2px_2px_rgba(0,0,0,1)]" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>TEROBOSAN BERHASIL</motion.h2>
            <motion.p className="relative z-10 text-xl text-gray-200 mb-8 max-w-md font-light" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>Tubuhmu telah dimurnikan. Batas fanamu telah ditembus!</motion.p>
            <motion.button className="relative z-10 px-8 py-3 bg-[#c5a880] text-black font-bold rounded hover:bg-[#d8c09d] transition-colors" onClick={onClose} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Konsolidasikan Qi</motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
