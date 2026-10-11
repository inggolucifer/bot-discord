/**
 * generateManifest.js
 * Memproduksi jianghu_image_manifest.json (1.099 Objek Peta + 223 Ikon)
 * sesuai spesifikasi lengkap Style Bible Tale of Immortal & Plan Map V4.
 */

const fs = require('fs');
const path = require('path');

const STYLE_BASE = "Chinese ink-wash (shuimo xieyi) game asset in the style of Tale of Immortal painted map, soft brush strokes, muted jade green #5E8C7B, mist blue #7C97A6, stone grey #9A8F82, ink black #2E3A38, ocher #B9A27A, cinnabar #9B3A2E accent under 5%, subtle xuan paper grain, gentle watercolor bleed, light from upper left, slight 3/4 top-down view";
const NEGATIVE_BASE = "photorealistic, 3D render, glossy, neon, saturated colors, text, watermark, signature, frame, border, multiple objects, cropped, modern buildings, western fantasy, anime face";

// Data 29 Region khas
const REGION_DEFINITIONS = [
  {
    id: "central_plains",
    palette: "jade green plains, warm ocher paths, soft blue haze",
    mood: "drifting willow fluff, light drizzle",
    objects: [
      { name: "Willow Lone Tree", w: 1, h: 2, desc: "a single drooping weeping willow with long trailing branches over a mossy stone" },
      { name: "Wheat Field Patch", w: 2, h: 1, desc: "golden wheat swaying in ink-wash strokes with a small straw scarecrow" },
      { name: "Stone Milestone", w: 1, h: 1, desc: "moss-covered milestone pillar with faded carved characters beside a dirt road" },
      { name: "Wayside Pavilion", w: 2, h: 2, desc: "small open-air hexagonal rest pavilion with grey tile roof and red lacquer pillars" },
      { name: "Plum Blossom Tree", w: 1, h: 2, desc: "gnarled plum tree with pink-white blossoms, a few petals falling" },
      { name: "Old Stone Bridge", w: 3, h: 2, desc: "single-arch humpback stone bridge over a narrow stream with reeds" },
      { name: "Farmer Ox Cart", w: 2, h: 1, desc: "wooden ox cart loaded with hay bundles, parked, ox resting" },
      { name: "Roadside Tea Stall", w: 2, h: 1, desc: "thatched tea stall with a kettle on fire, two stools, a hanging cloth sign" },
      { name: "Ancestral Shrine Gate", w: 2, h: 2, desc: "small weathered paifang gate with tiled roof marking a village ancestor shrine" },
      { name: "Cypress Grove Cluster", w: 3, h: 3, desc: "tight cluster of tall dark cypress trees with misty bases" }
    ]
  },
  {
    id: "nine_springs_delta",
    palette: "teal water, soft green reeds, silver mist",
    mood: "mist over water, fireflies at dusk",
    objects: [
      { name: "Lotus Pond Cluster", w: 3, h: 2, desc: "wide pond covered in round lotus leaves and a few pink blooms" },
      { name: "Reed Bank", w: 2, h: 1, desc: "dense bank of tall reeds bending in wind, water edge" },
      { name: "Stilt Fisher House", w: 2, h: 2, desc: "small house on wooden stilts over shallow water with a drying net" },
      { name: "Sampan Boat", w: 2, h: 1, desc: "narrow wooden fishing boat with bamboo canopy moored to a post" },
      { name: "Spring Stone Basin", w: 1, h: 1, desc: "carved stone basin where clear spring water bubbles, mist rising" },
      { name: "Heron on Rock", w: 1, h: 1, desc: "white heron standing on a wet rock in shallow water" },
      { name: "Willow Island", w: 2, h: 2, desc: "tiny islet with a single willow and a flat stone" },
      { name: "Floating Plank Bridge", w: 3, h: 1, desc: "zig-zag wooden plank bridge across wetlands" },
      { name: "Water Wheel", w: 2, h: 2, desc: "large wooden water wheel turning beside a small mill" },
      { name: "Bamboo Fish Trap", w: 1, h: 1, desc: "woven bamboo fish trap partially submerged" }
    ]
  },
  {
    id: "azure_mountain_range",
    palette: "cold blue-grey rock, pine green, white cloud sea",
    mood: "low cloud sea, drifting snow flakes",
    objects: [
      { name: "Azure Peak Tall", w: 4, h: 5, desc: "tall jagged blue-grey mountain peak, cloud wrapping the middle, pine on lower slopes" },
      { name: "Cloud-Piercing Twin Peaks", w: 5, h: 5, desc: "two steep spires leaning together with a thin waterfall between" },
      { name: "Pine on Cliff", w: 1, h: 2, desc: "gnarled pine growing sideways out of a sheer cliff face" },
      { name: "Cliff Plank Road", w: 3, h: 1, desc: "narrow wooden plank path pinned onto a cliff wall" },
      { name: "Mountain Hermit Hut", w: 2, h: 2, desc: "tiny thatched hut with a wisp of smoke under a rock overhang" },
      { name: "Waterfall Ribbon", w: 2, h: 3, desc: "thin tall waterfall dropping from a ledge into a misty pool" },
      { name: "Rock Arch", w: 3, h: 3, desc: "natural stone arch with mist flowing through" },
      { name: "Snow Pine Cluster", w: 2, h: 2, desc: "pines with snow on branches in a tight group" },
      { name: "Stone Lantern Path", w: 1, h: 2, desc: "line of three moss stone lanterns marking a hidden trail" },
      { name: "Eagle Roost Crag", w: 1, h: 2, desc: "small crag with a large eagle perched" }
    ]
  },
  {
    id: "northern_desolate",
    palette: "bone white, ash grey, steel blue shadows",
    mood: "blowing snow, aurora faint",
    objects: [
      { name: "Frozen Dead Tree", w: 1, h: 2, desc: "bare black tree coated in frost standing in snow" },
      { name: "Ice Boulder", w: 2, h: 2, desc: "large rough ice-covered boulder with blue translucent edges" },
      { name: "Snow Drift Dune", w: 3, h: 1, desc: "smooth wind-sculpted snowdrift with ink-line ripples" },
      { name: "Frozen Banner Ruin", w: 1, h: 2, desc: "tattered ancient banner frozen on a broken pole" },
      { name: "Yak Skull Totem", w: 1, h: 2, desc: "stacked yak skulls on a wooden stake as a boundary mark" },
      { name: "Ice Crevasse", w: 3, h: 1, desc: "long dark crack in the ice field with blue glow" },
      { name: "Fur Tent Camp", w: 2, h: 2, desc: "small hide tent half buried in snow with dead fire" },
      { name: "Frost Wolf Den", w: 2, h: 2, desc: "rock cave mouth with frost and bones at entrance" },
      { name: "Ice Spire", w: 2, h: 4, desc: "tall thin spire of ice with refracted pale light" },
      { name: "Snow Cairn", w: 1, h: 1, desc: "pile of stones topped with a frozen cloth flag" }
    ]
  },
  {
    id: "thundersteppe",
    palette: "storm grey, wet green, electric violet accents",
    mood: "heavy rain, distant lightning",
    objects: [
      { name: "Lightning Struck Tree", w: 1, h: 2, desc: "split charred tree with violet crackle at the break" },
      { name: "Thunder Stone Pillar", w: 1, h: 3, desc: "standing stone with carved lightning patterns, faint violet arc" },
      { name: "Storm Grass Clump", w: 2, h: 1, desc: "wind-flattened tall grass with rain streaks" },
      { name: "Thunder Drum Altar", w: 2, h: 2, desc: "round stone altar with a giant war drum cracked by lightning" },
      { name: "Glass Fulgurite Spike", w: 1, h: 2, desc: "jagged glassy spikes in sand fused by lightning" },
      { name: "Nomad Yurt", w: 3, h: 3, desc: "felt yurt with storm-torn banner and tethered horse" },
      { name: "Rain Pool", w: 2, h: 1, desc: "wide shallow rain pool reflecting dark sky" },
      { name: "Bleached Horse Skeleton", w: 2, h: 1, desc: "ribcage of a large horse half sunk in mud" },
      { name: "Storm Watchtower", w: 2, h: 3, desc: "tall rough timber tower with a lantern, slanted by wind" },
      { name: "Cloud Rift Rock", w: 2, h: 1, desc: "flat rock slab with a thin crack glowing violet" }
    ]
  },
  {
    id: "godthunder_peaks",
    palette: "dark slate, gold lightning, purple clouds",
    mood: "constant thunder cloud, golden sparks",
    objects: [
      { name: "Thunder God Peak", w: 6, h: 7, desc: "colossal black peak crowned by roiling storm cloud with golden bolts" },
      { name: "Lightning Rod Spire", w: 2, h: 5, desc: "tall metal-veined rock needle drawing golden lightning" },
      { name: "Heaven Trial Stairs", w: 2, h: 4, desc: "long stone stairway climbing into storm cloud, broken in places" },
      { name: "Thunder Crater", w: 3, h: 3, desc: "scorched round crater with glowing gold cracks" },
      { name: "Storm Cloud Platform", w: 3, h: 2, desc: "flat rock plateau floating in churning cloud" },
      { name: "Charred Golden Pillar", w: 2, h: 1, desc: "fallen gold-veined pillar scorched black" },
      { name: "Judgement Altar", w: 3, h: 3, desc: "ancient round altar with eight lightning-scarred pillars" },
      { name: "Wind-Carved Cliff", w: 3, h: 4, desc: "jagged cliff face carved into spiky layers" },
      { name: "Static Orb Rock", w: 1, h: 1, desc: "smooth round boulder sparking with golden static" },
      { name: "Broken Heaven Gate", w: 3, h: 4, desc: "monumental broken gateway frame leaning against cliff" }
    ]
  },
  {
    id: "mirror_lake",
    palette: "silver-teal water, pale peach sky, white stone",
    mood: "calm mirror reflection, falling petals",
    objects: [
      { name: "Moon Reflection Pavilion", w: 3, h: 3, desc: "two-story octagonal lake pavilion over calm water reflecting the moon" },
      { name: "Zigzag Lake Bridge", w: 4, h: 1, desc: "white marble zigzag pedestrian bridge with stone railings" },
      { name: "Lotus Lantern Float", w: 1, h: 1, desc: "paper lotus lantern with warm flickering candle floating" },
      { name: "Lakeside Weeping Willow", w: 2, h: 2, desc: "graceful willow dipping branches into glass-smooth water" },
      { name: "Mirror Stone", w: 1, h: 2, desc: "tall flat polished black stone reflecting sky like a mirror" },
      { name: "Crane Pair", w: 1, h: 1, desc: "pair of white red-crowned cranes preening at lake edge" },
      { name: "Island Pagoda Small", w: 2, h: 4, desc: "slender five-story pagoda on a tiny rocky lake islet" },
      { name: "Reed Cove", w: 2, h: 2, desc: "sheltered water inlet fringed with pale golden reeds" },
      { name: "Stone Fisherman Statue", w: 1, h: 2, desc: "mossy statue of an ancient fisherman with bamboo rod" },
      { name: "Water Lily Field", w: 3, h: 2, desc: "dense cluster of white water lilies and round pads" }
    ]
  },
  {
    id: "beast_prairies",
    palette: "tawny gold grass, rust, deep sky blue",
    mood: "dust, wind-bent grass, circling birds",
    objects: [
      { name: "Tall Grass Sea", w: 3, h: 2, desc: "undulating waves of shoulder-high golden steppe grass" },
      { name: "Beast Bone Mound", w: 2, h: 2, desc: "tumbled pile of giant beast rib bones and horn" },
      { name: "Claw-Marked Boulder", w: 2, h: 2, desc: "granite boulder deeply gouged by giant predator claws" },
      { name: "Lone Acacia", w: 2, h: 3, desc: "flat-topped desert acacia tree standing alone against the wind" },
      { name: "Burrow Mound", w: 2, h: 1, desc: "fresh earthen mound with dark beast burrow entrance" },
      { name: "Trampled Trail", w: 3, h: 1, desc: "wide dirt path ground flat by migrating stampeding herds" },
      { name: "Beast Hunter Platform", w: 2, h: 3, desc: "wooden look-out platform lashed with leather cords" },
      { name: "Wild Horse Herd Static", w: 3, h: 2, desc: "cluster of three wild dun steppe ponies grazing" },
      { name: "Totem Skull Pole", w: 1, h: 3, desc: "tall carved cedar pole hung with feathers and buffalo skulls" },
      { name: "Dried Watering Hole", w: 3, h: 2, desc: "cracked dry mud basin with rings of white salt" }
    ]
  },
  {
    id: "western_sacred_desert",
    palette: "pale gold sand, saffron robe orange, deep indigo shadows",
    mood: "drifting sand, heat shimmer",
    objects: [
      { name: "Sand Dune Crest", w: 4, h: 2, desc: "sweeping razor-sharp crescent sand dune with wind ripples" },
      { name: "Buddha Stone Head", w: 3, h: 3, desc: "giant serene weathered sandstone Buddha head half-buried" },
      { name: "Stupa Small", w: 2, h: 3, desc: "white-washed bell stupa crowned with gilded spire" },
      { name: "Prayer Flag Line", w: 3, h: 1, desc: "row of colorful five-element flags fluttering in desert wind" },
      { name: "Dead Desert Tree", w: 1, h: 2, desc: "gnarled bleached wood trunk twisted by centuries of heat" },
      { name: "Oasis Pool", w: 3, h: 3, desc: "turquoise natural spring pool surrounded by date palms" },
      { name: "Sutra Pillar", w: 1, h: 3, desc: "octagonal stone pillar incised with ancient Sanskrit chants" },
      { name: "Cave Monastery Door", w: 3, h: 3, desc: "carved temple facade cut directly into sandstone cliff" },
      { name: "Caravan Camel Rest", w: 3, h: 2, desc: "resting double-humped camels lying near cargo packs" },
      { name: "Wind-Eroded Rock Mushroom", w: 2, h: 3, desc: "top-heavy balancing rock sculpted by desert dust storms" }
    ]
  },
  {
    id: "western_gorge_labyrinth",
    palette: "rust red, shadow violet, bone",
    mood: "echoing dust, cold wind",
    objects: [
      { name: "Gorge Wall Tall", w: 3, h: 6, desc: "vertical red sandstone canyon wall plunging into shadow" },
      { name: "Hanging Chain Bridge", w: 4, h: 1, desc: "swaying iron-link bridge with wooden slats over abyss" },
      { name: "Ghost Lantern Niche", w: 1, h: 1, desc: "carved cliff niche housing an eerie pale blue lamp" },
      { name: "Fallen Boulder Maze", w: 4, h: 3, desc: "tumbled colossal boulders blocking narrow canyon canyon bed" },
      { name: "Stalagmite Cluster", w: 2, h: 2, desc: "sharp mineral spikes rising from canyon floor" },
      { name: "Soul Pit", w: 2, h: 2, desc: "dark circular fissure emitting faint wisps of violet smoke" },
      { name: "Skeleton Sentinel Statue", w: 1, h: 2, desc: "crude stone warrior with spear keeping eternal watch" },
      { name: "Rope Ladder Cliff", w: 1, h: 3, desc: "hemp rope ladder trailing down sheer rocky canyon face" },
      { name: "Echo Shrine", w: 2, h: 2, desc: "weathered stone altar where whispers reverberate" },
      { name: "Bone Arch", w: 3, h: 3, desc: "natural archway lined with fossilized prehistoric bones" }
    ]
  },
  {
    id: "hermit_highlands",
    palette: "soft green-blue, mist white, muted ocher",
    mood: "thin mist, light rain",
    objects: [
      { name: "Hermit Cottage Mist", w: 2, h: 2, desc: "thatched mountain retreat with wooden porch and lantern" },
      { name: "Crooked Pine Pair", w: 2, h: 3, desc: "twin gnarled pines entwined like dragons above mist" },
      { name: "Tea Terrace", w: 3, h: 2, desc: "curving green tea bushes planted in stepped stone terraces" },
      { name: "Stone Table Chess", w: 1, h: 1, desc: "flat round stone table with weiqi board and two stools" },
      { name: "Hanging Gourd Frame", w: 1, h: 2, desc: "bamboo trellis supporting heavy green cultivation gourds" },
      { name: "Mountain Spring Bamboo Pipe", w: 1, h: 1, desc: "split bamboo spout trickling pure spring into basin" },
      { name: "Cloud Sea Ledge", w: 2, h: 1, desc: "overhanging flat rock where cultivators sit above clouds" },
      { name: "Moss Boulder Garden", w: 3, h: 2, desc: "harmonious grouping of three dark boulders covered in velvet moss" },
      { name: "Stone Step Trail", w: 2, h: 3, desc: "mossy irregular stone staircase ascending misty hillside" },
      { name: "Orchid Rock Crevice", w: 1, h: 1, desc: "wild purple orchids blooming out of a narrow stone crack" }
    ]
  },
  {
    id: "border_march",
    palette: "dust brown, muted red, iron grey",
    mood: "dust, banner flutter",
    objects: [
      { name: "Frontier Watchtower", w: 2, h: 4, desc: "sturdy multi-tiered timber guard tower with archer slits" },
      { name: "Palisade Wall Segment", w: 4, h: 2, desc: "sharpened log defensive wall with spiked wooden walkway" },
      { name: "Soldier Tent Rows", w: 3, h: 2, desc: "neat regiment of imperial military canvas bivouac tents" },
      { name: "War Banner Pole", w: 1, h: 3, desc: "tall ironbound pole flying crimson army standard" },
      { name: "Supply Cart", w: 2, h: 1, desc: "iron-wheeled military provisions wagon piled with grain crates" },
      { name: "Beacon Tower Ruin", w: 2, h: 3, desc: "square brick beacon tower with smoke brazier on top" },
      { name: "Spike Barricade", w: 2, h: 1, desc: "crossed wooden stakes barbed against charging cavalry" },
      { name: "Weapon Rack", w: 1, h: 1, desc: "timber rack displaying spears, halberds, and iron shields" },
      { name: "Horse Hitching Line", w: 2, h: 1, desc: "wooden rail with tied war horses resting in dirt" },
      { name: "Border Stele", w: 1, h: 2, desc: "heavy stone tablet engraved with Imperial territorial border seal" }
    ]
  },
  {
    id: "lava_spine",
    palette: "black basalt, molten orange, ember red",
    mood: "rising embers, heat shimmer, ash",
    objects: [
      { name: "Lava Vent Spire", w: 2, h: 4, desc: "hollow volcanic spire puffing black sulfurous smoke and ash" },
      { name: "Magma River Segment", w: 4, h: 2, desc: "crusted trench of glowing molten rock with orange ripples" },
      { name: "Obsidian Shard Cluster", w: 2, h: 2, desc: "mirror-sharp black volcanic glass crystals jutting upwards" },
      { name: "Ash Dead Tree", w: 1, h: 2, desc: "charred petrified tree trunk glowing with internal ember fire" },
      { name: "Fire Lotus Pool", w: 2, h: 2, desc: "boiling magma spring where glowing ruby lotuses bloom" },
      { name: "Cooled Lava Bridge", w: 3, h: 1, desc: "rough dark crust arching over bubbling molten ravine" },
      { name: "Flame Spirit Altar", w: 2, h: 2, desc: "basalt altar topped with dancing eternal crimson fire elemental" },
      { name: "Basalt Column Group", w: 3, h: 3, desc: "geometric hexagonal basalt pillars clustered together" },
      { name: "Smoke Fissure", w: 3, h: 1, desc: "deep ground crack spitting flame sparks and sulfur vapor" },
      { name: "Bone Pyre", w: 2, h: 1, desc: "calcined beast skeleton dissolving into burning ash" }
    ]
  },
  {
    id: "venom_mire",
    palette: "sickly green, bruise purple, muddy brown",
    mood: "toxic fog bubbles, drifting spores",
    objects: [
      { name: "Poison Bog Pool", w: 3, h: 2, desc: "stagnant marsh water bubbling with toxic chartreuse slime" },
      { name: "Rotten Mangrove", w: 3, h: 3, desc: "twisted weeping tree with moss dripping into black mire" },
      { name: "Giant Toadstool Cluster", w: 2, h: 3, desc: "spotted purple and yellow fungal caps releasing spore puffs" },
      { name: "Venom Vine Thicket", w: 2, h: 2, desc: "tangle of thorny vines weeping milky caustic sap" },
      { name: "Sunken Skeleton", w: 2, h: 1, desc: "half-dissolved ribcage of marsh behemoth trapped in peat" },
      { name: "Stilt Ruin Hut", w: 2, h: 2, desc: "decaying wooden hut listing into mire with rot holes" },
      { name: "Spore Cloud Patch", w: 3, h: 2, desc: "glowing green cloud of airborne toxic spores hanging low" },
      { name: "Snake Nest Mound", w: 2, h: 1, desc: "mud hillock teeming with writhing swamp vipers" },
      { name: "Dead Fish Raft", w: 2, h: 1, desc: "floating mass of belly-up scaled marsh fish" },
      { name: "Bubbling Mud Vent", w: 2, h: 2, desc: "thick black mud volcano bursting with gassy bubbles" }
    ]
  },
  {
    id: "southern_demon_domain",
    palette: "blood red, black, bruise purple",
    mood: "blood-red fog, floating ash",
    objects: [
      { name: "Demon Cave Maw", w: 4, h: 3, desc: "gaping jagged cavern entrance resembling fanged demon jaws" },
      { name: "Blood Pool", w: 3, h: 2, desc: "deep basin of viscous crimson liquid with bone residue" },
      { name: "Bone Throne", w: 2, h: 3, desc: "menacing throne constructed from interlocking horned skulls" },
      { name: "Demon Stele", w: 1, h: 3, desc: "tall black obelisk inscribed with dripping demonic curses" },
      { name: "Crimson Banner Forest", w: 3, h: 3, desc: "cluster of ragged tattered demonic battle standards" },
      { name: "Chained Altar", w: 2, h: 2, desc: "obsidian sacrificial slab bound by heavy iron spiked chains" },
      { name: "Black Thorn Tree", w: 2, h: 3, desc: "leafless black tree covered in wicked foot-long steel-hard thorns" },
      { name: "Skull Wall", w: 3, h: 2, desc: "stacked rampart composed entirely of horned demon skulls" },
      { name: "Ritual Circle", w: 3, h: 3, desc: "glowing demonic pentagram carved into obsidian floor" },
      { name: "Demon Brazier", w: 1, h: 2, desc: "cast-iron cauldron burning cold purple ghostly flame" }
    ]
  },
  {
    id: "crimson_battlefield",
    palette: "rust red, ash grey, bone",
    mood: "red mist, crows, drifting ash",
    objects: [
      { name: "Broken Sword Field", w: 3, h: 2, desc: "scores of shattered ancient blades thrust into blood-soaked soil" },
      { name: "Rotted War Banner", w: 1, h: 3, desc: "tattered heraldry fluttering weakly on broken iron lance" },
      { name: "Chariot Wreck", w: 2, h: 2, desc: "overturned bronze war chariot with snapped axle and spikes" },
      { name: "Skeleton Soldier Heap", w: 2, h: 1, desc: "interlocked armor plates and bones of fallen legionnaires" },
      { name: "Blood Rust Cauldron", w: 2, h: 2, desc: "abandoned iron siege cauldron oxidized to dark rust" },
      { name: "Ghost Fire Torch", w: 1, h: 2, desc: "lone torch stake burning with pale green spectral flame" },
      { name: "Crater Trench", w: 4, h: 2, desc: "deep earth furrow gouged by celestial sword strike" },
      { name: "Armor Mound", w: 2, h: 2, desc: "piled cuirasses and helmets dented by cultivation techniques" },
      { name: "Crow Dead Tree", w: 2, h: 3, desc: "blasted tree branch laden with silent watching black crows" },
      { name: "War Drum Broken", w: 2, h: 2, desc: "giant thunder drum with leather split across the center" }
    ]
  },
  {
    id: "abyssal_scar",
    palette: "void black, deep violet, cold cyan cracks",
    mood: "drifting dark motes, low rumble",
    objects: [
      { name: "Abyss Fissure", w: 5, h: 2, desc: "bottomless fracture in continent revealing swirling cosmic dark" },
      { name: "Floating Rock Shards", w: 3, h: 3, desc: "antigravity boulders hovering silently over edge" },
      { name: "Shadow Tendril Growth", w: 2, h: 3, desc: "plant-like vines of solid darkness creeping over stone" },
      { name: "Void Altar Ruin", w: 2, h: 2, desc: "ancient cracked dais pulsating with violet space distortion" },
      { name: "Chained Pillar", w: 1, h: 4, desc: "floating runic pillar held down by massive cosmic chains" },
      { name: "Eye Stone", w: 1, h: 2, desc: "rock with single glowing lidless pupil watching travellers" },
      { name: "Black Obelisk", w: 1, h: 4, desc: "featureless light-absorbing monument of void matter" },
      { name: "Sinking Ground Pit", w: 3, h: 3, desc: "funnel of crumbling soil slowly sliding into oblivion" },
      { name: "Dim Soul Lantern", w: 1, h: 1, desc: "floating glass sphere containing trapped starlight" },
      { name: "Bridge to Nowhere", w: 3, h: 1, desc: "stone bridge arch snapping off abruptly into pure void" }
    ]
  },
  {
    id: "southern_plague_woods",
    palette: "rot green, grey-brown, sickly yellow",
    mood: "falling spores, flies",
    objects: [
      { name: "Rot Tree Hollow", w: 3, h: 4, desc: "enormous hollow rotten trunk with parasitic yellow lichen" },
      { name: "Fungus Shelf Trunk", w: 2, h: 3, desc: "dead pine stacked with tiers of poisonous shelf fungus" },
      { name: "Plague Corpse Cart", w: 2, h: 1, desc: "decaying wooden handcart loaded with shrouded bundles" },
      { name: "Spore Pod Bulbs", w: 1, h: 2, desc: "fleshy ground nodules trembling with internal yellow pus" },
      { name: "Withered Bamboo Stand", w: 3, h: 3, desc: "drooping black bamboo canes dry as bone and rattling" },
      { name: "Cursed Well", w: 1, h: 1, desc: "stone wellhead overgrown with weeds, water green and foul" },
      { name: "Maggot Mound", w: 2, h: 1, desc: "rotting compost heap writhing with pale fat grubs" },
      { name: "Torn Warding Talismans", w: 2, h: 2, desc: "shredded paper protective spells dangling from rope line" },
      { name: "Sickly Pond", w: 3, h: 2, desc: "film-covered swamp pool surrounded by yellow withered reeds" },
      { name: "Quarantine Fence", w: 3, h: 1, desc: "crude barrier of pointed stakes marked with red warding paint" }
    ]
  },
  {
    id: "bone_sea_coast",
    palette: "bone white, sea grey-teal, dull sand",
    mood: "sea spray, gulls, drifting fog",
    objects: [
      { name: "Whale Rib Arch", w: 4, h: 3, desc: "colossal fossilized leviathan ribs curving over sand" },
      { name: "Shipwreck Hull", w: 4, h: 3, desc: "rotted wooden junk ribs half-buried in grey tide sand" },
      { name: "Bone Dune", w: 3, h: 2, desc: "ridge of crushed white seashells and marine animal vertebrae" },
      { name: "Sea Stack Rock", w: 2, h: 4, desc: "solitary pillar of wave-sculpted granite in pounding surf" },
      { name: "Tide Pool", w: 2, h: 1, desc: "clear saltwater rock depression filled with kelp and crabs" },
      { name: "Driftwood Pile", w: 2, h: 1, desc: "smooth bleached tree trunks stranded above high tide line" },
      { name: "Skull Lighthouse", w: 2, h: 5, desc: "weathered beacon tower constructed from whale skull bones" },
      { name: "Net Rack Ruin", w: 2, h: 1, desc: "broken timber frame hung with shredded salty hemp ropes" },
      { name: "Kelp Mound", w: 2, h: 1, desc: "black rubbery mass of seaweed drying in sea air" },
      { name: "Anchor Monument", w: 1, h: 2, desc: "giant rusted iron anchor standing upright in coastal rock" }
    ]
  },
  {
    id: "spirit_wood_sea",
    palette: "emerald, jade, bright gold light shafts",
    mood: "falling leaves, light motes, glowing pollen",
    objects: [
      { name: "Spirit Tree Giant", w: 5, h: 6, desc: "ancient primordial tree with luminous green canopy and glowing veins" },
      { name: "Root Arch", w: 3, h: 3, desc: "natural archway formed by giant moss-covered above-ground roots" },
      { name: "Glow Mushroom Ring", w: 2, h: 2, desc: "fairy ring of emerald-glowing toadstools in damp shadow" },
      { name: "Vine Bridge", w: 4, h: 1, desc: "living suspension bridge woven from thick blooming lianas" },
      { name: "Moss Stone Idol", w: 1, h: 2, desc: "weathered ancient forest guardian face carved into boulder" },
      { name: "Leaf Canopy Cluster", w: 3, h: 3, desc: "dense umbrella of broad jade leaves filtering sunlight" },
      { name: "Fairy Pond", w: 2, h: 2, desc: "glowing turquoise forest spring surrounded by orchids" },
      { name: "Hollow Log House", w: 2, h: 1, desc: "fallen cedar trunk converted into cosy wooden refuge" },
      { name: "Firefly Bush", w: 1, h: 1, desc: "shrub alive with swarm of emerald blinking spiritual fireflies" },
      { name: "Sap Crystal Stump", w: 1, h: 1, desc: "tree stump pooled with hardened golden amber crystal" }
    ]
  },
  {
    id: "mist_insect_valley",
    palette: "murky teal, amber, purple spores",
    mood: "thick fog, glowing insects",
    objects: [
      { name: "Giant Cocoon Tree", w: 2, h: 4, desc: "silvery silk-wrapped tree trunk hung with giant pupae" },
      { name: "Web Strand Net", w: 3, h: 3, desc: "gossamer web spun across forest canopy dewed with mist" },
      { name: "Beetle Shell Hut", w: 2, h: 2, desc: "shelter fabricated from iridescent green giant beetle elytra" },
      { name: "Glow Moth Bush", w: 1, h: 1, desc: "cluster of pale moths resting on night-blooming flowers" },
      { name: "Honey Comb Rock", w: 2, h: 2, desc: "natural sandstone eroded into hundreds of bee-cell chambers" },
      { name: "Insect Mound", w: 3, h: 3, desc: "tall clay chimney constructed by spiritual wood termites" },
      { name: "Fog Fern Cluster", w: 2, h: 2, desc: "curling prehistoric ferns dripping with condensed mist" },
      { name: "Wing Chitin Pile", w: 2, h: 1, desc: "discarded molted exoskeleton plates of giant cicadas" },
      { name: "Venom Flower", w: 1, h: 2, desc: "carnivorous pitcher plant with purple trap leaf" },
      { name: "Silk Bridge", w: 4, h: 1, desc: "springy tightrope bridge woven from resilient spiritual spider silk" }
    ]
  },
  {
    id: "formation_barrens",
    palette: "ash grey, pale gold lines, mute violet",
    mood: "slowly rotating light motes, soft hum",
    objects: [
      { name: "Bagua Floor Disc", w: 4, h: 4, desc: "carved circular stone ground diagram with eight trigrams" },
      { name: "Formation Stone Pillar", w: 1, h: 3, desc: "slender granite spire engraved with pulsing golden talismans" },
      { name: "Broken Array Flag", w: 1, h: 2, desc: "silk banner marked with Yin-Yang faded by centuries of desert wind" },
      { name: "Trigram Gate", w: 3, h: 3, desc: "twin stone pylons projecting shimmering energy barrier" },
      { name: "Jade Array Eye", w: 1, h: 2, desc: "floating carved jade orb channeling spiritual ley-lines" },
      { name: "Sand Circle Pattern", w: 4, h: 4, desc: "sacred geometric spiral traced into desert sand" },
      { name: "Talisman Ring Stones", w: 3, h: 3, desc: "ring of standing monoliths connected by golden Qi threads" },
      { name: "Star Chart Slab", w: 2, h: 2, desc: "flat polished stone etched with constellation pinpoints" },
      { name: "Ancient Compass Dial", w: 2, h: 2, desc: "bronze luopan plate half-buried in grey soil" },
      { name: "Illusion Rock", w: 2, h: 2, desc: "semi-transparent boulder shifting between stone and void" }
    ]
  },
  {
    id: "sword_gorge",
    palette: "steel blue, silver, dark slate",
    mood: "metallic wind glints, falling feathers",
    objects: [
      { name: "Sword Embedded Cliff", w: 4, h: 5, desc: "sheer canyon cliff face punctured by dozens of ancient flying swords" },
      { name: "Giant Sword Monument", w: 2, h: 6, desc: "hundred-foot iron greatsword planted tip-down as mountain marker" },
      { name: "Sword Rain Cluster", w: 3, h: 2, desc: "ground scarred by hundreds of miniature Qi blades pinned in rock" },
      { name: "Sword Qi Mark Rock", w: 2, h: 2, desc: "split granite boulder cleaving cleanly from single sword intent strike" },
      { name: "Sword Tomb Door", w: 2, h: 3, desc: "bronze vault entrance sealed behind crossed broadswords" },
      { name: "Wind Chime Blades", w: 1, h: 2, desc: "slender blade fragments hung from gnarled pine clinking in wind" },
      { name: "Sword Cultivator Statue", w: 1, h: 3, desc: "stone effigy of immortal pointing finger sword toward heaven" },
      { name: "Rust Blade Pile", w: 2, h: 1, desc: "scrap heap of broken hilts, pommels, and chipped edges" },
      { name: "Bridge of Blades", w: 4, h: 1, desc: "narrow walkway formed from overlapping massive steel blades" },
      { name: "Silver Waterfall", w: 2, h: 4, desc: "cascade of sharp cold mountain water slicing like sword edge" }
    ]
  },
  {
    id: "ore_teeth_range",
    palette: "iron grey, copper brown, dull blue",
    mood: "dust, hammer sparks",
    objects: [
      { name: "Iron Tooth Peak", w: 3, h: 5, desc: "sawtooth crag veined with dark metallic magnetite" },
      { name: "Mine Entrance Timber", w: 3, h: 2, desc: "braced wooden portal tunnel entering mineral hillside" },
      { name: "Ore Cart on Rails", w: 2, h: 1, desc: "heavy iron mining cart filled with raw glittering ore" },
      { name: "Smelter Furnace", w: 3, h: 3, desc: "stone brick blast furnace radiating heat with soot chimney" },
      { name: "Copper Vein Rock", w: 2, h: 2, desc: "exposed boulder with bright green and orange malachite streaks" },
      { name: "Slag Heap", w: 2, h: 2, desc: "mound of glassy porous black furnace refuse" },
      { name: "Pickaxe Rack", w: 1, h: 1, desc: "wooden frame holding forged iron miner picks and hammers" },
      { name: "Ore Crane", w: 2, h: 3, desc: "timber pulley derrick lifting heavy stone bucket from pit" },
      { name: "Crystal Seam", w: 2, h: 2, desc: "glittering cluster of blue quartz crystals bursting from seam" },
      { name: "Miner Barrack", w: 3, h: 2, desc: "rugged log bunkhouse with stone chimney and timber roof" }
    ]
  },
  {
    id: "eastern_sea",
    palette: "deep teal, foam white, pale gold sunrise",
    mood: "spray, gulls, low swell",
    objects: [
      { name: "Island Pine Rock", w: 2, h: 3, desc: "miniature offshore granite islet crowned by single windswept pine" },
      { name: "Fishing Junk Sailing", w: 3, h: 3, desc: "traditional wooden boat with ribbed batten sails slicing swell" },
      { name: "Reef Ripple Patch", w: 3, h: 2, desc: "shallow submerged coral head breaking ocean waves into white foam" },
      { name: "Harbor Pier", w: 4, h: 2, desc: "weathered stone and timber jetty with mooring bollards" },
      { name: "Sea Gate Torii", w: 3, h: 3, desc: "vermilion paifang gate standing submerged in coastal surf" },
      { name: "Whale Back", w: 3, h: 2, desc: "smooth dark leviathan back breaking ocean surface with blowhole mist" },
      { name: "Floating Buoy Lamp", w: 1, h: 1, desc: "bobbing wooden beacon sphere with glass lantern" },
      { name: "Sea Serpent Coil", w: 3, h: 2, desc: "glimpse of iridescent scaled sea beast serpent coiling in wave" },
      { name: "Wave Crest", w: 3, h: 2, desc: "dramatic curling sea wave painted in dynamic brushstroke" },
      { name: "Sandbar Spit", w: 3, h: 1, desc: "narrow curving white sandy point extending into azure sea" }
    ]
  },
  {
    id: "frostmoon_sea",
    palette: "ice blue, midnight navy, moon silver",
    mood: "drifting ice mist, moon glow",
    objects: [
      { name: "Floating Ice Floe", w: 4, h: 3, desc: "flat sheet of arctic drift ice with turquoise underwater shelf" },
      { name: "Moon Pillar Iceberg", w: 3, h: 5, desc: "cathedral-tall pinnacle of blue glacier ice glowing in moonlight" },
      { name: "Frozen Shipwreck", w: 4, h: 3, desc: "ancient wooden merchant galley locked fast in sea ice pack" },
      { name: "Aurora Ice Arch", w: 3, h: 3, desc: "natural ice bridge arching over dark tidal channel" },
      { name: "Ice Fishing Hole", w: 1, h: 1, desc: "circular hole chopped in thick ice with wooden pole and stool" },
      { name: "Seal Rock", w: 2, h: 1, desc: "smooth frost boulder where plump spotted seals bask" },
      { name: "Frost Coral", w: 2, h: 2, desc: "delicate branching spires of underwater frozen mineral growth" },
      { name: "Moon Mirror Ice", w: 3, h: 2, desc: "sheet of flawless black sea ice reflecting twin moons" },
      { name: "Snowy Islet Pine", w: 3, h: 3, desc: "rocky island blanketed in snow with ancient stunted pines" },
      { name: "Ice Whale Skeleton", w: 4, h: 2, desc: "frozen ribcage of ancient sea titan preserved in iceberg" }
    ]
  },
  {
    id: "floating_wind_isles",
    palette: "pale blue sky, white cloud, jade green",
    mood: "clouds streaming, wind petals, light beams",
    objects: [
      { name: "Floating Isle Large", w: 6, h: 6, desc: "majestic flying landmass adrift in sky with waterfall falling into void" },
      { name: "Floating Isle Small", w: 3, h: 3, desc: "compact floating rock fragment with single pine and stone lantern" },
      { name: "Wind Chime Tower", w: 2, h: 5, desc: "slender timber pagoda hung with hundreds of singing bronze bells" },
      { name: "Cloud Stepping Stone", w: 1, h: 1, desc: "condensed semi-solid cloud pad hovering in sky walkway" },
      { name: "Sky Bridge Rope", w: 5, h: 1, desc: "suspension footbridge spanning abyss between two flying islands" },
      { name: "Crane Rider Pad", w: 2, h: 2, desc: "circular jade launch dais for celestial flying cranes" },
      { name: "Wind Vane Pagoda", w: 2, h: 4, desc: "golden pavilion topped with giant rotating dragon weathercock" },
      { name: "Cloud Waterfall", w: 2, h: 4, desc: "stream of pure mist plunging downwards like water into sky" },
      { name: "Hanging Garden", w: 3, h: 3, desc: "terrace of trailing celestial vines and glowing sky orchids" },
      { name: "Sky Lantern Cluster", w: 2, h: 3, desc: "swarm of paper hot air lanterns drifting gently upwards" }
    ]
  },
  {
    id: "immortal_ruins_valley",
    palette: "faded gold, jade, ash white",
    mood: "golden dust, slow floating light",
    objects: [
      { name: "Fallen Immortal Palace", w: 6, h: 5, desc: "shattered grand palace pavilion with tilted gilded eaves and cracked jade floor" },
      { name: "Broken Jade Pillar", w: 1, h: 4, desc: "colossal fluted white jade pillar snapped off halfway" },
      { name: "Dragon Statue Ruin", w: 3, h: 3, desc: "weathered stone statue of imperial coiled dragon half collapsed" },
      { name: "Immortal Stair Broken", w: 3, h: 4, desc: "grand marble staircase climbing towards empty sky" },
      { name: "Sealed Gold Gate", w: 3, h: 4, desc: "massive gilded temple portal bound in glowing array talismans" },
      { name: "Withered Peach Tree", w: 2, h: 3, desc: "ancient celestial peach tree bearing single golden immortal fruit" },
      { name: "Cracked Alchemy Cauldron", w: 2, h: 2, desc: "giant three-legged bronze cauldron overflowing with jade crystal slag" },
      { name: "Spirit Lamp Row", w: 3, h: 1, desc: "line of seven stone lotus lamps still burning after millennia" },
      { name: "Stele of Names", w: 2, h: 2, desc: "towering memorial tablet listing names of ascended immortals" },
      { name: "Cloud Mirror Pond", w: 2, h: 2, desc: "square stone pool containing liquid Qi glowing with soft gold light" }
    ]
  },
  {
    id: "void_rift",
    palette: "pure black, white fracture lines, faint violet",
    mood: "reality glitching, drifting dark",
    objects: [
      { name: "Rift Wound", w: 3, h: 6, desc: "vertical scar of shattered reality leaking raw void energy" },
      { name: "Floating Debris", w: 3, h: 3, desc: "broken fragments of buildings and trees tumbling in zero gravity" },
      { name: "Inverted Tree", w: 2, h: 3, desc: "pine tree growing upside down into the sky from invisible ground" },
      { name: "Space Shard", w: 2, h: 3, desc: "mirror-like shard of sky reflecting a different world" },
      { name: "Gravity Well Ring", w: 4, h: 4, desc: "swirling accretion ring pulling dust into a singularity" },
      { name: "Hollow Stone", w: 2, h: 2, desc: "rock with a window into star-filled empty cosmic space" },
      { name: "Unreal Staircase", w: 2, h: 4, desc: "impossible Escher-like stone steps looping into themselves" },
      { name: "Silent Bell", w: 1, h: 2, desc: "ancient cracked bronze bell floating motionless without a sound" },
      { name: "Fractured Ground Plates", w: 4, h: 3, desc: "puzzle-like continental plates drifting apart with void between" },
      { name: "Star Seed Orb", w: 1, h: 1, desc: "tiny pulsing orb of infant cosmic matter hovering above ground" }
    ]
  }
];

