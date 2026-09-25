'use client';

import React from 'react';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

export interface CharacterLayersProps {
  face?: string;
  frontHair?: string;
  backHair?: string;
  outfit?: string;
  className?: string;
  showAura?: boolean;
}

function isValidHttpUrl(string?: string | null): boolean {
  if (!string) return false;
  return string.startsWith('http://') || string.startsWith('https://');
}

/**
 * =========================================================================
 * TALE OF IMMORTAL PROCEDURAL SVG FALLBACK LAYERS
 * Standar Dimensi: 512x768 px (Rasio 2:3 Setengah Badan / Half-Body Stance)
 * Dirancang persis mengikuti model Tale of Immortal:
 *   - Pose setengah badan tegap (waist-up)
 *   - Model dasar kepala polos (bald base) anti-clipping
 *   - Mata beriris emas (golden eyes) seperti pada gambar referensi
 *   - Jubah silang Hanfu dengan lipatan kain & sabuk pinggang
 * =========================================================================
 */

// 1. LAYER 1 (Z-10): RAMBUT BELAKANG (BACK HAIR)
const BackHairSVG: React.FC<{ styleId?: string }> = ({ styleId }) => {
  switch (styleId) {
    case 'back_hair_02': // Sanggul Kuno Tradisional (Top Bun)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="hairGradBun" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#252427" />
              <stop offset="70%" stopColor="#151417" />
              <stop offset="100%" stopColor="#0c0b0d" />
            </linearGradient>
          </defs>
          {/* Top Bun on crown */}
          <circle cx="256" cy="118" r="38" fill="url(#hairGradBun)" />
          {/* Jade pin */}
          <path d="M 215 116 L 297 120" stroke="#7de3c4" strokeWidth="5" strokeLinecap="round" />
          <circle cx="297" cy="120" r="5" fill="#a7f3d0" />
          {/* Back hairline shading */}
          <path d="M 220 220 C 220 270 292 270 292 220 Z" fill="#151417" opacity="0.6" />
        </svg>
      );

    case 'back_hair_03': // Rambut Hitam Terurai Lepas (Flowing Locks)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="hairGradFlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#222026" />
              <stop offset="50%" stopColor="#141318" />
              <stop offset="100%" stopColor="#08080a" />
            </linearGradient>
          </defs>
          {/* Left flowing stream */}
          <path
            d="M 205 210 C 185 270 160 380 155 520 C 175 520 195 440 215 360 C 225 310 225 240 220 210 Z"
            fill="url(#hairGradFlow)"
          />
          {/* Right flowing stream */}
          <path
            d="M 307 210 C 327 270 352 380 357 520 C 337 520 317 440 297 360 C 287 310 287 240 292 210 Z"
            fill="url(#hairGradFlow)"
          />
          {/* Mass behind neck */}
          <path d="M 210 200 C 190 280 322 280 302 200 Z" fill="#121115" />
        </svg>
      );

    case 'back_hair_04': // Rambut Pendek Praktis Beladiri (Short Martial)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Short taper behind neck */}
          <path
            d="M 224 230 C 218 265 294 265 288 230 Z"
            fill="#18171b"
          />
        </svg>
      );

    case 'back_hair_01': // Kuncir Ekor Kuda Tinggi (High Ponytail - Default)
    default:
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="hairGradPony" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2b2830" />
              <stop offset="40%" stopColor="#18161c" />
              <stop offset="100%" stopColor="#0a090d" />
            </linearGradient>
          </defs>
          {/* Ponytail tie high up */}
          <ellipse cx="256" cy="130" rx="18" ry="12" fill="#8c2020" />
          {/* Flowing ponytail billowing to the side behind shoulders */}
          <path
            d="M 256 130 C 235 150 200 230 185 360 C 175 440 180 520 185 550 C 195 510 215 420 230 330 C 245 250 262 170 256 130 Z"
            fill="url(#hairGradPony)"
          />
          {/* Fine hair strands shading */}
          <path
            d="M 252 135 C 238 180 210 280 198 380"
            stroke="#3d3744"
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
          />
        </svg>
      );
  }
};

