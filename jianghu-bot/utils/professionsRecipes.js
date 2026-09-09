/**
 * Static Configuration for Professions Minigame Recipes
 * This defines the inputs (materials + tool) required, and the outcome of the crafting minigame.
 * Following ECOSYSTEM_RULES, recipes consume lower-tier items.
 */

const RECIPES = {
    // ==========================================
    // SMITHING (forge)
    // ==========================================
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
    "Alat Pancing Baja": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 3,
        materials: [
            { name: "Baja Murni", quantity: 2 },
            { name: "Papan Kayu", quantity: 2 }
        ],
        output: { name: "Joran Baja", quantity: 1 }
    },
    "Cangkul Baja": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 3,
        materials: [
            { name: "Baja Murni", quantity: 2 },
            { name: "Papan Kayu", quantity: 1 }
        ],
        output: { name: "Cangkul Baja", quantity: 1 }
    },
    "Baja Keras (T4)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 4,
        materials: [
            { name: "Baja Murni", quantity: 2 },
            { name: "Arang Spiritual", quantity: 1 }
        ],
        output: { name: "Baja Keras", quantity: 1 }
    },
    "Pedang Baja Keras (T4)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 4,
        materials: [
            { name: "Baja Keras", quantity: 3 },
            { name: "Kayu Spiritual", quantity: 1 }
        ],
        output: { name: "Pedang Baja Keras", quantity: 1 }
    },
    "Peralatan T4 (Joran)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 4,
        materials: [
            { name: "Baja Keras", quantity: 2 },
            { name: "Kayu Spiritual", quantity: 1 }
        ],
        output: { name: "Joran Baja Keras", quantity: 1 }
    },
    "Peralatan T4 (Cangkul)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 4,
        materials: [
            { name: "Baja Keras", quantity: 2 },
            { name: "Kayu Spiritual", quantity: 1 }
        ],
        output: { name: "Cangkul Baja Keras", quantity: 1 }
    },
    "Peralatan T4 (Tungku)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 4,
        materials: [
            { name: "Baja Keras", quantity: 4 },
            { name: "Batu Bata Roh", quantity: 2 }
        ],
        output: { name: "Tungku Baja Keras", quantity: 1 }
    },
    "Peralatan T4 (Dapur)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 4,
        materials: [
            { name: "Baja Keras", quantity: 2 },
            { name: "Kayu Spiritual", quantity: 1 }
        ],
        output: { name: "Peralatan Dapur Baja Keras", quantity: 1 }
    },
    "Baja Meteorit (T5)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 5,
        materials: [
            { name: "Baja Keras", quantity: 2 },
            { name: "Pecahan Meteorit", quantity: 1 }
        ],
        output: { name: "Baja Meteorit", quantity: 1 }
    },
    "Peralatan T5 (Joran)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 5,
        materials: [
            { name: "Baja Meteorit", quantity: 2 },
            { name: "Kayu Api Besi", quantity: 1 }
        ],
        output: { name: "Alat Pancing Meteorit", quantity: 1 }
    },
    "Peralatan T5 (Cangkul)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 5,
        materials: [
            { name: "Baja Meteorit", quantity: 2 },
            { name: "Kayu Api Besi", quantity: 1 }
        ],
        output: { name: "Cangkul Meteorit", quantity: 1 }
    },
    "Peralatan T5 (Tungku)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 5,
        materials: [
            { name: "Baja Meteorit", quantity: 4 },
            { name: "Batu Bata Roh", quantity: 2 }
        ],
        output: { name: "Tungku Meteorit", quantity: 1 }
    },
    "Peralatan T5 (Dapur)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 5,
        materials: [
            { name: "Baja Meteorit", quantity: 2 },
            { name: "Kayu Api Besi", quantity: 1 }
        ],
        output: { name: "Peralatan Dapur Meteorit", quantity: 1 }
    },
    "Peralatan T5 (Forge)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 5,
        materials: [
            { name: "Baja Meteorit", quantity: 3 },
            { name: "Kayu Api Besi", quantity: 1 }
        ],
        output: { name: "Palu Forge Meteorit", quantity: 1 }
    },
    "Baja Nirwana (T6)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 6,
        materials: [
            { name: "Baja Meteorit", quantity: 3 },
            { name: "Batu Es Abadi", quantity: 1 }
        ],
        output: { name: "Baja Nirwana", quantity: 1 }
    },
    "Pedang Nirwana (T6)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 6,
        materials: [
            { name: "Baja Nirwana", quantity: 3 },
            { name: "Kayu Pohon Dunia", quantity: 1 }
        ],
        output: { name: "Pedang Nirwana", quantity: 1 }
    },
    "Peralatan T6 (Joran)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 6,
        materials: [
            { name: "Baja Nirwana", quantity: 2 },
            { name: "Kayu Pohon Dunia", quantity: 1 }
        ],
        output: { name: "Alat Pancing Nirwana", quantity: 1 }
    },
    "Peralatan T6 (Cangkul)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 6,
        materials: [
            { name: "Baja Nirwana", quantity: 2 },
            { name: "Kayu Pohon Dunia", quantity: 1 }
        ],
        output: { name: "Cangkul Nirwana", quantity: 1 }
    },
    "Peralatan T6 (Tungku)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 6,
        materials: [
            { name: "Baja Nirwana", quantity: 4 },
            { name: "Kristal Roh Surgawi", quantity: 2 }
        ],
        output: { name: "Tungku Nirwana", quantity: 1 }
    },
    "Peralatan T6 (Dapur)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 6,
        materials: [
            { name: "Baja Nirwana", quantity: 2 },
            { name: "Kayu Pohon Dunia", quantity: 1 }
        ],
        output: { name: "Peralatan Dapur Nirwana", quantity: 1 }
    },
    "Peralatan T6 (Forge)": {
        profession: "smithing",
        toolType: "forge",
        minToolTier: 6,
        materials: [
            { name: "Baja Nirwana", quantity: 3 },
            { name: "Kayu Pohon Dunia", quantity: 1 }
        ],
        output: { name: "Palu Forge Nirwana", quantity: 1 }
    },

    // ==========================================
    // ALCHEMY (furnace)
    // ==========================================
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
    "Pil Pemadatan Qi (T4)": {
        profession: "alchemy",
        toolType: "furnace",
        minToolTier: 4,
        materials: [
            { name: "Batu Roh Halus", quantity: 2 },
            { name: "Daun Teratai Es", quantity: 2 }
        ],
        output: { name: "Pil Pemadatan Qi", quantity: 1 }
    },
    "Pil Formasi Inti (T5)": {
        profession: "alchemy",
        toolType: "furnace",
        minToolTier: 5,
        materials: [
            { name: "Batu Roh Murni", quantity: 2 },
            { name: "Akar Darah Naga", quantity: 1 }
        ],
        output: { name: "Pil Formasi Inti", quantity: 1 }
    },
    "Pil Kesengsaraan Surgawi (T6)": {
        profession: "alchemy",
        toolType: "furnace",
        minToolTier: 6,
        materials: [
            { name: "Kristal Roh Surgawi", quantity: 2 },
            { name: "Bunga Teratai Sembilan Warna", quantity: 1 }
        ],
        output: { name: "Pil Kesengsaraan Surgawi", quantity: 1 }
    },

    // ==========================================
    // COOKING (kitchen_tool)
    // ==========================================
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
            { name: "Kayu Mentah", quantity: 1 }
        ],
        output: { name: "Daging Asap", quantity: 1 }
    },
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
    "Sop Daging Ikan Mas (T4)": {
        profession: "cooking",
        toolType: "kitchen_tool",
        minToolTier: 4,
        materials: [
            { name: "Ikan Mas Spiritual", quantity: 1 },
            { name: "Garam Roh", quantity: 1 },
            { name: "Air Bersih", quantity: 2 }
        ],
        output: { name: "Sop Daging Ikan Mas", quantity: 1 }
    },
    "Steik Daging Naga Tanah (T5)": {
        profession: "cooking",
        toolType: "kitchen_tool",
        minToolTier: 5,
        materials: [
            { name: "Daging Naga Tanah", quantity: 1 },
            { name: "Rempah Api", quantity: 1 }
        ],
        output: { name: "Steik Daging Naga Tanah", quantity: 1 }
    },
    "Pesta Istana Naga (T6)": {
        profession: "cooking",
        toolType: "kitchen_tool",
        minToolTier: 6,
        materials: [
            { name: "Daging Raja Laut", quantity: 1 },
            { name: "Rempah Nirwana", quantity: 2 }
        ],
        output: { name: "Pesta Istana Naga", quantity: 1 }
    },

    // ==========================================
    // FISHING (fishing_rod)
    // ==========================================
    "Ikan Segar Dasar": {
        profession: "fishing",
        toolType: "fishing_rod",
        minToolTier: 1,
        materials: [
            { name: "Serangga Tanah", quantity: 3 }
        ],
        output: { name: "Ikan Segar", quantity: 1 }
    },
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
    "Ikan Perak Giok (T4)": {
        profession: "fishing",
        toolType: "fishing_rod",
        minToolTier: 4,
        materials: [
            { name: "Bait Cacing Roh", quantity: 1 }
        ],
        output: { name: "Ikan Perak Giok", quantity: 1 }
    },
    "Ikan Koi Api (T5)": {
        profession: "fishing",
        toolType: "fishing_rod",
        minToolTier: 5,
        materials: [
            { name: "Bait Belalang Api", quantity: 1 }
        ],
        output: { name: "Ikan Koi Api", quantity: 1 }
    },
    "Ikan Naga Emas (T6)": {
        profession: "fishing",
        toolType: "fishing_rod",
        minToolTier: 6,
        materials: [
            { name: "Bait Ulat Sutra Langit", quantity: 1 }
        ],
        output: { name: "Ikan Naga Emas", quantity: 1 }
    },

    // ==========================================
    // FARMING (farming_tool)
    // ==========================================
    "Bibit Padi -> Beras (T1)": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 1,
        growTimeHours: 1, // 1 hour
        materials: [
            { name: "Bibit Padi", quantity: 5 },
            { name: "Air Bersih", quantity: 2 }
        ],
        output: { name: "Beras Mentah", quantity: 10 }
    },
    "Kapas Mentah (T2)": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 2,
        growTimeHours: 6, // 6 hours
        materials: [
            { name: "Bibit Kapas", quantity: 2 },
            { name: "Air Bersih", quantity: 3 }
        ],
        output: { name: "Kapas", quantity: 5 }
    },
    "Padi Kualitas Tinggi (T3)": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 3,
        growTimeHours: 18, // 18 hours
        materials: [
            { name: "Bibit Padi Liar", quantity: 2 },
            { name: "Air Bersih", quantity: 4 }
        ],
        output: { name: "Padi Kualitas Tinggi", quantity: 3 }
    },
    "Bambu Spiritual (T4)": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 4,
        growTimeHours: 36, // 36 hours (1.5 days)
        materials: [
            { name: "Bibit Bambu Spiritual", quantity: 1 },
            { name: "Air Bersih", quantity: 5 }
        ],
        output: { name: "Kayu Spiritual", quantity: 2 }
    },
    "Ginseng Merah (T5)": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 5,
        growTimeHours: 60, // 60 hours (2.5 days)
        materials: [
            { name: "Bibit Ginseng Merah", quantity: 1 },
            { name: "Air Bersih", quantity: 10 }
        ],
        output: { name: "Akar Darah Naga", quantity: 1 }
    },
    "Teratai Sembilan Warna (T6)": {
        profession: "farming",
        toolType: "farming_tool",
        minToolTier: 6,
        growTimeHours: 96, // 96 hours (4 days)
        materials: [
            { name: "Bibit Teratai Surgawi", quantity: 1 },
            { name: "Air Mata Air Spiritual", quantity: 5 }
        ],
        output: { name: "Bunga Teratai Sembilan Warna", quantity: 1 }
    }
};

module.exports = RECIPES;
