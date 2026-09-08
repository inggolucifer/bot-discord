/**
 * Static Configuration for Professions Minigame Recipes
 * This defines the inputs (materials + tool) required, and the outcome of the crafting minigame.
 * Following ECOSYSTEM_RULES, recipes consume lower-tier items.
 */

const RECIPES = {
    // Smithing
    "Besi Murni": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 1,
        materials: [
            { name: "Bijih Besi", quantity: 2 }
        ],
        output: { name: "Batangan Besi", quantity: 1 }
    },
    "Baja Murni": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 2,
        materials: [
            { name: "Batangan Besi", quantity: 2 },
            { name: "Batu Bara", quantity: 1 }
        ],
        output: { name: "Baja Murni", quantity: 1 }
    },
    "Pedang Baja": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 3,
        materials: [
            { name: "Baja Murni", quantity: 3 },
            { name: "Papan Kayu", quantity: 1 }
        ],
        output: { name: "Pedang Baja", quantity: 1 }
    },

    // Alchemy
    "Pil Pekerja Keras": {
        profession: "alchemy",
        toolType: "furnace",
        minToolTier: 1,
        materials: [
            { name: "Akar Stamina", quantity: 2 },
            { name: "Air Bersih", quantity: 1 }
        ],
        output: { name: "Pil Pekerja Keras", quantity: 1 }
    },
    "Obat Luka Bakar Besi": {
        profession: "alchemy",
        toolType: "furnace",
        minToolTier: 2,
        materials: [
            { name: "Daun Herbal Pereda Nyeri", quantity: 2 },
            { name: "Getah Pohon", quantity: 1 }
        ],
        output: { name: "Obat Luka Bakar Besi", quantity: 1 }
    },
    "Pil Pengumpul Qi": {
        profession: "alchemy",
        toolType: "furnace",
        minToolTier: 3,
        materials: [
            { name: "Batu Roh Kasar", quantity: 2 },
            { name: "Teratai Es Seribu Tahun", quantity: 1 }
        ],
        output: { name: "Pil Pengumpul Qi", quantity: 1 }
    },

    // Cooking
    "Makanan Matang": {
        profession: "cooking",
        toolType: "kitchen_tool",
        minToolTier: 1,
        materials: [
            { name: "Daging Mentah", quantity: 1 },
            { name: "Air Bersih", quantity: 1 }
        ],
        output: { name: "Makanan Matang", quantity: 1 }
    },
    "Sup Sayur Daging": {
        profession: "cooking",
        toolType: "kitchen_tool",
        minToolTier: 2,
        materials: [
            { name: "Daging Mentah", quantity: 1 },
            { name: "Jamur Hutan Liar", quantity: 2 },
            { name: "Air Bersih", quantity: 1 }
        ],
        output: { name: "Sup Sayur Daging", quantity: 1 }
    },
    "Daging Asap": {
        profession: "cooking",
        toolType: "kitchen_tool",
        minToolTier: 2,
        materials: [
            { name: "Daging Mentah", quantity: 2 },
            { name: "Kayu Mentah", quantity: 1 } // Used for smoking
        ],
        output: { name: "Daging Asap", quantity: 1 }
    },

    // Farming (Some could just consume tool and no specific input except seeds if wanted, but following materials requirement rule)
    "Bibit Padi -> Beras": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 1,
        materials: [
            { name: "Bibit Padi", quantity: 5 },
            { name: "Air Bersih", quantity: 2 }
        ],
        output: { name: "Beras Mentah", quantity: 10 }
    },
    "Kapas Mentah": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 2,
        materials: [
            { name: "Air Bersih", quantity: 3 }
        ],
        output: { name: "Kapas", quantity: 5 }
    },

    // Fishing
    "Ikan Segar Dasar": {
        profession: "fishing",
        toolType: "fishing_rod",
        minToolTier: 1,
        materials: [
            { name: "Serangga Tanah", quantity: 3 } // Bait
        ],
        output: { name: "Ikan Segar", quantity: 1 }
    }
,
    // Fishing T2 & T3
    "Ikan Sungai Menengah": {
        profession: "fishing",
        toolType: "fishing_rod",
        minToolTier: 2,
        materials: [
            { name: "Bait Serangga Langka", quantity: 1 }
        ],
        output: { name: "Ikan Sungai", quantity: 1 }
    },
    "Ikan Mas Spiritual (T3)": {
        profession: "fishing",
        toolType: "fishing_rod",
        minToolTier: 3,
        materials: [
            { name: "Bait Serangga Emas", quantity: 1 }
        ],
        output: { name: "Ikan Mas Spiritual", quantity: 1 }
    },

    // Cooking T3
    "Hidangan Ikan Asap (T3)": {
        profession: "cooking",
        toolType: "kitchen_tool",
        minToolTier: 3,
        materials: [
            { name: "Ikan Sungai", quantity: 1 },
            { name: "Air Bersih", quantity: 2 },
            { name: "Kayu Mentah", quantity: 2 }
        ],
        output: { name: "Hidangan Ikan Asap", quantity: 1 }
    },

    // Farming T3
    "Padi Kualitas Tinggi (T3)": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 3,
        materials: [
            { name: "Bibit Padi Liar", quantity: 2 },
            { name: "Air Bersih", quantity: 4 }
        ],
        output: { name: "Gandum Kualitas Tinggi", quantity: 3 }
    }

};

module.exports = RECIPES;
