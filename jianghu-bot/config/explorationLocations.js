const EXPLORATION_LOCATIONS = [
    {
        id: 'hutan_bambu',
        name: 'Hutan Bambu Pinggiran',
        description: 'Area aman untuk pemula. Cocok untuk mencari material dasar.',
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
            ]
        }
    },
    {
        id: 'danau_teratai',
        name: 'Danau Teratai Hitam',
        description: 'Danau yang tenang namun menyimpan bahaya tersembunyi. Sumber air dan material tanah.',
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
                { name: 'Ikan Mas', chance: 0.3, min: 1, max: 2 },
                { name: 'Ikan Beracun', chance: 0.2, min: 1, max: 1 }
            ]
        }
    },
    {
        id: 'lembah_iblis',
        name: 'Lembah Iblis Beracun',
        description: 'Tempat berbahaya yang penuh dengan racun dan monster. Risiko tinggi, hadiah tinggi.',
        minRealmLevel: 1,
        tier: 1,
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
                { name: 'Jamur Beracun', chance: 0.7, min: 1, max: 4 },
                { name: 'Tulang Hewan', chance: 0.6, min: 1, max: 2 },
                { name: 'Akar Stamina', chance: 0.3, min: 1, max: 2 },
                { name: 'Kulit Mentah', chance: 0.5, min: 1, max: 2 },
                { name: 'Bulu Hewan', chance: 0.4, min: 1, max: 3 },
                { name: 'Daging Mentah', chance: 0.5, min: 1, max: 2 },
                { name: 'Akar Beracun', chance: 0.2, min: 1, max: 1 }
            ]
        }
    },
    {
        id: 'gua_kristal',
        name: 'Gua Kristal Roh',
        description: 'Gua kuno yang mengandung energi Qi tebal. Sangat langka materialnya.',
        minRealmLevel: 2,
        tier: 2,
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
                { name: 'Batu Bara', chance: 0.6, min: 2, max: 5 },
                { name: 'Bijih Besi', chance: 0.5, min: 1, max: 3 },
                { name: 'Batu Tajam', chance: 0.5, min: 1, max: 3 },
                { name: 'Batu Roh Kasar', chance: 0.15, min: 1, max: 1 },
                { name: 'Bunga Penurun Panas', chance: 0.4, min: 1, max: 2 },
                { name: 'Kristal Jiwa', chance: 0.05, min: 1, max: 1 }
            ]
        }
    },
    {
        id: 'puncak_surga',
        name: 'Puncak Surga Runtuh',
        description: 'Area kultivator tingkat tinggi. Mengandung material langka sisa-sisa pertempuran para dewa.',
        minRealmLevel: 4,
        tier: 3,
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
                { name: 'Batu Roh Murni', chance: 0.3, min: 1, max: 2 },
                { name: 'Pasir Waktu', chance: 0.2, min: 1, max: 1 },
                { name: 'Kayu Surga', chance: 0.1, min: 1, max: 1 },
                { name: 'Serbuk Bintang Jatuh', chance: 0.05, min: 1, max: 1 },
                { name: 'Tulang Dewa Kuno', chance: 0.01, min: 1, max: 1 }
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
