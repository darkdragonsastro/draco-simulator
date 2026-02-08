// API Client for Draco Simulator Backend

const API_BASE = '/api/v1';

export interface ApiError {
  error: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Game API
export const gameApi = {
  getProgress: () => api.get<PlayerProgress>('/game/progress'),
  resetProgress: () => api.post<void>('/game/progress/reset'),
  getTutorials: () => api.get<Tutorial[]>('/game/tutorials'),
  startTutorial: (id: string) => api.post<TutorialStatus>(`/game/tutorials/${id}/start`),
  completeTutorial: (id: string) => api.post<TutorialReward>(`/game/tutorials/${id}/complete`),
  getChallenges: () => api.get<Challenge[]>('/game/challenges'),
  getAvailableChallenges: () => api.get<Challenge[]>('/game/challenges/available'),
  startChallenge: (id: string) => api.post<ChallengeStatus>(`/game/challenges/${id}/start`),
  getAchievements: () => api.get<Achievement[]>('/game/achievements'),
  getUnlockedAchievements: () => api.get<Achievement[]>('/game/achievements/unlocked'),
  getStore: () => api.get<StoreInventory>('/game/store'),
  purchaseEquipment: (id: string) => api.post<PurchaseResult>(`/game/store/purchase/${id}`),
  getOwnedEquipment: () => api.get<Equipment[]>('/game/equipment/owned'),
  getLoadout: () => api.get<Loadout>('/game/loadout'),
  setLoadout: (loadoutId: string) => api.put<void>('/game/loadout', { loadout_id: loadoutId }),
  getLeaderboard: () => api.get<LeaderboardEntry[]>('/game/leaderboard'),
  scoreImage: (metrics: ImageMetrics) => api.post<ImageScore>('/game/score', metrics),
};

// Catalog API
export const catalogApi = {
  searchStars: (params: StarSearchParams) => {
    const query = new URLSearchParams({
      ra: params.ra.toString(),
      dec: params.dec.toString(),
      radius: (params.radius ?? 1).toString(),
      limit: (params.limit ?? 100).toString(),
      min_mag: (params.minMag ?? -2).toString(),
      max_mag: (params.maxMag ?? 12).toString(),
    });
    return api.get<StarSearchResult>(`/catalog/stars?${query}`);
  },
  getStar: (id: number) => api.get<Star>(`/catalog/stars/${id}`),
  searchDSO: (params: DSOSearchParams) => {
    const query = new URLSearchParams();
    if (params.name) query.set('name', params.name);
    if (params.type) query.set('type', params.type);
    if (params.ra !== undefined) query.set('ra', params.ra.toString());
    if (params.dec !== undefined) query.set('dec', params.dec.toString());
    if (params.radius) query.set('radius', params.radius.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return api.get<DSOSearchResult>(`/catalog/dso?${query}`);
  },
  getDSO: (id: string) => api.get<DeepSkyObject>(`/catalog/dso/${id}`),
  getMessierCatalog: () => api.get<DSOSearchResult>('/catalog/dso/messier'),
  getVisibleObjects: (params?: VisibleObjectsParams) => {
    const query = new URLSearchParams();
    if (params?.minAlt) query.set('min_alt', params.minAlt.toString());
    if (params?.maxMag) query.set('max_mag', params.maxMag.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return api.get<VisibleObjectsResult>(`/catalog/visible?${query}`);
  },
  suggestTargets: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<TargetSuggestions>(`/catalog/suggest${query}`);
  },
};

// Sky API
export const skyApi = {
  getConditions: () => api.get<SkyConditions>('/sky/conditions'),
  setConditions: (conditions: Partial<SkyConditions>) =>
    api.put<SkyConditions>('/sky/conditions', conditions),
  getTime: () => api.get<SkyTime>('/sky/time'),
  setTime: (time: SetTimeParams) => api.put<SkyTime>('/sky/time', time),
  getLocation: () => api.get<Location>('/sky/location'),
  setLocation: (location: Partial<Location>) => api.put<Location>('/sky/location', location),
  getTwilight: () => api.get<TwilightInfo>('/sky/twilight'),
  getMoon: () => api.get<MoonInfo>('/sky/moon'),
  getSun: () => api.get<SunInfo>('/sky/sun'),
};

// Device API
export const deviceApi = {
  // Profiles
  listProfiles: () => api.get<ProfileListResponse>('/devices/profiles'),
  getActiveProfile: () => api.get<EquipmentProfile>('/devices/profiles/active'),
  setActiveProfile: (id: string) => api.put<EquipmentProfile>(`/devices/profiles/active/${id}`),
  getProfile: (id: string) => api.get<EquipmentProfile>(`/devices/profiles/${id}`),
  createProfile: (profile: Partial<EquipmentProfile>) => api.post<EquipmentProfile>('/devices/profiles', profile),
  updateProfile: (id: string, profile: Partial<EquipmentProfile>) => api.put<EquipmentProfile>(`/devices/profiles/${id}`, profile),
  deleteProfile: (id: string) => api.delete<void>(`/devices/profiles/${id}`),

  // Discovery
  discoverAll: () => api.get<DiscoveryResult>('/devices/discover'),
  discoverINDI: (serverAddress?: string) => api.post<INDIDiscoveryResult>('/devices/discover/indi', { server_address: serverAddress }),
  discoverAlpaca: (baseURL?: string) => api.post<AlpacaDiscoveryResult>('/devices/discover/alpaca', { base_url: baseURL }),
  testConnection: (device: DeviceProfile) => api.post<ConnectionTestResult>('/devices/test-connection', { device }),

  // Mode
  getMode: () => api.get<ModeInfo>('/devices/mode'),
};

// Types
export interface PlayerProgress {
  level: number;
  xp: number;
  xp_to_next_level: number;
  tier: string;
  credits: number;
  total_exposure_time: number;
  total_images: number;
  unlocked_achievements: string[];
  achievement_progress: number;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  steps: string[];
  xp_reward: number;
  credits: number;
}

export interface TutorialStatus {
  status: string;
  challenge: Tutorial;
}

export interface TutorialReward {
  status: string;
  xp_earned: number;
  credits_earned: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  difficulty: string;
  tier_required: string;
  xp_reward: number;
  credits: number;
  requirements: Record<string, unknown>;
  time_limit: number;
}

export interface ChallengeStatus {
  status: string;
  challenge: Challenge;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: string;
  xp_reward: number;
  icon: string;
  hidden: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  type: string;
  tier: string;
  price: number;
  specs: Record<string, unknown>;
}

export interface StoreInventory {
  equipment: Equipment[];
  player_credits: number;
  player_tier: string;
  owned: string[];
}

export interface PurchaseResult {
  success: boolean;
  equipment: Equipment;
  new_balance: number;
}

export interface Loadout {
  loadout_id: string;
}

export interface LeaderboardEntry {
  rank: number;
  player: string;
  score: number;
  images: number;
}

export interface ImageMetrics {
  hfr: number;
  fwhm: number;
  star_count: number;
  elongation: number;
  guide_rms: number;
  exposure_time: number;
  gain: number;
  mean_adu: number;
  max_adu: number;
}

export interface ImageScore {
  total_score: number;
  focus_score: number;
  tracking_score: number;
  exposure_score: number;
  noise_score: number;
  grade: string;
  recommendations: string[];
}

export interface StarSearchParams {
  ra: number;
  dec: number;
  radius?: number;
  limit?: number;
  minMag?: number;
  maxMag?: number;
}

export interface Star {
  id: number;
  ra: number;
  dec: number;
  mag: number;
  spectral_type: string;
  name?: string;
}

export interface StarSearchResult {
  count: number;
  stars: Star[];
}

export interface DSOSearchParams {
  name?: string;
  type?: string;
  ra?: number;
  dec?: number;
  radius?: number;
  limit?: number;
}

export interface DeepSkyObject {
  id: string;
  name: string;
  type: string;
  ra: number;
  dec: number;
  vmag: number;
  size_major: number;
  size_minor: number;
  pa: number;
  description: string;
}

export interface DSOSearchResult {
  count: number;
  objects: DeepSkyObject[];
}

export interface VisibleObjectsParams {
  minAlt?: number;
  maxMag?: number;
  limit?: number;
}

export interface VisibleObject {
  object: DeepSkyObject;
  visibility: {
    is_visible: boolean;
    coords: {
      altitude: number;
      azimuth: number;
    };
    airmass: number;
    hour_angle: number;
  };
}

export interface VisibleObjectsResult {
  objects: VisibleObject[];
  time: string;
  observer: Location;
}

export interface TargetSuggestion {
  object: DeepSkyObject;
  visibility: VisibleObject['visibility'];
  score: number;
  reason: string;
  best_time: string;
  window_hours: number;
}

export interface TargetSuggestions {
  suggestions: TargetSuggestion[];
  time: string;
  observer: Location;
}

export interface SkyConditions {
  seeing: number;
  transparency: number;
  cloud_cover: number;
  bortle_class: number;
  temperature: number;
  humidity: number;
  wind_speed: number;
}

export interface SkyTime {
  utc: string;
  local: string;
  julian_date: number;
  lst: number;
  use_real_time: boolean;
  time_offset: number;
}

export interface SetTimeParams {
  use_real_time?: boolean;
  time_offset?: number;
  set_time?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  elevation: number;
  name?: string;
}

export interface TwilightInfo {
  date: string;
  sunset_civil: string;
  sunset_nautical: string;
  sunset_astronomical: string;
  sunrise_civil: string;
  sunrise_nautical: string;
  sunrise_astronomical: string;
  is_dark: boolean;
  dark_hours_remaining: number;
}

export interface MoonInfo {
  ra: number;
  dec: number;
  altitude: number;
  azimuth: number;
  phase: number;
  illumination: number;
  is_up: boolean;
  phase_name: string;
}

export interface SunInfo {
  ra: number;
  dec: number;
  altitude: number;
  azimuth: number;
  is_up: boolean;
}

// Device types
export type ConnectionType = 'virtual' | 'indi' | 'alpaca';
export type DeviceType = 'camera' | 'mount' | 'focuser' | 'filter_wheel' | 'guider' | 'rotator' | 'dome' | 'weather';

export interface DeviceProfile {
  id: string;
  name: string;
  device_type: DeviceType;
  connection_type: ConnectionType;
  connection_config: Record<string, unknown>;
  properties?: Record<string, unknown>;
  enabled: boolean;
}

export interface EquipmentProfile {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  mode: 'simulation' | 'live' | 'hybrid';
  devices: DeviceProfile[];
  created_at?: string;
  updated_at?: string;
}

export interface ProfileListResponse {
  profiles: EquipmentProfile[];
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  device_type: DeviceType;
  connection_type: ConnectionType;
  server_address: string;
  device_name?: string;
  device_number?: number;
  description?: string;
  driver_info?: string;
}

export interface DiscoveryResult {
  devices: DiscoveredDevice[];
  errors?: string[];
  timestamp: string;
}

export interface INDIDiscoveryResult {
  devices: DiscoveredDevice[];
  server: string;
}

export interface AlpacaDiscoveryResult {
  devices: DiscoveredDevice[];
  server: string;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
}

export interface ModeInfo {
  mode: 'simulation' | 'live' | 'hybrid';
  profile: EquipmentProfile | null;
}
