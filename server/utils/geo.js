function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGeoPoint(latInput, lngInput) {
  const lat = toNumber(latInput);
  const lng = toNumber(lngInput);

  if (lat === null || lng === null) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

function parseMapLink(mapLink) {
  if (!mapLink || typeof mapLink !== "string") {
    return null;
  }

  const decodedLink = decodeURIComponent(mapLink.trim());
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]destination=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = decodedLink.match(pattern);
    if (!match) {
      continue;
    }

    const point = normalizeGeoPoint(match[1], match[2]);
    if (point) {
      return point;
    }
  }

  return null;
}

function haversineDistanceKm(pointA, pointB) {
  if (!pointA || !pointB) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLng = toRadians(pointB.lng - pointA.lng);
  const latA = toRadians(pointA.lat);
  const latB = toRadians(pointB.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

function getDistanceScore(distanceKm) {
  if (distanceKm === null) {
    return 0.55;
  }

  if (distanceKm <= 5) {
    return 1;
  }

  if (distanceKm <= 15) {
    return 0.86;
  }

  if (distanceKm <= 30) {
    return 0.72;
  }

  if (distanceKm <= 60) {
    return 0.5;
  }

  if (distanceKm <= 120) {
    return 0.3;
  }

  return 0.12;
}

module.exports = {
  getDistanceScore,
  haversineDistanceKm,
  normalizeGeoPoint,
  parseMapLink,
  toNumber,
};