// 2. LAYER 2 (Z-20): MODEL DASAR TUBUH & WAJAH (BASE BODY & FACE - BALD HEAD)
const BaseFaceBodySVG: React.FC<{ styleId?: string }> = ({ styleId }) => {
  // Warna iris mata emas sesuai referensi
  const eyeColor = styleId === 'face_02' ? '#67e8f9' : '#eab308'; // Emas bercahaya
  const skinTone = styleId === 'face_04' ? '#fae6da' : '#efd4c3';
  const shadowTone = styleId === 'face_04' ? '#e2c5b3' : '#dcb9a1';

  return (
    <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-20">
      <defs>
        {/* Skin gradient */}
        <radialGradient id="faceGrad" cx="50%" cy="32%" r="28%">
          <stop offset="0%" stopColor={skinTone} />
          <stop offset="85%" stopColor={shadowTone} />
          <stop offset="100%" stopColor="#caa489" />
        </radialGradient>
        {/* Torso muscular shading */}
        <linearGradient id="neckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={skinTone} />
          <stop offset="60%" stopColor={shadowTone} />
          <stop offset="100%" stopColor="#bf9679" />
        </linearGradient>
      </defs>

      {/* --- TORSO & SHOULDERS (POSTUR PENDEKAR SETENGAH BADAN) --- */}
      {/* Broad shoulders & upper chest */}
      <path
        d="M 120 460 C 135 375 190 340 220 330 L 292 330 C 322 340 377 375 392 460 L 415 620 L 97 620 Z"
        fill="url(#neckGrad)"
      />
      {/* Muscular Neck & Collarbone */}
      <path
        d="M 224 250 L 220 330 C 220 370 238 395 256 395 C 274 395 292 370 292 330 L 288 250 Z"
        fill="url(#neckGrad)"
      />
      {/* Collarbone / Clavicle lines */}
      <path
        d="M 225 348 C 240 353 250 355 256 358 C 262 355 272 353 287 348"
        stroke="#b88f72"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Chest cleavage shadow (Pectoral lines visible through robe) */}
      <path
        d="M 256 358 L 256 425 M 238 395 C 246 415 254 425 256 425 C 258 425 266 415 274 395"
        stroke="#b08669"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* --- KEPALA POLOS (BALD BASE HEAD - TALE OF IMMORTAL STYLE) --- */}
      {/* Head contour & chin */}
      <path
        d="M 256 122 C 205 122 194 175 196 220 C 197 258 214 285 235 304 C 244 312 256 316 256 316 C 256 316 268 312 277 304 C 298 285 315 258 316 220 C 318 175 307 122 256 122 Z"
        fill="url(#faceGrad)"
        stroke="#c99f84"
        strokeWidth="1.5"
      />

      {/* Left Ear */}
      <path
        d="M 196 215 C 187 215 184 235 188 254 C 191 267 197 268 200 260"
        fill={skinTone}
        stroke="#ba9278"
        strokeWidth="1.5"
      />
      <path d="M 191 230 C 193 245 195 248 197 245" stroke="#ba9278" strokeWidth="1.5" fill="none" />

      {/* Right Ear */}
      <path
        d="M 316 215 C 325 215 328 235 324 254 C 321 267 315 268 312 260"
        fill={skinTone}
        stroke="#ba9278"
        strokeWidth="1.5"
      />
      <path d="M 321 230 C 319 245 317 248 315 245" stroke="#ba9278" strokeWidth="1.5" fill="none" />

      {/* --- FITUR WAJAH (EYES, EYEBROWS, NOSE, MOUTH) --- */}
      {/* Left Eyebrow (Sharp martial brow) */}
      <path
        d="M 218 208 C 228 203 242 204 249 208"
        stroke="#241e1b"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right Eyebrow */}
      <path
        d="M 294 208 C 284 203 270 204 263 208"
        stroke="#241e1b"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left Eye (Phoenix / Almond shape with golden iris) */}
      <path
        d="M 220 222 C 227 218 240 219 247 225 C 242 229 231 230 223 227 Z"
        fill="#ffffff"
        stroke="#1e1816"
        strokeWidth="1.8"
      />
      <circle cx="234" cy="223.5" r="4.2" fill={eyeColor} />
      <circle cx="234" cy="223.5" r="2.2" fill="#1a1412" />
      <circle cx="232.5" cy="222" r="1.2" fill="#ffffff" /> {/* Light reflection */}

      {/* Right Eye */}
      <path
        d="M 292 222 C 285 218 272 219 265 225 C 270 229 281 230 289 227 Z"
        fill="#ffffff"
        stroke="#1e1816"
        strokeWidth="1.8"
      />
      <circle cx="278" cy="223.5" r="4.2" fill={eyeColor} />
      <circle cx="278" cy="223.5" r="2.2" fill="#1a1412" />
      <circle cx="276.5" cy="222" r="1.2" fill="#ffffff" /> {/* Light reflection */}

      {/* Nose (Straight bridge, delicate nostrils) */}
      <path
        d="M 255 224 L 253 252 C 251 257 257 260 259 257 L 260 252"
        stroke="#ad866c"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Lips (Resolute neutral martial lips) */}
      <path
        d="M 244 278 C 250 276 262 276 268 278"
        stroke="#a36359"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 248 284 C 253 286 259 286 264 284"
        stroke="#c47a6e"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