// 12 Kategori Ikon UI (Total 223 Ikon)
const ICON_CATEGORIES = [
  { group: "map_controls", count: 20, prefix: "ctrl", items: [
    "compass", "zoom_in", "zoom_out", "center_player", "layer_toggle", "build_mode", "legend", "search", 
    "weather_rain", "weather_snow", "weather_miasma", "fog_unexplored", "fog_revealed", "waypoint_pin", 
    "ruler_tool", "screenshot_mode", "fullscreen_toggle", "auto_path", "fast_travel", "sound_toggle"
  ]},
  { group: "zone_markers", count: 14, prefix: "zone", items: [
    "safe_haven", "frontier_outskirts", "danger_wilds", "death_abyss", "build_allowed", "build_buffer", 
    "build_forbidden", "sect_domain", "boss_lair", "impassable_peak", "river_crossing", "hidden_pass", 
    "celestial_ruin", "secret_realm_portal"
  ]},
  { group: "settlement_badges", count: 14, prefix: "settlement", items: [
    "badge_capital", "badge_city", "badge_town", "badge_village", "badge_hamlet", "badge_sect_orthodox", 
    "badge_sect_demonic", "badge_outpost", "badge_harbor", "badge_island", "badge_ruin", "badge_npc_count", 
    "flag_plot_owned", "flag_plot_for_sale"
  ]},
  { group: "resource_nodes", count: 15, prefix: "res", items: [
    "herb_common", "herb_rare", "herb_epic", "wood_bamboo", "wood_spirit", "ore_iron", "ore_copper", 
    "ore_spirit_jade", "ore_lightning_crystal", "fish_river", "fish_golden_carp", "fish_pearl", "salt_flat", 
    "node_dormant", "progress_ring"
  ]},
  { group: "currencies", count: 6, prefix: "curr", items: [
    "gold_tael", "silver_tael", "copper_coin", "spirit_jade", "contribution_points", "spirit_stones"
  ]},
  { group: "herbs", count: 20, prefix: "herb", items: [
    "ginseng_thousand_year", "lingzhi_purple", "snow_lotus", "fire_ginger", "moon_orchid", "dragon_blood_grass", 
    "phoenix_feather_leaf", "nine_leaf_clover", "azure_bamboo_shoot", "ghost_face_flower", "sun_flower", 
    "frost_dew_petal", "thunder_strike_fern", "earth_spirit_root", "celestial_peach_flesh", "abyssal_black_vine", 
    "jade_marrow_fungus", "star_dust_pollen", "poison_ivy_extract", "spirit_condensing_reed"
  ]},
  { group: "ores", count: 15, prefix: "ore", items: [
    "black_iron", "cold_iron", "red_copper", "xuan_steel", "meteor_iron", "lightning_crystal", "void_shard", 
    "spirit_jade_raw", "sun_stone", "moon_stone", "blood_amber", "dragon_scale_ore", "adamantine_chunk", 
    "frost_core", "basalt_flint"
  ]},
  { group: "pills", count: 10, prefix: "pill", items: [
    "qi_gathering_pill", "foundation_establishment_pill", "healing_vitality_pill", "antidote_purifying_pill", 
    "breakthrough_nascent_pill", "bone_tempering_pill", "soul_cleansing_pill", "fire_resistance_pill", 
    "speed_wind_pill", "immortal_ascension_pill"
  ]},
  { group: "weapons_armors", count: 25, prefix: "gear", items: [
    "sword_iron", "sword_flying_azure", "saber_broad", "spear_dragon", "staff_bamboo", "bow_recurve", 
    "flute_jade", "guqin_seven_string", "fan_iron_rib", "dagger_shadow", "gloves_iron_fist", "needle_silver", 
    "robe_daoist_blue", "robe_scholar_white", "armor_iron_scale", "armor_black_demon", "boots_cloud_stepping", 
    "belt_jade_buckle", "hat_bamboo_conical", "crown_celestial_gold", "ring_storage_spatial", "necklace_buddha_beads", 
    "talisman_pendant_dragon", "shield_tortoise_shell", "flying_sword_mount"
  ]},
  { group: "talismans", count: 8, prefix: "talisman", items: [
    "flame_burst_talisman", "frost_nova_talisman", "gale_escape_talisman", "golden_shield_talisman", 
    "lightning_strike_talisman", "summon_spirit_talisman", "demon_sealing_talisman", "tracking_divination_talisman"
  ]},
  { group: "materials_food", count: 25, prefix: "mat", items: [
    "beast_hide_wolf", "beast_fang_tiger", "demon_core_tier1", "dragon_scale_fragment", "silk_thread_spider", 
    "bamboo_plank", "pine_timber", "roof_tile_slate", "ink_stick_pine", "xuan_paper_roll", "rice_bowl", 
    "tea_pot_clay", "wine_gourd_bamboo", "steamed_bun_mantou", "roast_meat_boar", "spirit_grain_bag", 
    "coarse_salt_sack", "tallow_candle", "iron_nails_box", "hemp_rope_coil", "ceramic_pot", "feather_crane", 
    "mortar_pestle_stone", "iron_cauldron_tripod", "wooden_bucket"
  ]},
  { group: "laws", count: 15, prefix: "law", items: [
    "emblem_sword_dao", "emblem_fire_dao", "emblem_water_dao", "emblem_wood_dao", "emblem_earth_dao", 
    "emblem_metal_dao", "emblem_lightning_dao", "emblem_ice_dao", "emblem_wind_dao", "emblem_life_dao", 
    "emblem_death_dao", "emblem_space_dao", "emblem_time_dao", "emblem_illusion_dao", "emblem_heavenly_dao"
  ]},
  { group: "actions_status", count: 28, prefix: "act", items: [
    "act_build_house", "act_build_forge", "act_build_farm", "act_upgrade", "act_demolish", "act_rotate", 
    "act_confirm", "act_cancel", "act_inspect", "act_meditate", "act_forage", "act_mine", "act_fish", 
    "act_craft", "status_qi_full", "status_qi_depleted", "status_hp_wounded", "status_stamina_exhausted", 
    "status_poisoned", "status_burned", "status_frozen", "status_cursed", "status_stunned", "status_enlightened", 
    "status_qi_deviation", "status_invulnerable", "status_invisibility", "status_bloodlust"
  ]},
  { group: "sect_emblems", count: 8, prefix: "sect", items: [
    "seal_awan_pedang", "seal_pedang_langit", "seal_lonceng_emas", "seal_racun_bayangan", 
    "seal_giok_timur", "seal_petir_ilahiah", "seal_pasir_suci", "seal_es_abadi"
  ]}
];

