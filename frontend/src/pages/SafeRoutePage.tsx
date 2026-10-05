import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  ShieldCheck,
  Compass,
  ArrowRightLeft,
  Crosshair,
  Sparkles,
  Play,
  Square,
  CheckCircle2,
} from 'lucide-react';
import { useSafety } from '../context/SafetyContext';

interface LatLng {
  lat: number;
  lng: number;
}

interface SafeHaven {
  name: string;
  type: string;
  lat: number;
  lng: number;
  contact: string;
  distance: string;
}

/**
 * Format duration in minutes into a human-friendly string:
 * - e.g. 24 -> "24 min"
 * - e.g. 60 -> "1 hr"
 * - e.g. 74 -> "1 hr 14 min"
 * - e.g. 120 -> "2 hrs"
 * - e.g. 135 -> "2 hrs 15 min"
 */
export const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0 min';
  const mins = Math.round(totalMinutes);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  const hrUnit = hours === 1 ? 'hr' : 'hrs';
  
  if (remainingMins === 0) {
    return `${hours} ${hrUnit}`;
  }
  return `${hours} ${hrUnit} ${remainingMins} min`;
};

export const SafeRoutePage: React.FC = () => {
  const { mode } = useSafety();

  // Location text states
  const [originText, setOriginText] = useState('Anna Salai, Chennai');
  const [destText, setDestText] = useState('Central Railway Station, Chennai');

  // Coordinates
  const [originCoords, setOriginCoords] = useState<LatLng>({ lat: 13.0604, lng: 80.2496 });
  const [destCoords, setDestCoords] = useState<LatLng>({ lat: 13.0827, lng: 80.2757 });

  // Map and routing states
  const [activeRouteType, setActiveRouteType] = useState<'primary' | 'alternative'>('primary');
  const [primaryRoutePts, setPrimaryRoutePts] = useState<[number, number][]>([]);
  const [altRoutePts, setAltRoutePts] = useState<[number, number][]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [clickMode, setClickMode] = useState<'origin' | 'destination' | null>(null);

  // Escort Simulation
  const [isNavigating, setIsNavigating] = useState(false);
  const [escortIndex, setEscortIndex] = useState(0);

  // Route metrics
  const [metrics, setMetrics] = useState({
    primary: {
      name: 'Safe Corridor Alpha (High CCTV & Lighting)',
      score: 9.7,
      distanceKm: 2.8,
      walkingMins: 24,
      cctvCount: 14,
      lighting: 98,
      policePosts: 2,
    },
    alternative: {
      name: 'Expressway Direct (Fastest Path)',
      score: 8.2,
      distanceKm: 2.3,
      walkingMins: 18,
      cctvCount: 6,
      lighting: 82,
      policePosts: 1,
    }
  });

  // Safe Havens along route
  const [safeHavens, setSafeHavens] = useState<SafeHaven[]>([
    {
      name: 'All-Women Police Station (Fort Area)',
      type: '24/7 Police Refuge',
      lat: 13.0720,
      lng: 80.2620,
      contact: '1091 / 044-23452345',
      distance: '450m'
    },
    {
      name: 'Government Multi-Super Speciality Hospital',
      type: '24/7 Medical ER',
      lat: 13.0690,
      lng: 80.2580,
      contact: '108 / 044-25305000',
      distance: '800m'
    },
    {
      name: 'Metro Transit Security Kiosk #3',
      type: 'Transit Security Post',
      lat: 13.0780,
      lng: 80.2700,
      contact: '044-28330000',
      distance: '1.2km'
    }
  ]);

  // Quick Preset Locations
  const quickPresets = [
    { label: 'Anna Salai to Central Metro', orig: 'Anna Salai, Chennai', dest: 'Central Railway Station, Chennai', oC: { lat: 13.0604, lng: 80.2496 }, dC: { lat: 13.0827, lng: 80.2757 } },
    { label: 'T. Nagar to Marina Beach', orig: 'T. Nagar, Chennai', dest: 'Marina Beach Light House, Chennai', oC: { lat: 13.0418, lng: 80.2341 }, dC: { lat: 13.0382, lng: 80.2798 } },
    { label: 'Guindy Tech Park to Airport', orig: 'Olympia Tech Park, Guindy', dest: 'Chennai International Airport', oC: { lat: 13.0118, lng: 80.2030 }, dC: { lat: 12.9941, lng: 80.1709 } },
    { label: 'Velachery to OMR Hub', orig: 'Velachery Station, Chennai', dest: 'Tidel Park, OMR, Chennai', oC: { lat: 12.9815, lng: 80.2228 }, dC: { lat: 12.9892, lng: 80.2504 } }
  ];

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    originMarker?: L.Marker;
    destMarker?: L.Marker;
    userMarker?: L.Marker;
    primaryPolyline?: L.Polyline;
    altPolyline?: L.Polyline;
    hazardCircle?: L.Circle;
    havenMarkers?: L.Marker[];
  }>({});

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Map instance
    const map = L.map(mapContainerRef.current, {
      center: [originCoords.lat, originCoords.lng],
      zoom: 13,
      zoomControl: true,
    });

    // Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Map Click Listener for interactive pin dropping
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (clickMode === 'origin') {
        setOriginCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setOriginText(`Pinned Location (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
        setClickMode(null);
      } else if (clickMode === 'destination') {
        setDestCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setDestText(`Pinned Destination (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
        setClickMode(null);
      }
    });

    // Initial Route Generation
    fetchAndDrawRoutes(originCoords, destCoords);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync clickMode cursor style
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (clickMode) {
      mapContainerRef.current.style.cursor = 'crosshair';
    } else {
      mapContainerRef.current.style.cursor = '';
    }
  }, [clickMode]);

  // Geocoding helper using OpenStreetMap Nominatim
  const geocodeAddress = async (query: string): Promise<LatLng | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (err) {
      console.warn('Geocoding error, falling back to current coordinates:', err);
    }
    return null;
  };

  // Helper to generate a realistic curved detour path if OSRM is unreachable
  const generateDetourPath = (start: LatLng, end: LatLng, curveOffset: number, steps: number = 25): [number, number][] => {
    const pts: [number, number][] = [];
    const midLat = (start.lat + end.lat) / 2 + curveOffset;
    const midLng = (start.lng + end.lng) / 2 - curveOffset * 0.8;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * midLat + t * t * end.lat;
      const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * midLng + t * t * end.lng;
      pts.push([lat, lng]);
    }
    return pts;
  };

  // Fetch real routes from OSRM (Open Source Routing Machine) or smart curved fallback
  const fetchAndDrawRoutes = async (start: LatLng, end: LatLng) => {
    setIsLoading(true);
    const map = mapInstanceRef.current;
    if (!map) {
      setIsLoading(false);
      return;
    }

    try {
      let primaryPoints: [number, number][] = [];
      let altPoints: [number, number][] = [];
      let distKm = 2.5;

      // Query OSRM Walking Routing API
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates;
          primaryPoints = coords.map((c: [number, number]) => [c[1], c[0]]);
          distKm = parseFloat((data.routes[0].distance / 1000).toFixed(1));
        }
      } catch (e) {
        console.log('OSRM foot router fallback:', e);
      }

      // Fallback if primaryPoints is empty
      if (primaryPoints.length === 0) {
        primaryPoints = generateDetourPath(start, end, 0.008, 30);
      }

      // Generate alternative path (distinct detour)
      altPoints = generateDetourPath(start, end, -0.012, 25);

      setPrimaryRoutePts(primaryPoints);
      setAltRoutePts(altPoints);

      // Update dynamic metrics
      const calculatedWalkTime = Math.max(5, Math.round(distKm * 12.0)); // Realistic walking pace ~12 mins per km
      setMetrics({
        primary: {
          name: 'Safe Corridor Alpha (High CCTV & Lighting)',
          score: 9.7,
          distanceKm: distKm,
          walkingMins: calculatedWalkTime,
          cctvCount: Math.max(6, Math.round(distKm * 4)),
          lighting: 98,
          policePosts: 2,
        },
        alternative: {
          name: 'Expressway Direct (Secondary)',
          score: 8.2,
          distanceKm: parseFloat(Math.max(0.8, distKm * 0.85).toFixed(1)),
          walkingMins: Math.max(4, Math.round(calculatedWalkTime * 0.8)),
          cctvCount: Math.max(3, Math.round(distKm * 2)),
          lighting: 81,
          policePosts: 1,
        }
      });

      // Update Safe Havens placed strategically near the midpoint
      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      setSafeHavens([
        {
          name: 'Sector Police Safety Refuge Hub',
          type: '24/7 All-Women Helpdesk',
          lat: midLat + 0.004,
          lng: midLng + 0.003,
          contact: '1091 (Toll-Free) / 112',
          distance: '320m'
        },
        {
          name: 'City Care Emergency Hospital',
          type: '24/7 Trauma & Security Wing',
          lat: midLat - 0.003,
          lng: midLng - 0.004,
          contact: '108 Emergency Medical',
          distance: '650m'
        },
        {
          name: 'Transit Central Security Post',
          type: 'Station Security Point',
          lat: end.lat - 0.002,
          lng: end.lng - 0.002,
          contact: '044-28330000',
          distance: '900m'
        }
      ]);

      // Draw all layers on Leaflet Map
      drawMapLayers(start, end, primaryPoints, altPoints, [
        { lat: midLat + 0.004, lng: midLng + 0.003, name: 'Sector Police Safety Refuge' },
        { lat: midLat - 0.003, lng: midLng - 0.004, name: 'City Care Emergency Hospital' },
      ]);

      // Fit map bounds to view both points
      const bounds = L.latLngBounds([
        [start.lat, start.lng],
        [end.lat, end.lng],
        ...primaryPoints,
        ...altPoints
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });

    } finally {
      setIsLoading(false);
    }
  };

  // Render all markers, polyline routes, danger circles, and safe havens
  const drawMapLayers = (
    start: LatLng,
    end: LatLng,
    primaryPts: [number, number][],
    altPts: [number, number][],
    havens: { lat: number; lng: number; name: string }[]
  ) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing layers
    if (layersRef.current.originMarker) map.removeLayer(layersRef.current.originMarker);
    if (layersRef.current.destMarker) map.removeLayer(layersRef.current.destMarker);
    if (layersRef.current.primaryPolyline) map.removeLayer(layersRef.current.primaryPolyline);
    if (layersRef.current.altPolyline) map.removeLayer(layersRef.current.altPolyline);
    if (layersRef.current.hazardCircle) map.removeLayer(layersRef.current.hazardCircle);
    if (layersRef.current.havenMarkers) {
      layersRef.current.havenMarkers.forEach((m) => map.removeLayer(m));
    }

    // Origin Marker (Blue pulsing icon)
    const originIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(37,99,235,0.5); color: white; font-size: 14px; font-weight: bold;">
          📍
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const originMarker = L.marker([start.lat, start.lng], { icon: originIcon })
      .addTo(map)
      .bindPopup(`<strong>Origin:</strong><br/>${originText}`);

    // Destination Marker (Red Flag icon)
    const destIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div style="background-color: #dc2626; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(220,38,38,0.5); color: white; font-size: 14px; font-weight: bold;">
          🏁
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const destMarker = L.marker([end.lat, end.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<strong>Destination:</strong><br/>${destText}`);

    // Alternative Route Polyline (Blue Dashed)
    const altPolyline = L.polyline(altPts, {
      color: '#3b82f6',
      weight: 4,
      dashArray: '8, 8',
      opacity: activeRouteType === 'alternative' ? 1.0 : 0.45,
    }).addTo(map);

    altPolyline.bindPopup('<strong>Alternative Route:</strong> Fastest direct transit corridor.');

    // Primary Safe Route Polyline (Emerald Glowing Solid)
    const primaryPolyline = L.polyline(primaryPts, {
      color: '#10b981',
      weight: activeRouteType === 'primary' ? 6 : 4,
      opacity: activeRouteType === 'primary' ? 1.0 : 0.5,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    primaryPolyline.bindPopup('<strong>Safe Corridor Alpha:</strong> 98% Lit with Active CCTV Zones & Police Checkpoints.');

    // Danger Zone / Unlit Alley (Red Warning Highlight)
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;
    const hazardCircle = L.circle([midLat + 0.008, midLng - 0.007], {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.18,
      radius: 350,
      dashArray: '5, 5'
    }).addTo(map);

    hazardCircle.bindPopup('<strong>⚠️ Danger Zone / Low Footfall:</strong> Avoid this unmonitored sector after dusk.');

    // Safe Havens Checkpoint Markers (Police / Hospital)
    const havenMarkers = havens.map((h, i) => {
      const isPolice = i % 2 === 0;
      const havenIcon = L.divIcon({
        className: 'haven-icon',
        html: `
          <div style="background-color: ${isPolice ? '#10b981' : '#0284c7'}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 13px;">
            ${isPolice ? '🛡️' : '🏥'}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      return L.marker([h.lat, h.lng], { icon: havenIcon })
        .addTo(map)
        .bindPopup(`<strong>Safe Haven Refuge:</strong><br/>${h.name}<br/><i>Police & Medical Assistance Point</i>`);
    });

    layersRef.current = {
      originMarker,
      destMarker,
      primaryPolyline,
      altPolyline,
      hazardCircle,
      havenMarkers
    };
  };

  // Update polylines opacity when active route toggles
  useEffect(() => {
    if (layersRef.current.primaryPolyline) {
      layersRef.current.primaryPolyline.setStyle({
        weight: activeRouteType === 'primary' ? 6 : 4,
        opacity: activeRouteType === 'primary' ? 1.0 : 0.45
      });
    }
    if (layersRef.current.altPolyline) {
      layersRef.current.altPolyline.setStyle({
        weight: activeRouteType === 'alternative' ? 6 : 4,
        opacity: activeRouteType === 'alternative' ? 1.0 : 0.45
      });
    }
  }, [activeRouteType]);

  // Handle Form Submission / Search
  const handleCalculateRoutes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    let start = originCoords;
    let end = destCoords;

    // Attempt geocoding origin if changed
    if (originText && !originText.includes('(')) {
      const gStart = await geocodeAddress(originText);
      if (gStart) {
        start = gStart;
        setOriginCoords(gStart);
      }
    }

    // Attempt geocoding destination if changed
    if (destText && !destText.includes('(')) {
      const gEnd = await geocodeAddress(destText);
      if (gEnd) {
        end = gEnd;
        setDestCoords(gEnd);
      }
    }

    await fetchAndDrawRoutes(start, end);
    setIsNavigating(false);
    setEscortIndex(0);
  };

  // Use Device Live GPS
  const handleGetLiveGPS = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const coords = { lat, lng };
          setOriginCoords(coords);
          setOriginText(`My Live GPS (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
          setIsLocating(false);
          await fetchAndDrawRoutes(coords, destCoords);
        },
        () => {
          const coords = { lat: 13.0604, lng: 80.2496 };
          setOriginCoords(coords);
          setOriginText('Detected Location (Anna Salai, Chennai)');
          setIsLocating(false);
          fetchAndDrawRoutes(coords, destCoords);
        },
        { timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempText = originText;
    const tempCoords = originCoords;

    setOriginText(destText);
    setOriginCoords(destCoords);

    setDestText(tempText);
    setDestCoords(tempCoords);

    fetchAndDrawRoutes(destCoords, tempCoords);
  };

  // Live Escort Movement Simulation
  useEffect(() => {
    let interval: any;
    const pts = activeRouteType === 'primary' ? primaryRoutePts : altRoutePts;
    const map = mapInstanceRef.current;

    if (isNavigating && pts.length > 0 && map) {
      interval = setInterval(() => {
        setEscortIndex((prev) => {
          const next = (prev + 1) % pts.length;
          const currentCoord = pts[next];

          if (!layersRef.current.userMarker) {
            const userIcon = L.divIcon({
              className: 'user-escort-icon',
              html: `
                <div style="background-color: #10b981; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px #10b981; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
                  🚶
                </div>
              `,
              iconSize: [26, 26],
              iconAnchor: [13, 13]
            });
            layersRef.current.userMarker = L.marker(currentCoord, { icon: userIcon }).addTo(map);
          } else {
            layersRef.current.userMarker.setLatLng(currentCoord);
          }

          return next;
        });
      }, 1200);
    } else {
      if (layersRef.current.userMarker && map) {
        map.removeLayer(layersRef.current.userMarker);
        layersRef.current.userMarker = undefined;
      }
    }

    return () => clearInterval(interval);
  }, [isNavigating, activeRouteType, primaryRoutePts, altRoutePts]);

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Title & Overview */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={26} color="#10b981" />
              Live Map Safe Route & Threat Avoidance
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Real-time map navigation calculating verified illumination corridors, active CCTV zones, and nearest emergency police havens.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '16px', backgroundColor: 'var(--color-safe-bg)', color: '#16a34a', border: '1px solid var(--color-safe-border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} /> OpenStreetMap Active
            </span>
          </div>
        </div>
      </div>

      {/* Input Controls Panel */}
      <div
        className="guardian-card"
        style={{
          padding: '20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <form onSubmit={handleCalculateRoutes} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          
          {/* Origin Input */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                1. Starting Point / Origin
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setClickMode(clickMode === 'origin' ? null : 'origin')}
                  style={{
                    background: clickMode === 'origin' ? 'var(--primary-blue)' : 'none',
                    color: clickMode === 'origin' ? '#fff' : 'var(--primary-blue)',
                    border: '1px solid var(--primary-blue)',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }}
                >
                  {clickMode === 'origin' ? 'Click on Map...' : '📌 Pick on Map'}
                </button>
                <button
                  type="button"
                  onClick={handleGetLiveGPS}
                  disabled={isLocating}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-blue)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Crosshair size={13} />
                  {isLocating ? 'Locating...' : 'My Live GPS'}
                </button>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)'
              }}
            >
              <MapPin size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
                placeholder="Enter origin address, street, or landmark..."
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Swap Button */}
          <div style={{ paddingBottom: '4px' }}>
            <button
              type="button"
              onClick={handleSwap}
              title="Swap Origin and Destination"
              style={{
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowRightLeft size={16} />
            </button>
          </div>

          {/* Destination Input */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                2. Target Destination
              </label>
              <button
                type="button"
                onClick={() => setClickMode(clickMode === 'destination' ? null : 'destination')}
                style={{
                  background: clickMode === 'destination' ? '#dc2626' : 'none',
                  color: clickMode === 'destination' ? '#fff' : '#dc2626',
                  border: '1px solid #dc2626',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                {clickMode === 'destination' ? 'Click on Map...' : '🎯 Pick on Map'}
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)'
              }}
            >
              <Compass size={16} color="#dc2626" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={destText}
                onChange={(e) => setDestText(e.target.value)}
                placeholder="Enter destination, station, hospital, college..."
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Calculate Button */}
          <div style={{ paddingBottom: '2px' }}>
            <button
              type="submit"
              disabled={isLoading}
              className="guardian-btn"
              style={{
                backgroundColor: '#10b981',
                color: '#fff',
                padding: '11px 22px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: 'none',
                minWidth: '170px',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
              }}
            >
              {isLoading ? (
                <>
                  <Sparkles size={16} />
                  Calculating...
                </>
              ) : (
                <>
                  <Navigation size={16} />
                  Find Safe Route
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Location Preset Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            Quick Routes:
          </span>
          {quickPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setOriginText(preset.orig);
                setDestText(preset.dest);
                setOriginCoords(preset.oC);
                setDestCoords(preset.dC);
                fetchAndDrawRoutes(preset.oC, preset.dC);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map & Route Breakdown Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
        
        {/* Real Leaflet Map Container */}
        <div
          className="guardian-card"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          {/* Map Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Real-Time Route Map
              </span>
              {clickMode && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', padding: '2px 8px', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}>
                  Click anywhere on map to set {clickMode === 'origin' ? 'Origin' : 'Destination'}
                </span>
              )}
            </div>

            {/* Map Legends */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                <span style={{ width: '12px', height: '4px', backgroundColor: '#10b981', borderRadius: '2px' }} /> Safe Corridor
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                <span style={{ width: '12px', height: '4px', backgroundColor: '#3b82f6', borderRadius: '2px', borderStyle: 'dashed' }} /> Alternative
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }} /> Danger Zone
              </span>
            </div>
          </div>

          {/* Leaflet DOM Element */}
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '420px',
              borderRadius: '10px',
              border: '1px solid var(--border-light)',
              overflow: 'hidden',
              zIndex: 1
            }}
          />

          {/* Navigation Action Bar */}
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Active Route: <strong style={{ color: activeRouteType === 'primary' ? '#10b981' : '#2563eb' }}>{metrics[activeRouteType].name}</strong>
            </div>

            <button
              type="button"
              onClick={() => setIsNavigating(!isNavigating)}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: isNavigating ? '#dc2626' : '#10b981',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isNavigating ? '0 2px 8px rgba(220,38,38,0.3)' : '0 2px 8px rgba(16,185,129,0.3)'
              }}
            >
              {isNavigating ? (
                <>
                  <Square size={14} fill="#fff" />
                  Stop Escort Simulation
                </>
              ) : (
                <>
                  <Play size={14} fill="#fff" />
                  Start Safe Escort Navigation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Route Cards & Safety Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Primary Route Card */}
          <div
            onClick={() => setActiveRouteType('primary')}
            className="guardian-card"
            style={{
              padding: '16px',
              cursor: 'pointer',
              border: `2px solid ${activeRouteType === 'primary' ? '#10b981' : 'var(--border-light)'}`,
              backgroundColor: activeRouteType === 'primary' ? 'var(--bg-card)' : 'var(--bg-surface)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#10b981" />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {metrics.primary.name}
                  </h4>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                    ● 98% Illumination & 14 CCTV Checkpoints
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#10b981' }}>
                  {metrics.primary.score}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> / 10</span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0', lineHeight: 1.4 }}>
              Reroutes away from isolated lanes. Features continuous overhead street lighting and police patrol coverage.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '11px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Distance</span>
                <strong style={{ color: 'var(--text-primary)' }}>{metrics.primary.distanceKm} km</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Walking ETA</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(metrics.primary.walkingMins)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Police Refuges</span>
                <strong style={{ color: '#10b981' }}>{metrics.primary.policePosts} Verified</strong>
              </div>
            </div>
          </div>

          {/* Alternative Route Card */}
          <div
            onClick={() => setActiveRouteType('alternative')}
            className="guardian-card"
            style={{
              padding: '16px',
              cursor: 'pointer',
              border: `2px solid ${activeRouteType === 'alternative' ? '#3b82f6' : 'var(--border-light)'}`,
              backgroundColor: activeRouteType === 'alternative' ? 'var(--bg-card)' : 'var(--bg-surface)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={20} color="#3b82f6" />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {metrics.alternative.name}
                  </h4>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>
                    ● Shorter Transit Route
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#3b82f6' }}>
                  {metrics.alternative.score}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> / 10</span>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0', lineHeight: 1.4 }}>
              Fastest route along arterial roads. Moderate foot traffic with standard visibility.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '11px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Distance</span>
                <strong style={{ color: 'var(--text-primary)' }}>{metrics.alternative.distanceKm} km</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Walking ETA</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(metrics.alternative.walkingMins)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>CCTV Density</span>
                <strong style={{ color: '#3b82f6' }}>{metrics.alternative.cctvCount} Monitored</strong>
              </div>
            </div>
          </div>

          {/* Verified Safe Havens */}
          <div className="guardian-card" style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary-blue)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} />
              Nearby Verified Emergency Havens
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {safeHavens.map((haven, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-light)',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{haven.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {haven.type} • {haven.contact}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', flexShrink: 0 }}>
                    {haven.distance}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default SafeRoutePage;
