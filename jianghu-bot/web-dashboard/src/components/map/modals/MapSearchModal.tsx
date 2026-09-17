'use client';
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Bookmark, X, Trash2, Compass, Navigation, Building2 } from 'lucide-react';

interface LandmarkOption {
  name: string;
  chineseName?: string;
  type: 'city' | 'village' | 'sect' | 'dungeon';
  x: number;
  y: number;
  region: string;
}

const NOTABLE_LANDMARKS: LandmarkOption[] = [
  // Kota & Desa Utama
  { name: 'Tianjing Capital', chineseName: '天京', type: 'city', x: 2600, y: 2550, region: 'Central Plains' },
  { name: 'XiTong City', chineseName: '析桐城', type: 'city', x: 2500, y: 2500, region: 'Central Plains' },
  { name: 'Desa Xingcun', chineseName: '杏村', type: 'village', x: 2450, y: 2480, region: 'Central Plains' },
  { name: 'Desa Qingshui', chineseName: '青水村', type: 'village', x: 2420, y: 2470, region: 'Central Plains' },
  { name: 'Desa Tiedao', chineseName: '铁道村', type: 'village', x: 2530, y: 2460, region: 'Central Plains' },

  // Sekte Populer
  { name: 'Heavenly Sword Pavilion', chineseName: '天剑阁', type: 'sect', x: 2580, y: 2520, region: 'Central Plains' },
  { name: 'Profound Heaven Sect', chineseName: '玄天宗', type: 'sect', x: 2480, y: 2440, region: 'Central Plains' },
  { name: 'Golden Bell Monastery', chineseName: '金钟寺', type: 'sect', x: 1800, y: 2200, region: 'Azure Mountain' },
  { name: 'Demonic Flame Palace', chineseName: '魔焰宫', type: 'sect', x: 2800, y: 3800, region: 'Southern Demon' },
  { name: 'Jade Purity Palace', chineseName: '玉清宫', type: 'sect', x: 4100, y: 2500, region: 'Eastern Sea' },
  { name: 'Whitecloud Medicine Hall', chineseName: '白云药堂', type: 'sect', x: 2200, y: 1200, region: 'Northern Desolate' },
  { name: 'Azure Cloud Temple', chineseName: '碧云寺', type: 'sect', x: 1100, y: 2600, region: 'Western Sacred' },

  // Titik Ekspedisi / Dungeon
  { name: 'Gua Rahasia Kuno', chineseName: '古秘洞', type: 'dungeon', x: 2430, y: 2495, region: 'Central Plains' },
  { name: 'Makam Kaisar Pedang', chineseName: '剑帝冢', type: 'dungeon', x: 2550, y: 2430, region: 'Central Plains' }
];

export interface MapBookmark {
  id: string;
  label: string;
  x: number;
  y: number;
  createdAt: number;
}

interface MapSearchModalProps {
  currentPos: { x: number; y: number };
  selectedPos?: { x: number; y: number } | null;
  onSelectLocation: (x: number, y: number, label?: string) => void;
  onClose: () => void;
}