// Hasilkan 1.099 Objek
const allObjects = [];
let seedCounter = 7919;

// 1. 580 Objek Khas Regional (29 Region x 10 Objek x 2 Varian)
for (const reg of REGION_DEFINITIONS) {
  for (const obj of reg.objects) {
    for (let v = 1; v <= 2; v++) {
      const objId = `region_object.${reg.id}.${obj.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.v${v}`;
      const prompt = `${obj.name} (variation ${v} of 2, different silhouette and details): ${obj.desc}. Palette emphasis: ${reg.palette}. Mood: ${reg.mood}. ${STYLE_BASE}. isolated on a plain flat pure white background, no ground shadow plate, no frame, no text, no border.`;
      
      allObjects.push({
        id: objId,
        category: "region_object",
        location: reg.id,
        name: obj.name,
        variant: v,
        description: obj.desc,
        footprintTiles: { w: obj.w, h: obj.h },
        sizePx: { w: obj.w * 128, h: obj.h * 128 },
        anchor: "bottom-center",
        prompt: prompt,
        negative: NEGATIVE_BASE,
        seedHint: seedCounter,
        postprocess: ["luminanceKey", "trim", "fit", "normalizePalette", "pack"]
      });

      seedCounter = (seedCounter + 7919) % 100000;
    }
  }
}

