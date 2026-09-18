export type BluetoothMode = 'web-bluetooth' | 'android-bridge';

export type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export interface HeartRateReading {
  bpm: number;
  timestamp: number;
  rrIntervals: number[];
  energyExpended?: number;
  sensorContact?: boolean | null;
}

export interface BleDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  batteryLevel?: number | null;
  sensorLocation?: string;
  rssi?: number;
  mode: BluetoothMode;
}

export interface HeartRateZone {
  name: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export interface WorkoutSession {
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  readings: { time: number; bpm: number }[];
  maxBpm: number;
  minBpm: number;
  avgBpm: number;
  caloriesBurned: number;
  zoneSeconds: Record<string, number>;
}

// Android WebView Native Bridge Interface definition
export interface AndroidNativeBridge {
  startScan?: () => void;
  stopScan?: () => void;
  connectDevice?: (address: string) => void;
  disconnectDevice?: () => void;
  isBluetoothEnabled?: () => boolean;
  requestBluetoothEnable?: () => void;
  getDeviceInfo?: () => string; // returns JSON
}

declare global {
  interface Window {
    AndroidBridge?: AndroidNativeBridge;
    AndroidBle?: AndroidNativeBridge;
    
    // Callbacks provided by the Web App for Android Native code to call
    onAndroidBleStateChange?: (state: string) => void;
    onAndroidBleHeartRate?: (bpm: number, rrIntervals?: number[], energy?: number, contact?: boolean) => void;
    onAndroidBleBatteryLevel?: (level: number) => void;
    onAndroidBleDeviceDiscovered?: (device: { name: string; address: string; rssi?: number }) => void;
    onAndroidBleError?: (errorMessage: string) => void;
  }
}
