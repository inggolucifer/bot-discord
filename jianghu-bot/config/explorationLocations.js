const EXPLORATION_LOCATIONS = [
    {
        id: 'provinsi_qingzhou',
        name: 'Provinsi Qingzhou (Tepi Luar)',
        description: 'Wilayah luar Provinsi Qingzhou yang damai namun sesekali didatangi bandit atau binatang liar kecil. Cocok untuk Kultivator pemula mengumpulkan sumber daya dasar.',
        minRealmLevel: 0,
        tier: 0,
        copperCostPerHour: 50,
        silverCostPerHour: 0,
        provisions: {
            acceptedItemNames: ["Makanan Matang", "Ransum Militer"],
            minQty: 1,
            qtyPerHour: 1 / 3
        },
        durations: [1, 3, 6], // in hours
        drops: {
            currency: { copper: [5, 20] },
            items: [
                { name: 'Batu Kasar', chance: 0.8, min: 1, max: 3 },
                { name: 'Kayu Mentah', chance: 0.8, min: 1, max: 3 },
                { name: 'Daun Kering', chance: 0.7, min: 1, max: 4 },
                { name: 'Daun Herbal Pereda Nyeri', chance: 0.4, min: 1, max: 2 },
                { name: 'Buah Liar', chance: 0.6, min: 1, max: 2 },
                { name: 'Serat Tumbuhan', chance: 0.5, min: 1, max: 3 },
                { name: 'Getah Pohon', chance: 0.3, min: 1, max: 2 },
                { name: 'Biji Ek', chance: 0.3, min: 1, max: 2 }
            ],
            monsters: [
                { name: 'Bandit Gunung', desc: 'Preman yang memalak pelancong.' },
                { name: 'Babi Hutan Liar', desc: 'Babi hutan yang mencari makan.' },
                { name: 'Ular Hijau', desc: 'Ular berbisa rendah yang bersembunyi di rerumputan.' }
            ]
        }
    },
    {
        id: 'provinsi_yanzhou',
        name: 'Provinsi Yanzhou (Hutan Kabut Berdarah)',
        description: 'Provinsi yang dipenuhi kabut merah abadi. Tempat ini penuh dengan monster buas yang telah bermutasi akibat energi jahat.',
        minRealmLevel: 1,
        tier: 1,
        copperCostPerHour: 100,
        silverCostPerHour: 0,
        provisions: {
            acceptedItemNames: ["Makanan Matang", "Sup Sayur Daging", "Daging Asap"],
            minQty: 1,
            qtyPerHour: 1 / 3
        },
        durations: [2, 4, 8],
        drops: {
            currency: { copper: [15, 30] },
            items: [
                { name: 'Lumpur Basah', chance: 0.7, min: 2, max: 4 },
                { name: 'Pasir Halus', chance: 0.6, min: 1, max: 3 },
                { name: 'Pecahan Kerang', chance: 0.5, min: 1, max: 2 },
                { name: 'Bambu Hijau', chance: 0.4, min: 1, max: 2 },
                { name: 'Jamur Beracun', chance: 0.7, min: 1, max: 4 },
                { name: 'Tulang Hewan', chance: 0.6, min: 1, max: 2 },
                { name: 'Akar Stamina', chance: 0.3, min: 1, max: 2 },
                { name: 'Ikan Beracun', chance: 0.2, min: 1, max: 1 }
            ],
            monsters: [
                { name: 'Serigala Bayangan Merah', desc: 'Serigala yang bergerak di dalam kabut berdarah.' },
                { name: 'Kelelawar Penghisap Qi', desc: 'Kelelawar raksasa yang menyedot energi kultivator.' },
                { name: 'Siluman Pohon Mati', desc: 'Pohon layu yang hidup dan menjerat mangsanya.' }
            ]
        }
    },
    {
        id: 'provinsi_xuzhou',
        name: 'Provinsi Xuzhou (Lembah Seratus Racun)',
        description: 'Sekte-sekte aliran sesat sering membuang racun eksperimen mereka di sini. Sangat berbahaya namun kaya akan material alkimia langkah.',
        minRealmLevel: 2,
        tier: 2,
        copperCostPerHour: 150,
        silverCostPerHour: 0,
        provisions: {
            acceptedItemNames: ["Daging Asap", "Sup Sayur Daging", "Makanan Matang"],
            minQty: 1,
            qtyPerHour: 1 / 3
        },
        durations: [3, 6, 12],
        drops: {
            currency: { copper: [30, 60], silver: [0, 1] }, // low chance for 1 silver
            items: [
                { name: 'Batu Bara', chance: 0.6, min: 2, max: 5 },
                { name: 'Bijih Besi', chance: 0.5, min: 1, max: 3 },
                { name: 'Batu Tajam', chance: 0.5, min: 1, max: 3 },
                { name: 'Batu Roh Kasar', chance: 0.15, min: 1, max: 1 },
                { name: 'Kulit Mentah', chance: 0.5, min: 1, max: 2 },
                { name: 'Bulu Hewan', chance: 0.4, min: 1, max: 3 },
                { name: 'Akar Beracun', chance: 0.2, min: 1, max: 1 }
            ],
            monsters: [
                { name: 'Kalajengking Berekor Besi', desc: 'Kalajengking raksasa dengan sengat sekuat baja.' },
                { name: 'Katak Pembawa Wabah', desc: 'Katak berukuran besar yang menyemburkan gas beracun.' },
                { name: 'Kultivator Aliran Sesat', desc: 'Kultivator jahat yang mencari tumbal manusia.' }
            ]
        }
    },
    {
        id: 'provinsi_jingzhou',
        name: 'Provinsi Jingzhou (Gua Naga Kristal)',
        description: 'Dikatakan seekor naga tanah tertidur di gua ini. Energi spiritual sangat pekat sehingga material di dalamnya bermutasi.',
        minRealmLevel: 3,
        tier: 3,
        copperCostPerHour: 250,
        silverCostPerHour: 0,
        provisions: {
            acceptedItemNames: ["Daging Asap", "Sup Sayur Daging", "Hidangan Ikan Asap"],
            minQty: 1,
            qtyPerHour: 0.5
        },
        durations: [6, 12, 24],
        drops: {
            currency: { silver: [1, 4] },
            items: [
                { name: 'Batu Roh Murni', chance: 0.3, min: 1, max: 2 },
                { name: 'Bunga Penurun Panas', chance: 0.4, min: 1, max: 2 },
                { name: 'Kristal Jiwa', chance: 0.05, min: 1, max: 1 },
                { name: 'Sisik Ular Batu', chance: 0.2, min: 1, max: 2 }
            ],
            monsters: [
                { name: 'Golem Kristal Roh', desc: 'Boneka batu yang tercipta dari kondensasi energi spiritual.' },
                { name: 'Ular Berlapis Batu', desc: 'Ular dengan kulit sekeras batu karang.' },
                { name: 'Roh Penjaga Gua', desc: 'Sisa-sisa jiwa kultivator kuno yang melindungi harta karun.' }
            ]
        }
    },
    {
        id: 'provinsi_liangzhou',
        name: 'Provinsi Liangzhou (Padang Pasir Kematian)',
        description: 'Padang pasir luas yang menyedot kelembapan dan Qi dari udara. Hanya kultivator kuat yang mampu bertahan dari badai pasirnya.',
        minRealmLevel: 4,
        tier: 4,
        copperCostPerHour: 500,
        silverCostPerHour: 0,
        provisions: {
            acceptedItemNames: ["Steik Daging Naga Tanah", "Pesta Istana Naga"],
            minQty: 2,
            qtyPerHour: 0.5
        },
        durations: [12, 24, 48],
        drops: {
            currency: { silver: [5, 15], gold: [0, 1] },
            items: [
                { name: 'Pasir Waktu', chance: 0.2, min: 1, max: 1 },
                { name: 'Kayu Surga', chance: 0.1, min: 1, max: 1 },
                { name: 'Serbuk Bintang Jatuh', chance: 0.05, min: 1, max: 1 },
                { name: 'Batu Bara', chance: 0.8, min: 2, max: 5 },
                { name: 'Bijih Besi', chance: 0.7, min: 1, max: 3 }
            ],
            monsters: [
                { name: 'Cacing Pasir Raksasa', desc: 'Cacing raksasa yang menyergap dari dalam tanah.' },
                { name: 'Scarab Pemakan Besi', desc: 'Kumbang yang memakan logam dan senjata.' },
                { name: 'Iblis Angin Panggur', desc: 'Iblis yang tercipta dari badai pasir mematikan.' }
            ]
        }
    },
    {
        id: 'provinsi_zhongzhou',
        name: 'Provinsi Zhongzhou (Reruntuhan Istana Langit)',
        description: 'Pusat benua yang berisi peninggalan era Dewa. Mengandung harta karun luar biasa, namun dijaga oleh eksistensi di luar nalar.',
        minRealmLevel: 5,
        tier: 5,
        copperCostPerHour: 1000,
        silverCostPerHour: 1,
        provisions: {
            acceptedItemNames: ["Steik Daging Naga Tanah", "Pesta Istana Naga", "Pil Restorasi Energi"],
            minQty: 2,
            qtyPerHour: 1
        },
        durations: [24, 48, 72],
        drops: {
            currency: { silver: [20, 50], gold: [1, 3] },
            items: [
                { name: 'Batu Roh Murni', chance: 0.8, min: 2, max: 5 },
                { name: 'Tulang Dewa Kuno', chance: 0.05, min: 1, max: 1 },
                { name: 'Pecahan Artefak Dewa', chance: 0.01, min: 1, max: 1 },
                { name: 'Teratai Emas 1000 Tahun', chance: 0.02, min: 1, max: 1 }
            ],
            monsters: [
                { name: 'Kesatria Armor Ilahi (Rusak)', desc: 'Penjaga istana yang kehilangan akalnya.' },
                { name: 'Naga Tulang Raksasa', desc: 'Sisa-sisa naga agung yang dibangkitkan oleh energi gelap.' },
                { name: 'Mata Pengawas Langit', desc: 'Eksistensi misterius yang menatap dari kekosongan.' }
            ]
        }
    }
];

function getExplorationEntryCost(location, durationHours) {
  return {
    copperCost: (location.copperCostPerHour || 0) * durationHours,
    silverCost: (location.silverCostPerHour || 0) * durationHours,
    foodQty: Math.max(
      location.provisions?.minQty || 0,
      Math.ceil(durationHours * (location.provisions?.qtyPerHour || 0))
    ),
    acceptedItemNames: location.provisions?.acceptedItemNames || []
  };
}

module.exports = { EXPLORATION_LOCATIONS, getExplorationEntryCost };