// 2. 195 Objek Alam Umum
const NATURE_TEMPLATES = [
  { name: "Bamboo Single Stalk", w: 1, h: 2, count: 15 },
  { name: "Bamboo Grove Tight", w: 2, h: 3, count: 20 },
  { name: "Bamboo Forest Wide", w: 4, h: 4, count: 20 },
  { name: "Mountain Pine Ancient", w: 2, h: 3, count: 20 },
  { name: "Red Maple Autumn", w: 2, h: 2, count: 20 },
  { name: "Golden Ginkgo Grand", w: 3, h: 3, count: 20 },
  { name: "Wild Peach Blossom", w: 2, h: 2, count: 20 },
  { name: "Mossy River Stone", w: 1, h: 1, count: 20 },
  { name: "Granite Crag Outcrop", w: 2, h: 2, count: 20 },
  { name: "Spiritual Herba Cluster", w: 1, h: 1, count: 20 }
];

for (const tmpl of NATURE_TEMPLATES) {
  for (let i = 1; i <= tmpl.count; i++) {
    const objId = `common_nature.${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.v${i}`;
    const prompt = `${tmpl.name} (variant ${i} of ${tmpl.count}): detailed natural flora/mineral asset with unique ink stroke silhouette. ${STYLE_BASE}. isolated on a plain flat pure white background, no ground shadow plate, no frame, no text, no border.`;
    allObjects.push({
      id: objId,
      category: "common_nature",
      location: "common",
      name: `${tmpl.name} v${i}`,
      variant: i,
      description: `${tmpl.name} universal nature asset`,
      footprintTiles: { w: tmpl.w, h: tmpl.h },
      sizePx: { w: tmpl.w * 128, h: tmpl.h * 128 },
      anchor: "bottom-center",
      prompt,
      negative: NEGATIVE_BASE,
      seedHint: seedCounter,
      postprocess: ["luminanceKey", "trim", "fit", "normalizePalette", "pack"]
    });
    seedCounter = (seedCounter + 3847) % 100000;
  }
}