export default function MapSearchModal({
  currentPos,
  selectedPos,
  onSelectLocation,
  onClose
}: MapSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'landmarks' | 'bookmarks'>('landmarks');
  const [bookmarks, setBookmarks] = useState<MapBookmark[]>([]);
  const [newBookmarkName, setNewBookmarkName] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jianghu_map_bookmarks');
      if (saved) {
        setBookmarks(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveBookmarks = (list: MapBookmark[]) => {
    setBookmarks(list);
    localStorage.setItem('jianghu_map_bookmarks', JSON.stringify(list));
  };

  const handleAddBookmark = () => {
    const target = selectedPos || currentPos;
    const name = newBookmarkName.trim() || `Petak (${target.x}, ${target.y})`;
    const newEntry: MapBookmark = {
      id: String(Date.now()),
      label: name,
      x: target.x,
      y: target.y,
      createdAt: Date.now()
    };
    saveBookmarks([newEntry, ...bookmarks]);
    setNewBookmarkName('');
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveBookmarks(bookmarks.filter(b => b.id !== id));
  };

  // Parsing koordinat langsung jika pengguna mengetik angka, misal "2450, 2480"
  const coordinateMatch = query.match(/^\s*\(?\s*(\d{1,4})\s*[, ]\s*(\d{1,4})\s*\)?\s*$/);
  const parsedCoords = coordinateMatch
    ? { x: parseInt(coordinateMatch[1]), y: parseInt(coordinateMatch[2]) }
    : null;

  const filteredLandmarks = NOTABLE_LANDMARKS.filter(lm => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      lm.name.toLowerCase().includes(q) ||
      (lm.chineseName && lm.chineseName.includes(q)) ||
      lm.region.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e131d] border border-amber-600/70 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden text-xs text-gray-200">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#1c160e] via-[#2a2015] to-[#17120a] border-b border-amber-800/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <h3 className="text-amber-200 font-serif font-bold text-sm">Pencarian & Penanda Koordinat</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-b border-gray-800/80 bg-[#121722]/80 space-y-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-amber-400/80 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kota, sekte, atau koordinat (mis: 2500, 2500)..."
              className="w-full bg-black/60 border border-amber-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-100 placeholder:text-gray-500 focus:outline-none focus:border-amber-500/80 transition-colors"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 text-gray-500 hover:text-gray-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Coordinate Match CTA */}
          {parsedCoords && (
            <button
              onClick={() => {
                onSelectLocation(parsedCoords.x, parsedCoords.y, `Koordinat (${parsedCoords.x}, ${parsedCoords.y})`);
                onClose();
              }}
              className="w-full py-1.5 px-3 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 rounded-lg text-amber-200 font-semibold flex items-center justify-between transition-colors text-xs"
            >
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                Lompat ke Koordinat: <strong>({parsedCoords.x}, {parsedCoords.y})</strong>
              </span>
              <span className="text-[10px] text-amber-400 uppercase tracking-wide font-mono">Buka Petak &rarr;</span>
            </button>
          )}

          {/* Quick Return to Current Character Position Button */}
          <button
            onClick={() => {
              onSelectLocation(currentPos.x, currentPos.y, 'Posisi Karakter');
              onClose();
            }}
            className="w-full py-1.5 px-3 bg-[#161c28] hover:bg-[#1f2838] border border-emerald-600/50 hover:border-emerald-500 rounded-lg text-emerald-300 font-semibold flex items-center justify-between transition-colors text-xs"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Posisi Karakter Saat Ini: <strong>({currentPos.x}, {currentPos.y})</strong></span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Pusatkan 🎯</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex gap-1 pt-1">
            <button
              onClick={() => setActiveTab('landmarks')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'landmarks' ? 'bg-amber-900/50 text-amber-200 border border-amber-600/50' : 'text-gray-400 hover:bg-gray-800/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Landmark & Kota
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'bookmarks' ? 'bg-amber-900/50 text-amber-200 border border-amber-600/50' : 'text-gray-400 hover:bg-gray-800/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" /> Bookmark Saya ({bookmarks.length})
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 max-h-72 overflow-y-auto custom-scrollbar space-y-1.5">
          {activeTab === 'landmarks' && (
            <>
              {filteredLandmarks.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs italic">
                  Tidak ada landmark yang cocok dengan "{query}".
                </div>
              ) : (
                filteredLandmarks.map((lm, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectLocation(lm.x, lm.y, lm.name);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#141a24] hover:bg-[#1c2432] border border-gray-800/80 hover:border-amber-600/50 cursor-pointer transition-all active:scale-98"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">
                        {lm.type === 'city' ? '🏯' : lm.type === 'village' ? '🏡' : lm.type === 'sect' ? '⛩️' : '🌀'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-200 text-xs truncate flex items-center gap-1.5">
                          <span>{lm.name}</span>
                          {lm.chineseName && <span className="text-amber-400/80 font-serif text-[10px]">({lm.chineseName})</span>}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {lm.region} • Koordinat ({lm.x}, {lm.y})
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-300/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50 flex-shrink-0 font-mono">
                      Lompat
                    </span>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'bookmarks' && (
            <div className="space-y-3">
              {/* Tambah Bookmark Cepat */}
              <div className="flex gap-1.5 items-center bg-black/40 p-2 rounded-lg border border-amber-900/40">
                <input
                  type="text"
                  value={newBookmarkName}
                  onChange={(e) => setNewBookmarkName(e.target.value)}
                  placeholder={`Nama penanda (Petak ${selectedPos?.x ?? currentPos.x}, ${selectedPos?.y ?? currentPos.y})...`}
                  className="flex-1 bg-transparent text-xs text-amber-200 placeholder:text-gray-500 focus:outline-none"
                />
                <button
                  onClick={handleAddBookmark}
                  className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-amber-100 rounded-md font-bold text-[11px] border border-amber-500/60 transition-colors flex-shrink-0 flex items-center gap-1"
                >
                  <Bookmark className="w-3 h-3 text-amber-300" />
                  <span>Tandai</span>
                </button>
              </div>

              {bookmarks.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs italic">
                  Belum ada petak yang ditandai. Klik tombol "Tandai" untuk menyimpan lokasi favoritmu!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      onClick={() => {
                        onSelectLocation(bm.x, bm.y, bm.label);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#141a24] hover:bg-[#1c2432] border border-gray-800/80 hover:border-amber-600/50 cursor-pointer transition-all active:scale-98"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-200 text-xs truncate">{bm.label}</div>
                          <div className="text-[10px] text-amber-400/80 font-mono">Koordinat ({bm.x}, {bm.y})</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50 font-mono">
                          Lompat
                        </span>
                        <button
                          onClick={(e) => handleDeleteBookmark(bm.id, e)}
                          className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                          title="Hapus Penanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#0b0e14] px-4 py-2 border-t border-gray-800 text-[10px] text-gray-500 flex justify-between items-center">
          <span>Karakter saat ini: ({currentPos.x}, {currentPos.y})</span>
          <span>Peta Dunia: 5.000 x 5.000 Petak</span>
        </div>

      </div>
    </div>
  );
}
