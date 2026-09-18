import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BleDeviceInfo,
  BluetoothMode,
  ConnectionState,
  HeartRateReading,
  WorkoutSession,
} from './types';
import {
  calculateHRV,
  getCurrentZone,
  getHeartRateZones,
} from './services/bleParser';
import { bluetoothService } from './services/bluetoothService';
import { Header } from './components/Header';
import { HeartRateDisplay } from './components/HeartRateDisplay';
import { EcgVisualizer } from './components/EcgVisualizer';
import { HeartRateZones } from './components/HeartRateZones';
import { DevicePanel } from './components/DevicePanel';
import { SessionRecorder } from './components/SessionRecorder';
import { AndroidNativeGuideModal } from './components/AndroidNativeGuideModal';
import { IframeWarningBanner } from './components/IframeWarningBanner';

export default function App() {
  const initialMode: BluetoothMode = useMemo(
    () => (bluetoothService.isAndroidBridgeAvailable() ? 'android-bridge' : 'web-bluetooth'),
    []
  );
  const [mode, setMode] = useState<BluetoothMode>(initialMode);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [stateMessage, setStateMessage] = useState<string>('');
  const [reading, setReading] = useState<HeartRateReading | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<BleDeviceInfo | null>(null);

  // Statistics
  const [minBpm, setMinBpm] = useState<number>(0);
  const [maxBpm, setMaxBpm] = useState<number>(0);
  const [bpmHistory, setBpmHistory] = useState<number[]>([]);
  const [rrBuffer, setRrBuffer] = useState<number[]>([]);

  // User Profile / Settings
  const [maxHeartRate, setMaxHeartRate] = useState<number>(190);
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);

  // Workout Session State
  const [session, setSession] = useState<WorkoutSession>({
    isActive: false,
    isPaused: false,
    startTime: null,
    elapsedSeconds: 0,
    readings: [],
    maxBpm: 0,
    minBpm: 0,
    avgBpm: 0,
    caloriesBurned: 0,
    zoneSeconds: {},
  });

  const zones = useMemo(() => getHeartRateZones(maxHeartRate), [maxHeartRate]);
  const currentZone = useMemo(
    () => getCurrentZone(reading?.bpm || 0, zones),
    [reading?.bpm, zones]
  );
  const hrv = useMemo(() => calculateHRV(rrBuffer), [rrBuffer]);

  const avgBpm = useMemo(() => {
    if (bpmHistory.length === 0) return 0;
    const sum = bpmHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / bpmHistory.length);
  }, [bpmHistory]);

  const isIframe = useMemo(() => bluetoothService.isInsideIframe(), []);
  const isWebBleAvailable = useMemo(() => bluetoothService.isWebBluetoothAvailable(), []);
  const isAndroidBridgeAvailable = useMemo(
    () => bluetoothService.isAndroidBridgeAvailable(),
    []
  );

  // Register Bluetooth callbacks
  useEffect(() => {
    bluetoothService.setCallbacks(
      (newReading) => {
        setReading(newReading);
        const bpm = newReading.bpm;

        if (bpm > 0) {
          setMinBpm((prev) => (prev === 0 ? bpm : Math.min(prev, bpm)));
          setMaxBpm((prev) => Math.max(prev, bpm));
          setBpmHistory((prev) => {
            const next = [...prev, bpm];
            return next.length > 300 ? next.slice(next.length - 300) : next;
          });

          if (newReading.rrIntervals && newReading.rrIntervals.length > 0) {
            setRrBuffer((prev) => {
              const combined = [...prev, ...newReading.rrIntervals];
              return combined.length > 40 ? combined.slice(combined.length - 40) : combined;
            });
          }
        }
      },
      (state, message) => {
        setConnectionState(state);
        if (message) setStateMessage(message);
      },
      (info) => {
        setDeviceInfo(info);
      }
    );

    // Auto-connect to Android Native Bridge if available in Android WebView
    if (bluetoothService.isAndroidBridgeAvailable()) {
      bluetoothService.connect('android-bridge');
    }

    return () => {
      bluetoothService.disconnect();
    };
  }, []);

  // Workout Session Timer
  useEffect(() => {
    if (!session.isActive || session.isPaused) return;

    const timer = setInterval(() => {
      setSession((prev) => {
        const nextSeconds = prev.elapsedSeconds + 1;
        const currentBpm = reading?.bpm || 0;

        // Calorie calculation: estimated ~0.12 kcal/sec for aerobic exercise at 120-140 bpm
        let calorieIncrement = 0;
        if (currentBpm > 50) {
          // ACSM physiological metabolic equivalent estimation
          calorieIncrement = ((currentBpm / 150) * 8.5) / 60;
        }

        const nextCalories = Math.round(prev.caloriesBurned + calorieIncrement);

        // Update zone seconds
        const currentZoneName = currentZone?.name;
        const nextZoneSeconds = { ...prev.zoneSeconds };
        if (currentZoneName) {
          nextZoneSeconds[currentZoneName] = (nextZoneSeconds[currentZoneName] || 0) + 1;
        }

        const nextReadings = currentBpm > 0
          ? [...prev.readings, { time: nextSeconds, bpm: currentBpm }]
          : prev.readings;

        const bpmValues = nextReadings.map((r) => r.bpm);
        const sessionMax = bpmValues.length > 0 ? Math.max(...bpmValues) : 0;
        const sessionMin = bpmValues.length > 0 ? Math.min(...bpmValues) : 0;
        const sessionAvg =
          bpmValues.length > 0
            ? Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length)
            : 0;

        return {
          ...prev,
          elapsedSeconds: nextSeconds,
          caloriesBurned: nextCalories,
          zoneSeconds: nextZoneSeconds,
          readings: nextReadings,
          maxBpm: sessionMax,
          minBpm: sessionMin,
          avgBpm: sessionAvg,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.isActive, session.isPaused, reading?.bpm, currentZone?.name]);

  // Mode Selection Handler
  const handleSelectMode = useCallback((newMode: BluetoothMode) => {
    setMode(newMode);
    bluetoothService.disconnect();
    setReading(null);
    setMinBpm(0);
    setMaxBpm(0);
    setBpmHistory([]);
    setRrBuffer([]);
  }, []);

  const handleConnect = useCallback(() => {
    bluetoothService.connect(mode);
  }, [mode]);

  const handleDisconnect = useCallback(() => {
    bluetoothService.disconnect();
  }, []);

  // Session Controls
  const handleStartSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isActive: true,
      isPaused: false,
      startTime: prev.startTime || Date.now(),
    }));
  }, []);

  const handlePauseSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  const handleResetSession = useCallback(() => {
    setSession({
      isActive: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      readings: [],
      maxBpm: 0,
      minBpm: 0,
      avgBpm: 0,
      caloriesBurned: 0,
      zoneSeconds: {},
    });
  }, []);

  // Export CSV
  const handleExportCsv = useCallback(() => {
    if (session.readings.length === 0) return;
    const headers = ['时间(秒)', '心率(BPM)', '训练区间', '设备模式'];
    const rows = session.readings.map((r) => {
      const z = getCurrentZone(r.bpm, zones)?.name || '未定义';
      return [r.time, r.bpm, `"${z}"`, mode].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BLE_心率记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [session.readings, zones, mode]);

  // Export JSON
  const handleExportJson = useCallback(() => {
    if (session.readings.length === 0) return;
    const exportData = {
      device: deviceInfo?.name || 'BLE Heart Rate Sensor',
      mode,
      durationSeconds: session.elapsedSeconds,
      caloriesBurned: session.caloriesBurned,
      maxBpm: session.maxBpm,
      minBpm: session.minBpm,
      avgBpm: session.avgBpm,
      zoneDistribution: session.zoneSeconds,
      samples: session.readings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BLE_心率分析_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [session, deviceInfo, mode]);

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Header */}
      <Header
        mode={mode}
        connectionState={connectionState}
        onSelectMode={handleSelectMode}
        onOpenAndroidGuide={() => setShowAndroidGuide(true)}
        isIframe={isIframe}
      />

      {/* Iframe Warning Banner (if browser restrictions apply) */}
      {isIframe && <IframeWarningBanner />}

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Grid: Main Heart Rate Display & Real-time ECG Oscilloscope */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <HeartRateDisplay
              reading={reading}
              currentZone={currentZone}
              minBpm={minBpm}
              maxBpm={maxBpm}
              avgBpm={avgBpm}
              hrv={hrv}
              isConnected={connectionState === 'connected'}
            />
          </div>
          <div className="lg:col-span-7">
            <EcgVisualizer
              bpm={reading?.bpm || 0}
              isConnected={connectionState === 'connected'}
            />
          </div>
        </div>

        {/* Bottom Grid: 3 Columns (Device Manager, Heart Rate Zones, Workout Session) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DevicePanel
            deviceInfo={deviceInfo}
            connectionState={connectionState}
            stateMessage={stateMessage}
            mode={mode}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSelectMode={handleSelectMode}
            isWebBleAvailable={isWebBleAvailable}
            isAndroidBridgeAvailable={isAndroidBridgeAvailable}
          />

          <HeartRateZones
            currentBpm={reading?.bpm || 0}
            zones={zones}
            zoneSeconds={session.zoneSeconds}
            maxHeartRate={maxHeartRate}
            onUpdateMaxHeartRate={setMaxHeartRate}
          />

          <SessionRecorder
            session={session}
            currentBpm={reading?.bpm || 0}
            hrv={hrv}
            onStart={handleStartSession}
            onPause={handlePauseSession}
            onReset={handleResetSession}
            onExportCsv={handleExportCsv}
            onExportJson={handleExportJson}
          />
        </div>
      </main>

      {/* Android Native Integration Guide Modal */}
      <AndroidNativeGuideModal
        isOpen={showAndroidGuide}
        onClose={() => setShowAndroidGuide(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-400">
        BLE 心率监测器 • 符合 Bluetooth SIG GATT 0x180D 规范 • 支持 Android Chrome 及 Android 原生 WebView
      </footer>
    </div>
  );
}