// 3. 90 Ground Tiles Seamless
const TERRAIN_TYPES = ["plains", "forest", "bamboo", "meadow", "farmland", "sand", "snow", "rock", "mire", "water"];
for (const tt of TERRAIN_TYPES) {
  for (let i = 1; i <= 9; i++) {
    const objId = `ground_tile.${tt}.v${i}`;
    const prompt = `Seamless repeatable ground texture pattern, ${tt} terrain with delicate rice paper grain, soft watercolor washes. ${STYLE_BASE}. flat top-down seamless texture, no seams, no borders.`;
    allObjects.push({
      id: objId,
      category: "ground_tile",
      location: "common",
      name: `${tt} ground tile v${i}`,
      variant: i,
      description: `Seamless ground tile for ${tt}`,
      footprintTiles: { w: 1, h: 1 },
      sizePx: { w: 256, h: 256 },
      anchor: "center",
      prompt,
      negative: NEGATIVE_BASE,
      seedHint: seedCounter,
      postprocess: ["makeSeamless", "fit", "pack"]
    });
    seedCounter = (seedCounter + 2137) % 100000;
  }
}

// 4. 146 Bangunan (Fasilitas, Pemukiman, Rumah Pemain Lv 1-3, Kavling)
const BUILDING_TEMPLATES = [
  { name: "Player Cottage Lv1 Straw", w: 2, h: 2, count: 15 },
  { name: "Player House Lv2 Timber", w: 3, h: 3, count: 20 },
  { name: "Player Manor Lv3 Tiled", w: 4, h: 4, count: 20 },
  { name: "Blacksmith Forge Workshop", w: 3, h: 3, count: 15 },
  { name: "Alchemy Laboratory Hall", w: 3, h: 3, count: 15 },
  { name: "Farmland Plot Fenced", w: 2, h: 2, count: 15 },
  { name: "Village Elder Hall", w: 4, h: 3, count: 15 },
  { name: "Tavern Inn Roadside", w: 3, h: 3, count: 15 },
  { name: "City Wall Gatehouse", w: 4, h: 3, count: 16 }
];

