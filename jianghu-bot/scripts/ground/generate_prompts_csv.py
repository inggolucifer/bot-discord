import csv

families = [
    {
        "family": "plains",
        "subject": "temperate grassland with subtle soil undertones and gentle mossy tufts",
        "palette": "#7f9a5a base, #8a8f55 accent, muted olive and soft sage green",
        "variation_m1": "Dense wuxia Shan Shui ink wash grassland texture on ancient Xuan paper, even soft brushwork, calm texture, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse calm wuxia Shan Shui ink wash grassland on ancient Xuan paper, gentle wash with open tranquil spaces, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui ink wash grassland on ancient Xuan paper, showing two darker damp soil patches with subtle mineral wash, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter wuxia Shan Shui ink wash grassland on ancient Xuan paper, sunlit pale green wash with delicate fine dry-brush grass blades, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Fine dry-brush grass stippling, subtle dewdrop specks, and soft rice-paper fiber flecks, semi-transparent seamless overlay"
    },
    {
        "family": "meadow",
        "subject": "lush blossoming alpine meadow with subtle wild herbal tint and golden pollen hues",
        "palette": "#6fa05a base, #c9b86a accent, emerald moss and warm golden amber",
        "variation_m1": "Dense vibrant wuxia Shan Shui ink wash meadow texture on ancient Xuan paper, rich mossy green with subtle floral stippling, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tranquil wuxia Shan Shui meadow on ancient Xuan paper, open soft green wash with gentle warm pollen undertones, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui meadow on ancient Xuan paper, rich green lawn featuring two distinct darker wildflower tuft patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter golden-tinted wuxia Shan Shui meadow on ancient Xuan paper, pale jade wash illuminated with faint sunny morning haze, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Microscopic blossom flecks, golden pollen dust specks, and soft water droplets on blades, semi-transparent seamless overlay"
    },
    {
        "family": "farmland",
        "subject": "cultivated loam field with gentle tilled furrow washes and fertile Jiangnan soil",
        "palette": "#7a6444 base, #88a05a accent, warm umber and muted sprout green",
        "variation_m1": "Dense wuxia Shan Shui ink wash cultivated soil texture on ancient Xuan paper, rich earthy furrows with even brush strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse smooth wuxia Shan Shui tilled loam on ancient Xuan paper, quiet flat earthen beds with gentle wash transitions, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui agricultural soil on ancient Xuan paper, dark moist loam patches mingled with lighter dry clay, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sunbaked wuxia Shan Shui tilled ground on ancient Xuan paper, pale ochre earth with delicate tiny sprout brush hints, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Subtle tilled soil rake marks, straw mulch dust particles, and damp earth granulations, semi-transparent seamless overlay"
    },
    {
        "family": "herb_field",
        "subject": "spiritual botanical sanctuary soil infused with jade medicinal Qi and damp moss",
        "palette": "#4f7d5c base, #5fb3a0 accent, deep viridian and glowing jade turquoise",
        "variation_m1": "Dense wuxia Shan Shui ink wash spiritual herb soil on ancient Xuan paper, saturated medicinal earth with jade Qi undertones, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tranquil wuxia Shan Shui herb garden bed on ancient Xuan paper, calm dark jade soil with expansive serene spaces, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui spiritual botanical ground on ancient Xuan paper, rich viridian earth with two darker damp humic Qi patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter ethereal wuxia Shan Shui herb field soil on ancient Xuan paper, translucent pale jade wash with soft fine rootlet strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Faint luminescent herbal spore flecks, fine fibrous root filaments, and crystalline dew glints, semi-transparent seamless overlay"
    },
    {
        "family": "forest_floor",
        "subject": "ancient primeval forest humus layer with decomposed autumn needles and loamy moss",
        "palette": "#3f5b3a base, #5a4a33 accent, deep forest shadow green and damp bark brown",
        "variation_m1": "Dense wuxia Shan Shui ink wash ancient woods soil on ancient Xuan paper, rich dark loamy leaf litter and mossy washes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse deep wuxia Shan Shui woodland ground on ancient Xuan paper, smooth deep pine-shadow wash with tranquil clearings, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui forest floor on ancient Xuan paper, dark humus ground broken by two dense damp fungal moss patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter dappled wuxia Shan Shui forest undergrowth soil on ancient Xuan paper, soft olive canopy light wash with delicate needle stipples, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Fallen needle stippling, microscopic lichen spore clusters, and crumbly humus grain, semi-transparent seamless overlay"
    },
    {
        "family": "bamboo_floor",
        "subject": "quiet bamboo grove ground covered in dry yellowed sheath needles and soft moss",
        "palette": "#6f7d4a base, #a39a6a accent, yellowish sage and dry bamboo bamboo-straw amber",
        "variation_m1": "Dense wuxia Shan Shui ink wash bamboo floor on ancient Xuan paper, rich layer of fallen bamboo sheaths and green moss, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse serene wuxia Shan Shui bamboo forest bed on ancient Xuan paper, wide smooth earthy wash with minimal needle accents, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui bamboo ground on ancient Xuan paper, pale bamboo soil with two darker clusters of decayed damp sheaths, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter golden wuxia Shan Shui bamboo floor on ancient Xuan paper, pale bamboo shoot amber wash with fine needle brushwork, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Slender dry bamboo leaf silhouettes, fibrous papery sheath flecks, and light sand grains, semi-transparent seamless overlay"
    },
    {
        "family": "dead_wood",
        "subject": "arid withered badlands ground littered with splintered dry timber shavings and chalky dirt",
        "palette": "#6e6a62 base, #8d877c accent, weathered ash grey and dry desiccated tan",
        "variation_m1": "Dense wuxia Shan Shui ink wash desolate woodground on ancient Xuan paper, textured chalky soil with dry bark shavings, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse barren wuxia Shan Shui deadwood plain on ancient Xuan paper, open pale ash earth with flat calm washes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui desiccated timber floor on ancient Xuan paper, weathered grey dirt featuring two darker rotten log-dust stains, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sun-bleached wuxia Shan Shui withered forest ground on ancient Xuan paper, pale bone-grey wash with fine dry splinters, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Dry wood grain fissures, fine timber sawdust scatter, and crumbly charcoal dust specks, semi-transparent seamless overlay"
    },
    {
        "family": "hill",
        "subject": "sloping highland pasture with exposed mineral gravel and hardy upland turf",
        "palette": "#78875f base, #8c8a80 accent, highland sage green and cool shale grey",
        "variation_m1": "Dense wuxia Shan Shui ink wash upland hill turf on ancient Xuan paper, tight wind-swept grass texture and fine pebble washes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tranquil wuxia Shan Shui rolling knoll on ancient Xuan paper, sweeping smooth green-grey wash with calm upland space, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui foothill terrain on ancient Xuan paper, grassy highland with two darker gravel outcrop patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter mist-kissed wuxia Shan Shui hill crest ground on ancient Xuan paper, pale misty green wash with delicate fine stony stippling, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Tiny wind-smoothed pebble stippling, hardy lichen flecks, and delicate grass feathering, semi-transparent seamless overlay"
    },
    {
        "family": "rock_ground",
        "subject": "weathered bedrock pavement with natural granite fissures and fine stone grit",
        "palette": "#6d7378 base, #8b857b accent, cool slate and warm quartzite sediment",
        "variation_m1": "Dense wuxia Shan Shui ink wash stone pavement on ancient Xuan paper, rugged bedrock texture with fine mineral speckles, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse flat wuxia Shan Shui rock slab on ancient Xuan paper, smooth polished mountain stone with calm broad ink washes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui rocky plateau on ancient Xuan paper, granite ground with two darker damp mineral oxidation patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter chalky wuxia Shan Shui limestone ground on ancient Xuan paper, pale grey-buff stone wash with fine dry fissures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Microscopic mineral cleavage fissures, crushed granite dust granules, and tiny dry moss flecks, semi-transparent seamless overlay"
    },
    {
        "family": "mountain_pass",
        "subject": "windswept alpine defile with loose scree, compressed dirt, and weathered rock dust",
        "palette": "#7b776d base, #6c5f4d accent, stony brownish grey and deep mountain loess",
        "variation_m1": "Dense wuxia Shan Shui ink wash mountain pass ground on ancient Xuan paper, crushed scree stones and hard-packed high altitude trail, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse calm wuxia Shan Shui pass road on ancient Xuan paper, quiet flat gravel bed with smooth gradient washes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui alpine trail on ancient Xuan paper, stony pass with two darker damp shadow depression patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter high-altitude wuxia Shan Shui pass on ancient Xuan paper, pale dust wash illuminated by sharp mountain sun, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Crushed shale scree particles, wind-blown dust striations, and coarse pebble granulations, semi-transparent seamless overlay"
    },
    {
        "family": "canyon_floor",
        "subject": "sun-drenched red sandstone ravine floor with dry river silt and oxidized clay",
        "palette": "#a2603f base, #c08f62 accent, terracotta red and warm desert sandstone ochre",
        "variation_m1": "Dense wuxia Shan Shui ink wash canyon basin on ancient Xuan paper, rich reddish sandstone silt and baked clay textures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse smooth wuxia Shan Shui ravine bed on ancient Xuan paper, sweeping terracotta wash with tranquil flat sand drifts, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui gorge floor on ancient Xuan paper, warm sandstone with two darker iron-rich oxidized clay patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sunlit wuxia Shan Shui canyon floor on ancient Xuan paper, bright golden-red sand wash with fine ripple strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Fine wind-ripple dust striations, reddish sandstone grain speckles, and dry clay micro-cracks, semi-transparent seamless overlay"
    },
    {
        "family": "desert_sand",
        "subject": "golden Silk Road desert sand with gentle wind ripple undulations and quartz dust",
        "palette": "#d2b57e base, #c9a566 accent, luminous golden sand and warm desert amber",
        "variation_m1": "Dense wuxia Shan Shui ink wash desert sand on ancient Xuan paper, delicate repetitive ripple crests and smooth grains, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tranquil wuxia Shan Shui sand plain on ancient Xuan paper, vast unbroken golden wash with subtle airy gradients, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui desert expanse on ancient Xuan paper, warm golden sand with two darker damp subterranean seepage patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter dazzling wuxia Shan Shui desert sand on ancient Xuan paper, pale bleached sunlit dunes with fine shimmering strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Subtle curved wind ripple ridges, shimmering quartz grain specks, and soft dust dusting, semi-transparent seamless overlay"
    },
    {
        "family": "dune",
        "subject": "towering shifting dune slope with sharp shadow-free windward sand curtains",
        "palette": "#cfa968 base, #b58b50 accent, deep dune gold and rich burnt sienna undertone",
        "variation_m1": "Dense wuxia Shan Shui ink wash dune crest on ancient Xuan paper, layered sweeping sand waves and fine rhythmic crests, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse open wuxia Shan Shui rolling dune flank on ancient Xuan paper, serene golden sand sheet with gentle tonal transition, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui dune field on ancient Xuan paper, amber sand sea with two darker gravelly trough patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sun-baked wuxia Shan Shui high dune face on ancient Xuan paper, radiant pale ochre wash with fine slipface lines, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Rhythmic wavy ridge shadows, microscopic mica sparkles, and fine sliding sand granules, semi-transparent seamless overlay"
    },
    {
        "family": "oasis",
        "subject": "fertile desert sanctuary fringe where damp alluvial loam meets green reed grass",
        "palette": "#bda978 base, #6c8f50 accent, rich oasis silt tan and lush riparian palm green",
        "variation_m1": "Dense wuxia Shan Shui ink wash oasis border on ancient Xuan paper, rich moist silt interwoven with green reed turf, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse calm wuxia Shan Shui oasis shore on ancient Xuan paper, gentle transitions between damp earth and serene sand wash, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui oasis basin on ancient Xuan paper, pale sandy silt with two darker damp green moss pool fringes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sunlit wuxia Shan Shui oasis margin on ancient Xuan paper, bright warm loam with delicate tiny blade stippling, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Moist silt water tide marks, tiny freshwater reed shoots, and damp dark loam specks, semi-transparent seamless overlay"
    },
    {
        "family": "snow",
        "subject": "pure pristine mountain snow blanket with soft powdery drifts and crystalline reflections",
        "palette": "#eef3f7 base, #cfe0ec accent, pure glacial white and ethereal pale cerulean blue",
        "variation_m1": "Dense wuxia Shan Shui ink wash deep snow on ancient Xuan paper, rich powder drifts with soft subtle blue-tinted folds, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse pristine wuxia Shan Shui fresh snowfall on ancient Xuan paper, vast untouched white expanse with ethereal lightness, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui snowscape on ancient Xuan paper, crisp white snow blanket with two subtle firmer icy crust patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter radiant wuxia Shan Shui sunlit snow on ancient Xuan paper, brilliant crystalline wash with delicate sparkling frost strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Hexagonal ice crystal sparkle specks, delicate wind-blown powder spindrift, and faint frost needles, semi-transparent seamless overlay"
    },
    {
        "family": "ice_crack",
        "subject": "frozen alpine lake or permafrost shelf laced with deep azure crystalline fracture lines",
        "palette": "#b9d8e8 base, #e8f3f9 accent, deep turquoise ice and frosty silver fractures",
        "variation_m1": "Dense wuxia Shan Shui ink wash cracked ice on ancient Xuan paper, complex web of frozen stress cracks and glassy depths, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse clear wuxia Shan Shui frozen lake sheet on ancient Xuan paper, calm translucent aquamarine ice with few hairline fissures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui permafrost ice on ancient Xuan paper, blue glacial sheet with two dense white internal shatter bursts, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter frosted wuxia Shan Shui glazed ice on ancient Xuan paper, pale silver-blue ice wash with fine surface etching, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Hairline dendritic ice fracture networks, frozen air bubble clusters, and crystalline frost feathers, semi-transparent seamless overlay"
    },
    {
        "family": "swamp",
        "subject": "murky fenland mud saturated with stagnant peat, decaying marsh grass, and water film",
        "palette": "#55663f base, #3e4a33 accent, dark olive peat and murky stagnant marsh water",
        "variation_m1": "Dense wuxia Shan Shui ink wash marsh mud on ancient Xuan paper, heavy waterlogged peat with tangled aquatic moss, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tranquil wuxia Shan Shui fen pool on ancient Xuan paper, smooth deep olive water-logged soil with open calm wash, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui wetlands on ancient Xuan paper, dark peat ground broken by two deep glistening mud slick patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sun-warmed wuxia Shan Shui swamp bank on ancient Xuan paper, murky yellow-green silt wash with fine duckweed stippling, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Glistening mud slick glazes, tiny aquatic duckweed flakes, and decaying reed fibers, semi-transparent seamless overlay"
    },
    {
        "family": "demonic_swamp",
        "subject": "corrupted nether marsh steeped in malevolent purple miasma and black abyssal muck",
        "palette": "#3b2a48 base, #5b3f6a accent, abyssal midnight violet and corrupted plum purple",
        "variation_m1": "Dense wuxia Shan Shui ink wash demonic bog on ancient Xuan paper, rich cursed black-violet muck with dark Qi swirls, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse eerie wuxia Shan Shui corrupted fen on ancient Xuan paper, silent deep violet peat with vast still necrotic spaces, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui demonic mire on ancient Xuan paper, dark purple mud featuring two darker necrotic ooze pool patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter spectral wuxia Shan Shui tainted marsh on ancient Xuan paper, pale ghostly amethyst wash with faint necrotic tendrils, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Malevolent purple Qi vapor wisps, crystalline necrotic salt grains, and viscous black slime speckles, semi-transparent seamless overlay"
    },
    {
        "family": "poison_pool",
        "subject": "noxious venomous quagmire brimming with toxic emerald bile and corrosive slime",
        "palette": "#5f8b35 base, #9acb4a accent, virulent bile green and radioactive chartreuse lime",
        "variation_m1": "Dense wuxia Shan Shui ink wash poison basin on ancient Xuan paper, bubbling toxic sludge textures with vibrant acid swirls, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse still wuxia Shan Shui venom pool on ancient Xuan paper, calm chartreuse green chemical wash with tranquil oily film, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui virulent marsh on ancient Xuan paper, acidic mossy ground with two darker caustic bile slick patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter luminescent wuxia Shan Shui acid ground on ancient Xuan paper, bright pale green toxic wash with fine foam ring strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Microscopic bursting acid bubble rings, glowing venom droplet specks, and chemical scum marbling, semi-transparent seamless overlay"
    },
    {
        "family": "miasma_waste",
        "subject": "choking barren waste of necrotic chalk, toxic residue, and stagnant smog deposits",
        "palette": "#5e5666 base, #7e7482 accent, smoggy slate mauve and chalky necrotic lavender",
        "variation_m1": "Dense wuxia Shan Shui ink wash miasmic soil on ancient Xuan paper, heavy toxic particulate deposits and choked earth textures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse desolate wuxia Shan Shui blighted flat on ancient Xuan paper, silent dusty mauve wash with expansive lifeless spaces, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui poisonous barrens on ancient Xuan paper, grey-purple ground with two darker damp chemical crust patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter hazy wuxia Shan Shui miasma waste on ancient Xuan paper, pale lilac chalk wash with delicate powdery residue strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Powdery chemical dust clouds, tiny blighted crystalline crusts, and fine sulfurous particle specks, semi-transparent seamless overlay"
    },
    {
        "family": "battlefield_ash",
        "subject": "hallowed ancient warzone littered with scorched soot, crushed iron ash, and charred bones",
        "palette": "#4a4540 base, #6d655b accent, charred soot black and oxidized iron ash grey",
        "variation_m1": "Dense wuxia Shan Shui ink wash charred battlefield on ancient Xuan paper, heavy charcoal dust and compacted ash textures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse somber wuxia Shan Shui battle ground on ancient Xuan paper, quiet flat soot wash with vast solemn empty stretches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui scorched earth on ancient Xuan paper, dark ash expanse with two pitch-black concentrated burn patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter weathered wuxia Shan Shui ancient war site on ancient Xuan paper, pale charcoal-grey wash with fine pulverized cinder strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Pulverized cinder specks, microscopic scorched soot flecks, and faint rusted metal dust grain, semi-transparent seamless overlay"
    },
    {
        "family": "volcanic",
        "subject": "basalt volcanic crust hardened into porous pumice, obsidian flakes, and sulfurous crevices",
        "palette": "#2e2a2a base, #d2561f accent, pitch-black basalt and smoldering ember orange",
        "variation_m1": "Dense wuxia Shan Shui ink wash volcanic crust on ancient Xuan paper, jagged porous basalt textures with faint ember undertones, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse cold wuxia Shan Shui cooled lava plain on ancient Xuan paper, smooth deep obsidian black wash with tranquil expanses, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui caldera terrain on ancient Xuan paper, basalt ground featuring two darker glass-fused obsidian patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter ashen wuxia Shan Shui volcanic slag on ancient Xuan paper, dark charcoal wash with fine sulfurous dust brush hints, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Sharp obsidian glass shards, yellow sulfur crystal dust specks, and porous pumice micro-cavities, semi-transparent seamless overlay"
    },
    {
        "family": "lava_flow",
        "subject": "molten incandescent magma river surface with crusted dark slag plates and blazing seams",
        "palette": "#3b2018 base, #ff7a1a accent, scorched black slag and incandescent flame orange",
        "variation_m1": "Dense wuxia Shan Shui ink wash molten lava on ancient Xuan paper, network of bright fiery magma fissures between dark slag, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse cooling wuxia Shan Shui magma pool on ancient Xuan paper, broad deep slag sheets with gentle glowing underbelly wash, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui lava field on ancient Xuan paper, dark crust featuring two intensely brilliant molten fountain patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter blazing wuxia Shan Shui liquid flame river on ancient Xuan paper, radiant orange-yellow molten wash with fine crack lines, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Floating dark basalt slag flakes, incandescent heat haze shimmer specks, and fine molten filament lines, semi-transparent seamless overlay"
    },
    {
        "family": "crater",
        "subject": "meteor impact blast zone with shattered bedrock, pulverized shock glass, and radial fissures",
        "palette": "#4a3a32 base, #7c5a44 accent, burnt impact stone and reddish shock-melt gravel",
        "variation_m1": "Dense wuxia Shan Shui ink wash impact crater on ancient Xuan paper, pulverized impact breccia and radiating pressure wave lines, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse hollow wuxia Shan Shui crater interior on ancient Xuan paper, smooth crushed bedrock wash with calm depression floor, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui blast crater on ancient Xuan paper, crushed rock ground with two darker vitrified melt-glass patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter dusty wuxia Shan Shui meteor crater rim on ancient Xuan paper, pale burnt sandstone wash with fine ejecta dust strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Radiating shock micro-fractures, melted tektite glass beads, and fine pulverized rock flour, semi-transparent seamless overlay"
    },
    {
        "family": "lightning_scar",
        "subject": "celestial tribulation ground struck by heavenly lightning, fulgurite glass, and ozone scorched soil",
        "palette": "#2f3440 base, #9ec9ff accent, deep thundercloud navy and electric azure fulgurite",
        "variation_m1": "Dense wuxia Shan Shui ink wash tribulation ground on ancient Xuan paper, branching electric fulgurite veins in scorched earth, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse ionized wuxia Shan Shui lightning field on ancient Xuan paper, calm deep indigo soil with faint glowing aura wash, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui thunder scar terrain on ancient Xuan paper, dark scorched ground with two brilliant electric glass melt patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter crackling wuxia Shan Shui lightning strike site on ancient Xuan paper, pale celestial blue wash with fine dendritic spark lines, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Lichtenberg dendritic glass branches, glowing ozone spark specks, and vitrified silica crust fragments, semi-transparent seamless overlay"
    },
    {
        "family": "formation_tile",
        "subject": "ancient Daoist array ground carved with celestial hexagrams, Qi conduits, and polished slate",
        "palette": "#6f7770 base, #6fd0c4 accent, antique temple slate and glowing turquoise Qi runes",
        "variation_m1": "Dense wuxia Shan Shui ink wash Daoist formation on ancient Xuan paper, interlocking array circuits and spiritual stone inlays, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tranquil wuxia Shan Shui array platform on ancient Xuan paper, polished sacred flagstone with minimal quiet talisman lines, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui ritual array floor on ancient Xuan paper, aged stone floor with two intensely glowing focal node patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter ethereal wuxia Shan Shui formation ground on ancient Xuan paper, pale jade-tinted flagstone wash with fine golden circuit strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Delicate geometric Qi conduit engravings, tiny spirit stone dust specks, and faint talismanic glyph outlines, semi-transparent seamless overlay"
    },
    {
        "family": "ruin_floor",
        "subject": "crumbled dynastic palace courtyard with overgrown flagstones, mossy mortar, and cracked marble",
        "palette": "#78756b base, #5d7a4c accent, weathered dynasty stone and creeping courtyard moss",
        "variation_m1": "Dense wuxia Shan Shui ink wash ancient ruins on ancient Xuan paper, cracked paving stones woven with dense creeping weeds, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse grand wuxia Shan Shui palace ruin on ancient Xuan paper, broad calm flagstone washes with subtle age patinas, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui temple courtyard on ancient Xuan paper, grey paving slabs with two heavily collapsed rubble mortar patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sunlit wuxia Shan Shui overgrown ruin on ancient Xuan paper, pale limestone wash with delicate moss tuft stippling, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Mortar seam erosion networks, chipped stone fragments, and tiny creeping ivy spore flecks, semi-transparent seamless overlay"
    },
    {
        "family": "island_reef",
        "subject": "tropical East Sea atoll shoal where shallow turquoise waters wash over coral sand and reef rock",
        "palette": "#4fb3b0 base, #e5d9a8 accent, crystal turquoise lagoon and warm shell-sand gold",
        "variation_m1": "Dense wuxia Shan Shui ink wash coral shoal on ancient Xuan paper, rich submerged reef patterns and shimmering clear shallows, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse calm wuxia Shan Shui lagoon sandbar on ancient Xuan paper, gentle turquoise water wash over tranquil pale sand, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui island reef ground on ancient Xuan paper, pale coral sand with two darker living reef crest patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sparkling wuxia Shan Shui tropical shallows on ancient Xuan paper, luminous pale aquamarine wash with fine water caustics, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Sunlight water caustic networks, crushed mother-of-pearl shell specks, and fine coral sand ripples, semi-transparent seamless overlay"
    },
    {
        "family": "abyss_edge",
        "subject": "edge of the endless void chasm where crumbling black rock dissolves into bottomless shadows",
        "palette": "#2a2530 base, #5a3a6a accent, void black obsidian and chilling abyssal violet haze",
        "variation_m1": "Dense wuxia Shan Shui ink wash abyss brink on ancient Xuan paper, jagged crumbly void rocks and heavy creeping dark miasma, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse deep wuxia Shan Shui chasm ledge on ancient Xuan paper, profound dark purple wash with vast empty precipice space, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui nether rim on ancient Xuan paper, dark jagged rock with two pitch-black fathomless sinkhole patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter spectral wuxia Shan Shui abyss shelf on ancient Xuan paper, muted smoky plum wash with fine crumbling edge fissures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Floating shadow particulate dust, fine crumbling ledge micro-chips, and faint cold violet aura specks, semi-transparent seamless overlay"
    },
    {
        "family": "settlement_floor",
        "subject": "bustling Jianghu market square pavement of hand-hewn river stones, packed earth, and straw",
        "palette": "#b6a57a base, #a49468 accent, warm cobbled tan and weathered earth brown",
        "variation_m1": "Dense wuxia Shan Shui ink wash town cobblestone on ancient Xuan paper, smooth river pebbles and packed market earth textures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tidy wuxia Shan Shui village lane on ancient Xuan paper, broad calm stone pavement wash with clean peaceful layout, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui market floor on ancient Xuan paper, cobbled ground with two darker cart-wheel dirt depression patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sun-warmed wuxia Shan Shui town plaza on ancient Xuan paper, pale warm sandy cobblestone wash with fine mortar lines, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Worn stone bevel highlights, dried straw mulch flecks, and fine street sand granules, semi-transparent seamless overlay"
    },
    {
        "family": "ocean",
        "subject": "vast boundless open sea with rhythmic gentle swells, deep sapphire water, and sea foam ribbons",
        "palette": "#2f5e84 base, #4f86ab accent, deep sapphire blue and crested sea foam cerulean",
        "variation_m1": "Dense wuxia Shan Shui ink wash deep ocean on ancient Xuan paper, layered rhythmic sea swells and delicate foam crests, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse tranquil wuxia Shan Shui open sea on ancient Xuan paper, serene expansive deep blue water wash with glassy calm, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui coastal sea on ancient Xuan paper, rich sapphire waters with two darker deep-current eddy patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sunlit wuxia Shan Shui ocean surface on ancient Xuan paper, bright sky-reflecting blue wash with fine ripple strokes, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Delicate whitecap foam tracery, floating salt spray droplets, and shimmering wave ripple filaments, semi-transparent seamless overlay"
    },
    {
        "family": "river",
        "subject": "flowing freshwater mountain river with gentle directional currents and clear pebble beds",
        "palette": "#4a86a6 base, #6fa8c0 accent, crystalline river blue and gentle foam turquoise",
        "variation_m1": "Dense wuxia Shan Shui ink wash flowing river on ancient Xuan paper, smooth directional current streamlines and soft eddies, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse calm wuxia Shan Shui river reach on ancient Xuan paper, wide peaceful flowing water wash with gentle laminar gradients, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui river surface on ancient Xuan paper, clear water wash with two darker deep pool eddy patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sparkling wuxia Shan Shui stream on ancient Xuan paper, pale translucent water wash with delicate ripple highlights, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Fine directional streamline threads, tiny water bubble clusters, and crystalline surface glint specks, semi-transparent seamless overlay"
    },
    {
        "family": "lake",
        "subject": "peaceful mirror lake surface with quiet ripples, water lily shadows, and deep jade clarity",
        "palette": "#3f7f8f base, #6aa3a6 accent, deep mirror jade and tranquil lake turquoise",
        "variation_m1": "Dense wuxia Shan Shui ink wash tranquil lake on ancient Xuan paper, soft concentric water rings and deep jade hues, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse pristine wuxia Shan Shui mirror lake on ancient Xuan paper, perfectly still expanse of serene jade-blue water, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui mountain lake on ancient Xuan paper, jade water surface with two darker deep spring upwelling patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter morning wuxia Shan Shui misty lake on ancient Xuan paper, pale silvery aquamarine wash with delicate surface shimmer, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Faint concentric water ripple rings, microscopic floating pollen grains, and subtle depth reflections, semi-transparent seamless overlay"
    },
    {
        "family": "cliff",
        "subject": "sheer vertical cliff rock face viewed top-down with jagged layered strata and lichens",
        "palette": "#5d6064 base, #7a756b accent, steep slate grey and rugged mountain lichen brown",
        "variation_m1": "Dense wuxia Shan Shui ink wash sheer cliff on ancient Xuan paper, tightly stepped rock layers and sharp geological edges, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse monumental wuxia Shan Shui cliff precipice on ancient Xuan paper, massive flat stone slab wash with clean drops, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui mountain bluff on ancient Xuan paper, weathered rock face with two darker damp mossy crevice patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter sun-bleached wuxia Shan Shui precipice on ancient Xuan paper, pale granite face wash with fine vertical strata lines, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Vertical rock striation grooves, fine shale chipping dust, and hardy cliff lichen speckles, semi-transparent seamless overlay"
    },
    {
        "family": "glacier",
        "subject": "ancient compacted blue glacier mass with deep pressure seracs, moraine grit, and ice blue veins",
        "palette": "#9cc4da base, #d6e9f3 accent, dense glacial blue and frosted crystalline silver",
        "variation_m1": "Dense wuxia Shan Shui ink wash ancient glacier on ancient Xuan paper, dense compacted ice flows and blue pressure fissures, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m2": "Sparse massive wuxia Shan Shui ice field on ancient Xuan paper, sweeping smooth glacial blue wash with vast stillness, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m3": "Patchy wuxia Shan Shui glacial tongue on ancient Xuan paper, ice blue expanse with two darker moraine gravel dust patches, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "variation_m4": "Lighter luminous wuxia Shan Shui high glacier on ancient Xuan paper, pale radiant frost-blue wash with delicate crystalline veins, seamless tileable top-down orthographic view, no trees, no characters, no borders",
        "detail": "Deep glacial blue vein fissures, frozen pressure micro-bubbles, and fine rock-flour dusting, semi-transparent seamless overlay"
    }
]

with open("docs/ground_prompts_v11.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["family", "subject", "palette", "variation_m1", "variation_m2", "variation_m3", "variation_m4", "detail"])
    for row in families:
        writer.writerow([
            row["family"],
            row["subject"],
            row["palette"],
            row["variation_m1"],
            row["variation_m2"],
            row["variation_m3"],
            row["variation_m4"],
            row["detail"]
        ])

print(f"Successfully generated docs/ground_prompts_v11.csv with {len(families)} families.")
