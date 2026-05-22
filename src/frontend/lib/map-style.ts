export const typeDotPresets: Record<string, string> = {
  glempingi: "islands#darkGreenDotIcon",
  "gostevye-doma": "islands#blueDotIcon",
  bani: "islands#redDotIcon",
  kottedzhi: "islands#orangeDotIcon",
  "bazy-otdykha": "islands#violetDotIcon",
  "park-oteli": "islands#darkOrangeDotIcon",
};

export const typeStretchyPresets: Record<string, string> = {
  glempingi: "islands#darkGreenStretchyIcon",
  "gostevye-doma": "islands#blueStretchyIcon",
  bani: "islands#redStretchyIcon",
  kottedzhi: "islands#orangeStretchyIcon",
  "bazy-otdykha": "islands#violetStretchyIcon",
  "park-oteli": "islands#darkOrangeStretchyIcon",
};

export const typeClusterPresets: Record<string, string> = {
  glempingi: "islands#invertedDarkGreenClusterIcons",
  "gostevye-doma": "islands#invertedBlueClusterIcons",
  bani: "islands#invertedRedClusterIcons",
  kottedzhi: "islands#invertedOrangeClusterIcons",
  "bazy-otdykha": "islands#invertedVioletClusterIcons",
  "park-oteli": "islands#invertedDarkOrangeClusterIcons",
};

export function getMarkerPreset(typeSlug: string, withText = false) {
  return withText
    ? typeStretchyPresets[typeSlug] || "islands#blueStretchyIcon"
    : typeDotPresets[typeSlug] || "islands#blueDotIcon";
}

function getDominantTypeSlug(geoObjects: any[]) {
  const counts = new Map<string, number>();
  for (const geoObject of geoObjects) {
    const slug = geoObject?.__typeSlug;
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }

  let dominantSlug: string | null = null;
  let dominantCount = 0;
  counts.forEach((count, slug) => {
    if (count > dominantCount) {
      dominantSlug = slug;
      dominantCount = count;
    }
  });
  return dominantSlug;
}

export function getClusterPreset(geoObjects: any[]) {
  const slug = getDominantTypeSlug(geoObjects);
  return slug ? typeClusterPresets[slug] || "islands#invertedBlueClusterIcons" : "islands#invertedBlueClusterIcons";
}

export function makeTypeAwareClusterer(ymaps: any, options: Record<string, unknown>) {
  const clusterer = new ymaps.Clusterer({
    preset: "islands#invertedBlueClusterIcons",
    ...options,
  });

  const defaultCreateCluster = clusterer.createCluster;
  clusterer.createCluster = function createCluster(center: number[], geoObjects: any[]) {
    const cluster = defaultCreateCluster.call(this, center, geoObjects);
    cluster.options.set("preset", getClusterPreset(geoObjects));
    return cluster;
  };

  return clusterer;
}

export function makeTypeClusterer(ymaps: any, typeSlug: string, options: Record<string, unknown>) {
  return new ymaps.Clusterer({
    preset: typeClusterPresets[typeSlug] || "islands#invertedBlueClusterIcons",
    ...options,
  });
}