// 3. LAYER 3 (Z-30): PAKAIAN / JUBAH PENDEKAR STARTER
const StarterOutfitSVG: React.FC<{ styleId?: string }> = ({ styleId }) => {
  switch (styleId) {
    case 'outfit_outer_disciple': // Jubah Murid Luar (Biru Muda)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-30">
          <defs>
            <linearGradient id="discipleBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          {/* Main Robe Body */}
          <path
            d="M 125 450 C 130 380 185 348 215 340 L 256 460 L 297 340 C 327 348 382 380 387 450 L 405 680 L 107 680 Z"
            fill="url(#discipleBlue)"
          />
          {/* White inner collar */}
          <path d="M 215 340 L 256 460 L 270 460 L 230 340 Z" fill="#f8fafc" />
          <path d="M 297 340 L 256 460 L 242 460 L 282 340 Z" fill="#f8fafc" />
          {/* White sash / belt */}
          <rect x="156" y="550" width="200" height="38" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
          {/* Sect pendant */}
          <circle cx="256" cy="569" r="10" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
        </svg>
      );

    case 'outfit_wanderer_bamboo': // Jubah Pengelana Rimba (Hijau Lumut)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-30">
          <defs>
            <linearGradient id="bambooGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3f6212" />
              <stop offset="60%" stopColor="#1e3a12" />
              <stop offset="100%" stopColor="#14260c" />
            </linearGradient>
          </defs>
          <path
            d="M 125 450 C 130 380 185 348 215 340 L 256 450 L 297 340 C 327 348 382 380 387 450 L 405 680 L 107 680 Z"
            fill="url(#bambooGreen)"
          />
          {/* Crossed collar in bamboo brown */}
          <path d="M 215 340 L 265 470 L 250 480 L 205 345 Z" fill="#78350f" />
          {/* Hemp waist rope */}
          <rect x="160" y="555" width="192" height="32" rx="4" fill="#a16207" />
        </svg>
      );

    case 'outfit_novice_daoist': // Jubah Daois Pemula (Putih-Hitam)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-30">
          <defs>
            <linearGradient id="daoistWhite" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>
          <path
            d="M 125 450 C 130 380 185 348 215 340 L 256 460 L 297 340 C 327 348 382 380 387 450 L 405 680 L 107 680 Z"
            fill="url(#daoistWhite)"
          />
          {/* Black trim collar */}
          <path d="M 215 340 L 260 460 L 250 465 L 205 340 Z" fill="#0f172a" />
          {/* Black sash with Yin-Yang crest */}
          <rect x="156" y="550" width="200" height="36" rx="4" fill="#0f172a" />
          <circle cx="256" cy="568" r="12" fill="#ffffff" stroke="#000000" strokeWidth="2" />
        </svg>
      );

    case 'outfit_mortal_linen': // Jubah Linen Fana (Kain Rami Kelabu)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-30">
          <defs>
            <linearGradient id="linenGrey" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#57534e" />
              <stop offset="70%" stopColor="#292524" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
          </defs>
          <path
            d="M 125 450 C 130 380 185 348 215 340 L 256 460 L 297 340 C 327 348 382 380 387 450 L 405 680 L 107 680 Z"
            fill="url(#linenGrey)"
          />
          <rect x="160" y="555" width="192" height="34" rx="4" fill="#44403c" stroke="#78716c" strokeWidth="1" />
        </svg>
      );

    case 'outfit_vagrant_black': // JUBAH HITAM KOYAK PENGELANA (PERSIS SESUAI REFERENSI GAMBAR USER!)
    default:
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-30">
          <defs>
            {/* Charcoal black fabric gradient */}
            <linearGradient id="blackRogueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#323338" />
              <stop offset="50%" stopColor="#202124" />
              <stop offset="100%" stopColor="#131416" />
            </linearGradient>
            {/* Inner fabric / rolled sleeve grey */}
            <linearGradient id="innerSleeveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64666d" />
              <stop offset="100%" stopColor="#45474c" />
            </linearGradient>
          </defs>

          {/* Left Sleeve (Rolled up at forearm with jagged cuff - as in reference) */}
          <path
            d="M 125 450 L 80 520 L 108 550 L 150 490 Z"
            fill="url(#blackRogueGrad)"
          />
          <path d="M 80 520 L 72 535 L 100 565 L 108 550 Z" fill="url(#innerSleeveGrad)" />

          {/* Right Sleeve (Rolled up at forearm with hand placed near waist sash) */}
          <path
            d="M 387 450 L 432 520 L 404 550 L 362 490 Z"
            fill="url(#blackRogueGrad)"
          />
          <path d="M 432 520 L 440 535 L 412 565 L 404 550 Z" fill="url(#innerSleeveGrad)" />

          {/* Main Hanfu Robe Silhouette with Crossed Collar (Right over Left Wuxia Style) */}
          <path
            d="M 128 445 C 132 375 190 345 220 338 L 260 480 L 292 338 C 322 345 380 375 384 445 L 404 680 L 108 680 Z"
            fill="url(#blackRogueGrad)"
          />

          {/* Tattered & Torn Collar Rips (Sobekan realistis seperti pada gambar contoh) */}
          <path
            d="M 220 338 L 226 360 L 221 366 L 230 395 L 224 402 L 238 440 L 260 480"
            stroke="#17181a"
            strokeWidth="3"
            fill="none"
          />
          {/* Tear hole on left chest (lubang sobek kain khas petarung fana) */}
          <path
            d="M 315 372 Q 320 368 326 376 Q 324 384 316 386 Z"
            fill="#dcb9a1" // Exposes skin underneath!
          />
          <path
            d="M 264 435 Q 268 430 274 442 Q 269 452 263 448 Z"
            fill="#dcb9a1" // Second rip exposing chest
          />

          {/* Waist Sash (Sabuk kain hitam tebal terikat di pinggang dengan ujung terurai) */}
          <path
            d="M 152 548 C 215 540 297 540 360 548 L 364 590 C 297 582 215 582 148 590 Z"
            fill="#18191c"
            stroke="#0d0e0f"
            strokeWidth="2"
          />
          {/* Sash knot & dangling ribbon */}
          <path
            d="M 285 570 C 295 580 305 630 310 670 L 292 672 C 288 630 280 585 275 570 Z"
            fill="#121314"
          />

          {/* Hand resting on waist/belt (Pose tangan seperti pada gambar user) */}
          <ellipse cx="305" cy="578" rx="22" ry="14" fill="#efd4c3" stroke="#ba9278" strokeWidth="1.5" />
          <path d="M 292 575 L 320 575 M 294 582 L 318 582" stroke="#ba9278" strokeWidth="1.5" />
        </svg>
      );
  }
};