for (const tmpl of BUILDING_TEMPLATES) {
  for (let i = 1; i <= tmpl.count; i++) {
    const objId = `structure.${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.v${i}`;
    const prompt = `${tmpl.name} (variant ${i} of ${tmpl.count}): traditional wuxia architectural asset with upturned curved eaves and paper windows. ${STYLE_BASE}. isolated on a plain flat pure white background, no ground shadow plate, no frame, no text, no border.`;
    allObjects.push({
      id: objId,
      category: "structure",
      location: "settlement",
      name: `${tmpl.name} v${i}`,
      variant: i,
      description: `${tmpl.name} building asset`,
      footprintTiles: { w: tmpl.w, h: tmpl.h },
      sizePx: { w: tmpl.w * 128, h: tmpl.h * 128 },
      anchor: "bottom-center",
      prompt,
      negative: NEGATIVE_BASE,
      seedHint: seedCounter,
      postprocess: ["luminanceKey", "trim", "fit", "normalizePalette", "pack"]
    });
    seedCounter = (seedCounter + 4153) % 100000;
  }
}

// 5. 58 Monster & Boss Spasial
for (let i = 1; i <= 48; i++) {
  const objId = `monster.beast_tier_${((i % 4) + 1)}.v${i}`;
  const prompt = `Spatial beast spirit monster (tier ${((i % 4) + 1)}, type ${i}): fierce mythical wuxia creature painted in energetic dry-brush strokes with faint spirit aura. ${STYLE_BASE}. isolated on a plain flat pure white background, no ground shadow plate, no frame, no text, no border.`;
  allObjects.push({
    id: objId,
    category: "monster",
    location: "wilds",
    name: `Spatial Spirit Beast ${i}`,
    variant: i,
    description: `Roaming beast entity`,
    footprintTiles: { w: 2, h: 2 },
    sizePx: { w: 256, h: 256 },
    anchor: "bottom-center",
    prompt,
    negative: NEGATIVE_BASE,
    seedHint: seedCounter,
    postprocess: ["luminanceKey", "trim", "fit", "pack"]
  });
  seedCounter = (seedCounter + 5683) % 100000;
}
for (let b = 1; b <= 10; b++) {
  const objId = `boss.titan_lord.v${b}`;
  const prompt = `Legendary overlord titan boss (boss ${b} of 10): colossal terrifying mythical demon emperor with horns and swirling lightning/fire aura. ${STYLE_BASE}. isolated on a plain flat pure white background, no ground shadow plate, no frame, no text, no border.`;
  allObjects.push({
    id: objId,
    category: "monster",
    location: "boss_lair",
    name: `Overlord Titan Boss ${b}`,
    variant: b,
    description: `Colossal field boss`,
    footprintTiles: { w: 4, h: 4 },
    sizePx: { w: 512, h: 512 },
    anchor: "bottom-center",
    prompt,
    negative: NEGATIVE_BASE,
    seedHint: seedCounter,
    postprocess: ["luminanceKey", "trim", "fit", "pack"]
  });
  seedCounter = (seedCounter + 8719) % 100000;
}

