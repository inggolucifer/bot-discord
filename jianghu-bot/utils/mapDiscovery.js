const locationKey = (regionSlug, settlementName) => `${regionSlug}|${settlementName}`;

const markArrived = (player, regionSlug, settlementName) => {
  const key = locationKey(regionSlug, settlementName);

  if (!player.discoveredLocations.includes(key)) {
    player.discoveredLocations.push(key);
  }

  if (!player.discoveredRegions.includes(regionSlug)) {
    player.discoveredRegions.push(regionSlug);
  }
};

module.exports = {
  locationKey,
  markArrived
};