// 4. LAYER 4 (Z-40): RAMBUT DEPAN, PONI, & MAHKOTA (FRONT HAIR)
const FrontHairSVG: React.FC<{ styleId?: string }> = ({ styleId }) => {
  switch (styleId) {
    case 'front_hair_02': // Ikat Kepala Pita Kain Hitam (Martial Headband)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-40">
          {/* Cloth Headband across upper forehead */}
          <path
            d="M 200 178 C 225 172 287 172 312 178 L 314 195 C 287 189 225 189 198 195 Z"
            fill="#1c1917"
            stroke="#44403c"
            strokeWidth="1.5"
          />
          {/* Spiky fringe falling below headband */}
          <path
            d="M 206 195 L 216 215 L 222 195 L 235 220 L 244 195 L 256 226 L 268 195 L 278 220 L 288 195 L 296 215 L 304 195"
            fill="#18161c"
          />
        </svg>
      );

    case 'front_hair_03': // Mahkota Pita Giok Pemula (Jade Crown & Side Strands)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-40">
          {/* Jade hair crest */}
          <path d="M 246 128 L 256 112 L 266 128 Z" fill="#34d399" stroke="#059669" strokeWidth="1.5" />
          {/* Delicate side wisps framing ears */}
          <path
            d="M 206 180 C 198 220 196 270 200 295 C 203 295 206 250 210 210 Z"
            fill="#1a1820"
          />
          <path
            d="M 306 180 C 314 220 316 270 312 295 C 309 295 306 250 302 210 Z"
            fill="#1a1820"
          />
        </svg>
      );

    case 'front_hair_04': // Poni Acak Liar Pengembara (Wild Fringe)
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-40">
          <defs>
            <linearGradient id="hairGradFrontWild" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2b2830" />
              <stop offset="100%" stopColor="#141318" />
            </linearGradient>
          </defs>
          {/* Sweeping bangs across forehead */}
          <path
            d="M 200 165 C 220 190 235 228 242 232 C 240 215 245 190 260 170 C 275 195 285 220 295 225 C 290 200 305 180 314 165 C 316 135 196 135 200 165 Z"
            fill="url(#hairGradFrontWild)"
          />
        </svg>
      );

    case 'front_hair_01': // Poni Belah Tengah Alami (Center-Parted Bangs - Default)
    default:
      return (
        <svg viewBox="0 0 512 768" className="absolute inset-0 w-full h-full pointer-events-none z-40">
          <defs>
            <linearGradient id="hairGradFrontDefault" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2730" />
              <stop offset="100%" stopColor="#131216" />
            </linearGradient>
          </defs>
          {/* Hair mass on top of crown */}
          <path
            d="M 200 160 C 200 120 312 120 312 160 C 312 170 308 185 304 195 C 296 180 285 175 275 185 C 265 195 258 215 256 220 C 254 215 247 195 237 185 C 227 175 216 180 208 195 C 204 185 200 170 200 160 Z"
            fill="url(#hairGradFrontDefault)"
          />
          {/* Left temple strand */}
          <path
            d="M 204 190 C 196 230 196 270 200 290 C 203 290 206 245 210 205 Z"
            fill="url(#hairGradFrontDefault)"
          />
          {/* Right temple strand */}
          <path
            d="M 308 190 C 316 230 316 270 312 290 C 309 290 306 245 302 205 Z"
            fill="url(#hairGradFrontDefault)"
          />
        </svg>
      );
  }
};