// 6. 30 Penanda NPC & Pemain
for (let m = 1; m <= 30; m++) {
  const objId = `marker.entity_prop.v${m}`;
  const prompt = `Map marker and prop (type ${m} of 30): travelling merchant cart, scholar desk, resting monk, or territory boundary flag. ${STYLE_BASE}. isolated on a plain flat pure white background, no ground shadow plate, no frame, no text, no border.`;
  allObjects.push({
    id: objId,
    category: "marker",
    location: "common",
    name: `Entity Marker ${m}`,
    variant: m,
    description: `Entity interactive prop`,
    footprintTiles: { w: 1, h: 1 },
    sizePx: { w: 128, h: 128 },
    anchor: "bottom-center",
    prompt,
    negative: NEGATIVE_BASE,
    seedHint: seedCounter,
    postprocess: ["luminanceKey", "trim", "fit", "pack"]
  });
  seedCounter = (seedCounter + 1999) % 100000;
}

// Hasilkan 223 Ikon UI
const allIcons = [];
let iconSeed = 10007;

for (const cat of ICON_CATEGORIES) {
  for (const item of cat.items) {
    const iconId = `icon.${cat.group}.${item}`;
    const cleanName = item.replace(/_/g, ' ');
    const prompt = `Game icon, ${cleanName}: ink-wash brush painting on a plain white background, centered single subject filling 80% of frame, thick confident brush outline in ink #2E3A38, soft watercolor fill in jade/ocher/mist-blue palette with small cinnabar accent, subtle paper grain, round slightly worn feel like Tale of Immortal UI icons, no text, no frame, no drop shadow.`;
    
    allIcons.push({
      id: iconId,
      group: cat.group,
      name: cleanName,
      sizePx: { w: 256, h: 256 },
      prompt,
      negative: NEGATIVE_BASE,
      seedHint: iconSeed,
      postprocess: ["luminanceKey", "trim", "fit", "packAtlas"]
    });
    iconSeed = (iconSeed + 3571) % 100000;
  }
}

const manifest = {
  version: "4.0",
  generated: "2026-10-10",
  styleBase: STYLE_BASE,
  negativeBase: NEGATIVE_BASE,
  counts: {
    objects: allObjects.length,
    icons: allIcons.length,
    total: allObjects.length + allIcons.length
  },
  objects: allObjects,
  icons: allIcons
};

const outputPath = path.join(__dirname, '../../jianghu_image_manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`[OK] Berhasil menghasilkan jianghu_image_manifest.json:`);
console.log(`     - Objek Peta: ${allObjects.length}`);
console.log(`     - Ikon UI:    ${allIcons.length}`);
console.log(`     - Total Aset: ${manifest.counts.total}`);
