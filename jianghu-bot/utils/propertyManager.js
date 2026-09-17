/**
 * propertyManager.js
 * Modul Manajemen Sub-Grid Interior 12x12 Properti & Kompresi RLE
 * Sesuai blueprint arsitektur sistem game online Jianghu
 */

const INTERIOR_TILES = {
    EMPTY_FLOOR: 0,
    WALL: 1,
    RECEPTION_TABLE: 2,
    CULTIVATION_MAT: 3,
    ALCHEMY_CRUCIBLE: 4,
    BLACKSMITH_ANVIL: 5,
    HERB_PLOT: 6,
    DOOR_EXIT: 7,
    FISH_POND: 8,
    KITCHEN_STOVE: 9
};

const TILE_METADATA = {
    [INTERIOR_TILES.EMPTY_FLOOR]: { name: 'Lantai Kayu Pernis', isSolid: false, interactable: false },
    [INTERIOR_TILES.WALL]: { name: 'Pilar Bambu & Dinding Kayu', isSolid: true, interactable: false },
    [INTERIOR_TILES.RECEPTION_TABLE]: { name: 'Meja Jamuan Teh Jianghu', isSolid: true, interactable: true, action: 'reception_chat' },
    [INTERIOR_TILES.CULTIVATION_MAT]: { name: 'Bantal Semadi Formasi Qi', isSolid: false, interactable: true, action: 'minigame_acupoint' },
    [INTERIOR_TILES.ALCHEMY_CRUCIBLE]: { name: 'Kuali Tembaga Kuno Alkimia', isSolid: true, interactable: true, action: 'minigame_crucible' },
    [INTERIOR_TILES.BLACKSMITH_ANVIL]: { name: 'Landasan Tempa Baja Meteor', isSolid: true, interactable: true, action: 'minigame_kata' },
    [INTERIOR_TILES.HERB_PLOT]: { name: 'Petak Herbal Rohani', isSolid: false, interactable: true, action: 'minigame_harvest' },
    [INTERIOR_TILES.DOOR_EXIT]: { name: 'Pintu Gerbang Keluar', isSolid: false, interactable: true, action: 'exit_property' },
    [INTERIOR_TILES.FISH_POND]: { name: 'Kolam Ikan Rohani', isSolid: true, interactable: true, action: 'minigame_fishing' },
    [INTERIOR_TILES.KITCHEN_STOVE]: { name: 'Tungku Dapur Jianghu', isSolid: true, interactable: true, action: 'minigame_cooking' }
};

/**
 * Mengompresi array matriks 1D integer menggunakan Run-Length Encoding (RLE)
 * Contoh: [1, 1, 1, 0, 0, 2] -> "1x3,0x2,2x1"
 */
function compressLayoutRLE(array1D) {
    if (!array1D || array1D.length === 0) return '';
    let result = [];
    let currentVal = array1D[0];
    let count = 1;

    for (let i = 1; i < array1D.length; i++) {
        if (array1D[i] === currentVal) {
            count++;
        } else {
            result.push(`${currentVal}x${count}`);
            currentVal = array1D[i];
            count = 1;
        }
    }
    result.push(`${currentVal}x${count}`);
    return result.join(',');
}

/**
 * Mendekompresi string RLE kembali menjadi Array integer 1D
 */
function decompressLayoutRLE(compressedStr) {
    if (!compressedStr) return [];
    const tokens = compressedStr.split(',');
    const output = [];
    for (const token of tokens) {
        if (!token) continue;
        const [valStr, countStr] = token.split('x');
        const val = parseInt(valStr, 10);
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
            output.push(val);
        }
    }
    return output;
}

/**
 * Menghasilkan denah standar Courtyard Estate 12x12
 * 12 baris x 12 kolom = 144 tile
 */
function generateDefaultEstateLayout(width = 12, height = 12) {
    const grid = new Array(width * height).fill(INTERIOR_TILES.EMPTY_FLOOR);

    // 1. Buat dinding pembatas terluar
    for (let x = 0; x < width; x++) {
        grid[0 * width + x] = INTERIOR_TILES.WALL; // Dinding Atas
        grid[(height - 1) * width + x] = INTERIOR_TILES.WALL; // Dinding Bawah
    }
    for (let y = 0; y < height; y++) {
        grid[y * width + 0] = INTERIOR_TILES.WALL; // Dinding Kiri
        grid[y * width + (width - 1)] = INTERIOR_TILES.WALL; // Dinding Kanan
    }

    // 2. Pintu keluar di bawah tengah (x=5, 6; y=11)
    grid[(height - 1) * width + 5] = INTERIOR_TILES.DOOR_EXIT;
    grid[(height - 1) * width + 6] = INTERIOR_TILES.DOOR_EXIT;

    // 3. Aula Utama di tengah (Meja Teh di x=5, y=5 dan x=6, y=5)
    grid[5 * width + 5] = INTERIOR_TILES.RECEPTION_TABLE;
    grid[5 * width + 6] = INTERIOR_TILES.RECEPTION_TABLE;

    // 4. Kamar Meditasi (Pojok Kiri Atas: x=2, y=2)
    grid[2 * width + 2] = INTERIOR_TILES.CULTIVATION_MAT;

    // 5. Paviliun Alkimia (Pojok Kanan Atas: x=9, y=2)
    grid[2 * width + 9] = INTERIOR_TILES.ALCHEMY_CRUCIBLE;

    // 6. Bengkel Tempa (Kiri Bawah: x=2, y=9)
    grid[9 * width + 2] = INTERIOR_TILES.BLACKSMITH_ANVIL;

    // 7. Kebun Tanaman Rohani (Kanan Bawah: x=8, y=9 dan x=9, y=9)
    grid[9 * width + 8] = INTERIOR_TILES.HERB_PLOT;
    grid[9 * width + 9] = INTERIOR_TILES.HERB_PLOT;

    // 8. Kolam Ikan Rohani (Kiri Tengah: x=2, y=5)
    grid[5 * width + 2] = INTERIOR_TILES.FISH_POND;

    // 9. Dapur Masak (Kanan Tengah: x=9, y=5)
    grid[5 * width + 9] = INTERIOR_TILES.KITCHEN_STOVE;

    return compressLayoutRLE(grid);
}

module.exports = {
    INTERIOR_TILES,
    TILE_METADATA,
    compressLayoutRLE,
    decompressLayoutRLE,
    generateDefaultEstateLayout
};