/**
 * =========================================================================
 * KOMPONEN UTAMA: CHARACTER LAYER RENDERER
 * Menumpuk 4 Layer Gambar/SVG Sesuai Urutan Z-Index Tale of Immortal
 * =========================================================================
 */
export default function CharacterLayerRenderer({
  face = 'face_01',
  frontHair = 'front_hair_01',
  backHair = 'back_hair_01',
  outfit = 'outfit_vagrant_black',
  className = '',
  showAura = true,
}: CharacterLayersProps) {
  // Ambil URL eksternal dari GLOBAL_ASSETS jika pengguna sudah mengisi
  const backHairUrl = GLOBAL_ASSETS.character_layers?.back_hair?.[backHair as keyof typeof GLOBAL_ASSETS.character_layers.back_hair];
  const faceUrl = GLOBAL_ASSETS.character_layers?.face?.[face as keyof typeof GLOBAL_ASSETS.character_layers.face];
  const outfitUrl = GLOBAL_ASSETS.character_layers?.starter_outfits?.[outfit as keyof typeof GLOBAL_ASSETS.character_layers.starter_outfits];
  const frontHairUrl = GLOBAL_ASSETS.character_layers?.front_hair?.[frontHair as keyof typeof GLOBAL_ASSETS.character_layers.front_hair];

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-gradient-to-b from-[#141926] via-[#0d1017] to-[#07090f] flex items-center justify-center ${className}`}
      style={{ aspectRatio: '2/3' }}
    >
      {/* Background Spiritual Aura & Wuxia Mountain Mist */}
      {showAura && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-cyan-500/10 blur-2xl" />
          {/* Subtle vignette border */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,7,12,0.85)_100%)]" />
        </div>
      )}

      {/* ================================================================ */}
      {/* LAYER 1 (Z-10): BACK HAIR (RAMBUT BELAKANG)                      */}
      {/* ================================================================ */}
      {isValidHttpUrl(backHairUrl) ? (
        <img
          src={backHairUrl}
          alt="Back Hair"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />
      ) : (
        <BackHairSVG styleId={backHair} />
      )}

      {/* ================================================================ */}
      {/* LAYER 2 (Z-20): BASE BODY & FACE (KEPALA POLOS / BALD BASE BODY) */}
      {/* ================================================================ */}
      {isValidHttpUrl(faceUrl) ? (
        <img
          src={faceUrl}
          alt="Base Body & Face"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
        />
      ) : (
        <BaseFaceBodySVG styleId={face} />
      )}

      {/* ================================================================ */}
      {/* LAYER 3 (Z-30): STARTER OUTFIT (JUBAH PENDEKAR PEMULA)          */}
      {/* ================================================================ */}
      {isValidHttpUrl(outfitUrl) ? (
        <img
          src={outfitUrl}
          alt="Starter Outfit"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30"
        />
      ) : (
        <StarterOutfitSVG styleId={outfit} />
      )}

      {/* ================================================================ */}
      {/* LAYER 4 (Z-40): FRONT HAIR (RAMBUT DEPAN & PONI)                 */}
      {/* ================================================================ */}
      {isValidHttpUrl(frontHairUrl) ? (
        <img
          src={frontHairUrl}
          alt="Front Hair"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-40"
        />
      ) : (
        <FrontHairSVG styleId={frontHair} />
      )}

      {/* Bottom Mist Vignette Fade */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#07090f] to-transparent pointer-events-none z-50" />
    </div>
  );
}
