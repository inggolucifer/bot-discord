/**
 * JIANGHU BOT & IMMORTAL-X — TRAVEL GRAPH CANONICAL CONFIG (config/travelDistances.js)
 * V23 G1: Rekonstruksi graf penjelajahan 52 simpul pemukiman kanonikal V20
 * - 52 Simpul = 52 Anchor kanonikal
 * - Graf terhubung penuh 1 komponen (Dijkstra 52x51 rute valid)
 * - Jarak dihitung via Euclidean riil skala 5 petak per Li
 */

module.exports = {
  LI_PER_HOUR: 100,
  AMBUSH_LOSS_PERCENT: 0.05,
  AMBUSH_LOSS_CAP_SILVER_EQ: 500,
  settlements: [
    {
        "regionSlug": "central_plains",
        "name": "Desa Xingcun",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "nine_springs_delta",
        "name": "Dusun Mata Air Jernih",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "border_march",
        "name": "Pos Perbatasan Qinghe",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "western_sacred_desert",
        "name": "Oase Shadi",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "eastern_sea",
        "name": "Dermaga Donghai",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "southern_demon_domain",
        "name": "Desa Heiyan",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "hermit_highlands",
        "name": "Kemah Dataran Tinggi Petapa",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "azure_mountain_range",
        "name": "Kaki Gunung Azure",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "central_plains",
        "name": "Tianjing",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "central_plains",
        "name": "XiTong City",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "central_plains",
        "name": "Kota Fengyang",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "central_plains",
        "name": "Kota Luoyang Kecil",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "central_plains",
        "name": "Desa Tiedao",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Pos Tundra Salju",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "floating_wind_isles",
        "name": "Pulau Penyu Raksasa",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "crimson_battlefield",
        "name": "Benteng Gerbang Iblis",
        "minRealmIndex": 3
    },
    {
        "regionSlug": "nine_springs_delta",
        "name": "Lembah Kabut Merah",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "azure_mountain_range",
        "name": "Sekte Awan Pedang",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "central_plains",
        "name": "Sekte Pedang Langit",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "hermit_highlands",
        "name": "Kuil Lonceng Emas",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "southern_demon_domain",
        "name": "Lembah Racun Bayangan",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "eastern_sea",
        "name": "Istana Giok Laut Timur",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Sekte Petir Ilahiah",
        "minRealmIndex": 3
    },
    {
        "regionSlug": "western_sacred_desert",
        "name": "Sekte Pasir Suci",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "northern_desolate",
        "name": "Istana Es Abadi",
        "minRealmIndex": 3
    },
    {
        "regionSlug": "central_plains",
        "name": "Gua Purba Bunga Aprikot",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "azure_mountain_range",
        "name": "Makam Kaisar Pedang Purba",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Reruntuhan Abadi Tianyuan",
        "minRealmIndex": 3
    },
    {
        "regionSlug": "ore_teeth_range",
        "name": "Sarang Naga Karang Timur",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "central_plains",
        "name": "Kota Jinling",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "nine_springs_delta",
        "name": "Kota Kecil Yunxi",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "western_sacred_desert",
        "name": "Kota Kecil Hanhai",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "northern_desolate",
        "name": "Kota Kecil Leiyin",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "ore_teeth_range",
        "name": "Kota Kecil Canghai",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Kota Kecil Binghu",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "southern_demon_domain",
        "name": "Kota Kecil Moyun",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "central_plains",
        "name": "Kota Kecil Shuijing",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "central_plains",
        "name": "Desa Rimbun Bambu",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "nine_springs_delta",
        "name": "Desa Lingquan",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "western_sacred_desert",
        "name": "Desa Shaquan",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Desa Tianhe",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Desa Xueshan",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "hermit_highlands",
        "name": "Desa Yougu",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "central_plains",
        "name": "Dusun Kebun Persik",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "nine_springs_delta",
        "name": "Dusun Padi Emas",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "western_sacred_desert",
        "name": "Dusun Oase Tersembunyi",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Dusun Gembala Petir",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "ore_teeth_range",
        "name": "Dusun Pondok Karang",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "thundersteppe",
        "name": "Dusun Pondok Es",
        "minRealmIndex": 2
    },
    {
        "regionSlug": "hermit_highlands",
        "name": "Dusun Pondok Teh Kuno",
        "minRealmIndex": 1
    },
    {
        "regionSlug": "sword_gorge",
        "name": "Pos Menara Pantau Danau",
        "minRealmIndex": 0
    },
    {
        "regionSlug": "nine_springs_delta",
        "name": "Dermaga Teluk Sembilan",
        "minRealmIndex": 0
    }
],
  distancesLi: {
    "Desa Xingcun": {
        "Gua Purba Bunga Aprikot": 14,
        "Dusun Kebun Persik": 22,
        "Sekte Pedang Langit": 36,
        "Desa Rimbun Bambu": 50
    },
    "Dusun Mata Air Jernih": {
        "Lembah Kabut Merah": 11,
        "Dusun Padi Emas": 28,
        "Desa Lingquan": 36,
        "Kota Luoyang Kecil": 64,
        "Dermaga Teluk Sembilan": 36
    },
    "Pos Perbatasan Qinghe": {
        "Kota Luoyang Kecil": 78,
        "Dusun Padi Emas": 80,
        "Dermaga Teluk Sembilan": 80,
        "Desa Heiyan": 136
    },
    "Oase Shadi": {
        "Dusun Oase Tersembunyi": 21,
        "Sekte Pasir Suci": 49,
        "Desa Shaquan": 50,
        "Kota Kecil Hanhai": 66
    },
    "Dermaga Donghai": {
        "Sarang Naga Karang Timur": 12,
        "Dusun Pondok Karang": 26,
        "Istana Giok Laut Timur": 30,
        "Pulau Penyu Raksasa": 86,
        "Kota Kecil Canghai": 53
    },
    "Desa Heiyan": {
        "Kota Kecil Moyun": 58,
        "Lembah Racun Bayangan": 63,
        "Pos Perbatasan Qinghe": 136,
        "Benteng Gerbang Iblis": 169
    },
    "Kemah Dataran Tinggi Petapa": {
        "Dusun Pondok Teh Kuno": 28,
        "Desa Yougu": 50,
        "Kuil Lonceng Emas": 56
    },
    "Kaki Gunung Azure": {
        "Sekte Awan Pedang": 10,
        "Makam Kaisar Pedang Purba": 10,
        "XiTong City": 92
    },
    "Tianjing": {
        "Desa Lingquan": 58,
        "Kota Fengyang": 64,
        "XiTong City": 72,
        "Kota Kecil Shuijing": 100
    },
    "XiTong City": {
        "Kaki Gunung Azure": 92,
        "Tianjing": 72,
        "Sekte Pedang Langit": 44,
        "Dusun Kebun Persik": 56,
        "Sekte Awan Pedang": 94,
        "Makam Kaisar Pedang Purba": 96
    },
    "Kota Fengyang": {
        "Tianjing": 64,
        "Desa Tiedao": 58,
        "Kota Jinling": 64,
        "Pos Menara Pantau Danau": 100
    },
    "Kota Luoyang Kecil": {
        "Pos Perbatasan Qinghe": 78,
        "Dermaga Teluk Sembilan": 28,
        "Kota Jinling": 42,
        "Dusun Mata Air Jernih": 64
    },
    "Desa Tiedao": {
        "Kota Fengyang": 58,
        "Pos Menara Pantau Danau": 42,
        "Kota Kecil Shuijing": 50
    },
    "Pos Tundra Salju": {
        "Dusun Pondok Es": 27,
        "Desa Tianhe": 48,
        "Desa Xueshan": 51,
        "Istana Es Abadi": 109,
        "Kota Kecil Binghu": 72
    },
    "Pulau Penyu Raksasa": {
        "Dermaga Donghai": 86,
        "Istana Giok Laut Timur": 92,
        "Sarang Naga Karang Timur": 94
    },
    "Benteng Gerbang Iblis": {
        "Kota Kecil Moyun": 114,
        "Lembah Racun Bayangan": 152,
        "Desa Heiyan": 169
    },
    "Lembah Kabut Merah": {
        "Dusun Mata Air Jernih": 11,
        "Dusun Padi Emas": 17,
        "Kota Kecil Yunxi": 34,
        "Desa Lingquan": 47,
        "Dermaga Teluk Sembilan": 38
    },
    "Sekte Awan Pedang": {
        "Kaki Gunung Azure": 10,
        "Makam Kaisar Pedang Purba": 10,
        "XiTong City": 94
    },
    "Sekte Pedang Langit": {
        "Desa Xingcun": 36,
        "XiTong City": 44,
        "Dusun Kebun Persik": 20,
        "Gua Purba Bunga Aprikot": 41,
        "Desa Rimbun Bambu": 60
    },
    "Kuil Lonceng Emas": {
        "Kemah Dataran Tinggi Petapa": 56,
        "Dusun Pondok Teh Kuno": 63,
        "Kota Kecil Binghu": 80,
        "Desa Yougu": 106
    },
    "Lembah Racun Bayangan": {
        "Desa Heiyan": 63,
        "Benteng Gerbang Iblis": 152,
        "Kota Kecil Moyun": 76
    },
    "Istana Giok Laut Timur": {
        "Dermaga Donghai": 30,
        "Pulau Penyu Raksasa": 92,
        "Sarang Naga Karang Timur": 20,
        "Dusun Pondok Karang": 44
    },
    "Sekte Petir Ilahiah": {
        "Reruntuhan Abadi Tianyuan": 20,
        "Dusun Gembala Petir": 28,
        "Desa Tianhe": 41,
        "Kota Kecil Leiyin": 56,
        "Desa Xueshan": 60
    },
    "Sekte Pasir Suci": {
        "Oase Shadi": 49,
        "Dusun Oase Tersembunyi": 28,
        "Desa Shaquan": 60,
        "Kota Kecil Hanhai": 90
    },
    "Istana Es Abadi": {
        "Kota Kecil Binghu": 76,
        "Dusun Pondok Es": 90,
        "Pos Tundra Salju": 109
    },
    "Gua Purba Bunga Aprikot": {
        "Desa Xingcun": 14,
        "Sekte Pedang Langit": 41,
        "Dusun Kebun Persik": 22,
        "Kota Kecil Yunxi": 28
    },
    "Makam Kaisar Pedang Purba": {
        "Kaki Gunung Azure": 10,
        "Sekte Awan Pedang": 10,
        "XiTong City": 96,
        "Desa Tianhe": 118
    },
    "Reruntuhan Abadi Tianyuan": {
        "Sekte Petir Ilahiah": 20,
        "Desa Xueshan": 41,
        "Dusun Gembala Petir": 44,
        "Kota Kecil Leiyin": 72,
        "Desa Tianhe": 50
    },
    "Sarang Naga Karang Timur": {
        "Dermaga Donghai": 12,
        "Pulau Penyu Raksasa": 94,
        "Istana Giok Laut Timur": 20,
        "Dusun Pondok Karang": 25,
        "Kota Kecil Canghai": 53
    },
    "Kota Jinling": {
        "Kota Fengyang": 64,
        "Kota Luoyang Kecil": 42,
        "Dermaga Teluk Sembilan": 50,
        "Desa Lingquan": 56
    },
    "Kota Kecil Yunxi": {
        "Lembah Kabut Merah": 34,
        "Gua Purba Bunga Aprikot": 28,
        "Dusun Padi Emas": 36
    },
    "Kota Kecil Hanhai": {
        "Oase Shadi": 66,
        "Dusun Oase Tersembunyi": 72,
        "Sekte Pasir Suci": 90,
        "Desa Rimbun Bambu": 170
    },
    "Kota Kecil Leiyin": {
        "Dusun Gembala Petir": 28,
        "Sekte Petir Ilahiah": 56,
        "Reruntuhan Abadi Tianyuan": 72
    },
    "Kota Kecil Canghai": {
        "Dusun Pondok Karang": 28,
        "Dermaga Donghai": 53,
        "Sarang Naga Karang Timur": 53,
        "Pos Menara Pantau Danau": 127
    },
    "Kota Kecil Binghu": {
        "Kuil Lonceng Emas": 80,
        "Istana Es Abadi": 76,
        "Dusun Pondok Es": 44,
        "Pos Tundra Salju": 72
    },
    "Kota Kecil Moyun": {
        "Desa Heiyan": 58,
        "Benteng Gerbang Iblis": 114,
        "Lembah Racun Bayangan": 76
    },
    "Kota Kecil Shuijing": {
        "Desa Tiedao": 50,
        "Pos Menara Pantau Danau": 36,
        "Tianjing": 100
    },
    "Desa Rimbun Bambu": {
        "Desa Xingcun": 50,
        "Sekte Pedang Langit": 60,
        "Dusun Kebun Persik": 63,
        "Kota Kecil Hanhai": 170
    },
    "Desa Lingquan": {
        "Dusun Mata Air Jernih": 36,
        "Tianjing": 58,
        "Kota Jinling": 56,
        "Lembah Kabut Merah": 47,
        "Dermaga Teluk Sembilan": 50
    },
    "Desa Shaquan": {
        "Oase Shadi": 50,
        "Sekte Pasir Suci": 60,
        "Dusun Oase Tersembunyi": 50
    },
    "Desa Tianhe": {
        "Pos Tundra Salju": 48,
        "Sekte Petir Ilahiah": 41,
        "Reruntuhan Abadi Tianyuan": 50,
        "Makam Kaisar Pedang Purba": 118
    },
    "Desa Xueshan": {
        "Pos Tundra Salju": 51,
        "Reruntuhan Abadi Tianyuan": 41,
        "Sekte Petir Ilahiah": 60,
        "Dusun Pondok Es": 70
    },
    "Desa Yougu": {
        "Kemah Dataran Tinggi Petapa": 50,
        "Dusun Pondok Teh Kuno": 53,
        "Kuil Lonceng Emas": 106
    },
    "Dusun Kebun Persik": {
        "Desa Xingcun": 22,
        "XiTong City": 56,
        "Sekte Pedang Langit": 20,
        "Gua Purba Bunga Aprikot": 22,
        "Desa Rimbun Bambu": 63
    },
    "Dusun Padi Emas": {
        "Dusun Mata Air Jernih": 28,
        "Pos Perbatasan Qinghe": 80,
        "Lembah Kabut Merah": 17,
        "Kota Kecil Yunxi": 36
    },
    "Dusun Oase Tersembunyi": {
        "Oase Shadi": 21,
        "Sekte Pasir Suci": 28,
        "Kota Kecil Hanhai": 72,
        "Desa Shaquan": 50
    },
    "Dusun Gembala Petir": {
        "Sekte Petir Ilahiah": 28,
        "Reruntuhan Abadi Tianyuan": 44,
        "Kota Kecil Leiyin": 28
    },
    "Dusun Pondok Karang": {
        "Dermaga Donghai": 26,
        "Istana Giok Laut Timur": 44,
        "Sarang Naga Karang Timur": 25,
        "Kota Kecil Canghai": 28
    },
    "Dusun Pondok Es": {
        "Pos Tundra Salju": 27,
        "Istana Es Abadi": 90,
        "Kota Kecil Binghu": 44,
        "Desa Xueshan": 70
    },
    "Dusun Pondok Teh Kuno": {
        "Kemah Dataran Tinggi Petapa": 28,
        "Kuil Lonceng Emas": 63,
        "Desa Yougu": 53
    },
    "Pos Menara Pantau Danau": {
        "Desa Tiedao": 42,
        "Kota Kecil Shuijing": 36,
        "Kota Fengyang": 100,
        "Kota Kecil Canghai": 127
    },
    "Dermaga Teluk Sembilan": {
        "Pos Perbatasan Qinghe": 80,
        "Kota Luoyang Kecil": 28,
        "Kota Jinling": 50,
        "Desa Lingquan": 50,
        "Dusun Mata Air Jernih": 36,
        "Lembah Kabut Merah": 38
    }
}
};
