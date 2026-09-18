import React from 'react';
import { Heart, Activity, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { HeartRateReading, HeartRateZone, BluetoothMode } from '../types';

interface HeartRateDisplayProps {
  reading: HeartRateReading | null;
  currentZone: HeartRateZone | null;
  minBpm: number;
  maxBpm: number;
  avgBpm: number;
  hrv: number | null;
  mode: BluetoothMode;
  onSimulateBpmChange: (bpm: number) => void;
  isConnected: boolean;
}

export const HeartRateDisplay: React.FC<HeartRateDisplayProps> = ({
  reading,
  currentZone,
  minBpm,
  maxBpm,
  avgBpm,
  hrv,
  mode,
  onSimulateBpmChange,
  isConnected,
}) => {
  const bpm = isConnected && reading ? reading.bpm : 0;
  const pulseDuration = bpm > 30 ? (60 / bpm).toFixed(2) : '1.0';

  const presets = [
    { label: '静息', bpm: 62 },
    { label: '热身', bpm: 95 },
    { label: '燃脂', bpm: 125 },
    { label: '有氧', bpm: 145 },
    { label: '冲刺', bpm: 178 },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      {/* Top Bar: Zone & Contact Status */}
      <div className="flex items-center justify-between gap-2 mb-4">
        {currentZone ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${currentZone.bgColor}`} />
            <span className={currentZone.color}>{currentZone.name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">等待心率数据...</span>
        )}

        {/* Skin Contact Indicator */}
        {reading?.sensorContact !== undefined && reading.sensorContact !== null && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {reading.sensorContact ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>传感器接触良好</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span>未紧密佩戴</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Center Heart & Large BPM Display */}
      <div className="flex flex-col items-center justify-center my-4">
        <div className="relative mb-3 flex items-center justify-center">
          {/* Pulsing Backlight */}
          <div
            className={`absolute h-24 w-24 rounded-full filter blur-xl transition-opacity duration-300 ${
              bpm > 0
                ? currentZone?.bgColor || 'bg-rose-500'
                : 'bg-slate-300 dark:bg-slate-800'
            }`}
            style={{
              opacity: bpm > 0 ? 0.35 : 0.05,
              transform: 'scale(1.2)',
            }}
          />

          {/* Beating Heart Icon */}
          <div
            className="relative flex items-center justify-center h-20 w-20 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900/50 shadow-inner"
            style={{
              animation: bpm > 0 ? `heartbeat ${pulseDuration}s infinite ease-in-out` : 'none',
            }}
          >
            <Heart
              className="h-10 w-10 fill-rose-500 text-rose-600"
              style={{
                filter: bpm > 140 ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.6))' : 'none',
              }}
            />
          </div>
        </div>

        {/* BPM Number & Unit */}
        <div className="flex items-baseline gap-2">
          <span
            id="current-bpm-display"
            className="text-6xl sm:text-7xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums"
          >
            {bpm > 0 ? bpm : '--'}
          </span>
          <span className="text-xl font-bold text-slate-400 dark:text-slate-500">BPM</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {currentZone?.description || '实时每分钟心跳次数 (Beats Per Minute)'}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="text-[10px] text-slate-400 font-medium">最低</div>
          <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
            {minBpm > 0 ? minBpm : '--'}
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="text-[10px] text-slate-400 font-medium">平均</div>
          <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
            {avgBpm > 0 ? avgBpm : '--'}
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="text-[10px] text-slate-400 font-medium">最高</div>
          <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
            {maxBpm > 0 ? maxBpm : '--'}
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="text-[10px] text-slate-400 font-medium">RR 间期</div>
          <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
            {reading?.rrIntervals && reading.rrIntervals.length > 0
              ? `${reading.rrIntervals[reading.rrIntervals.length - 1]}ms`
              : bpm > 0
              ? `${Math.round(60000 / bpm)}ms`
              : '--'}
          </div>
        </div>
      </div>

      {/* Simulation Controls (Visible when in simulation mode) */}
      {mode === 'simulation' && (
        <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <Zap className="h-3 w-3 text-amber-500" />
              虚拟心率模拟调控:
            </span>
            <span className="font-semibold text-rose-500">{bpm || 72} BPM</span>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.label}
                id={`sim-preset-${p.bpm}`}
                type="button"
                onClick={() => onSimulateBpmChange(p.bpm)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
              >
                {p.label} ({p.bpm})
              </button>
            ))}
          </div>

          <input
            id="simulation-bpm-slider"
            type="range"
            min="50"
            max="195"
            value={bpm || 72}
            onChange={(e) => onSimulateBpmChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
        </div>
      )}
    </div>
  );
};
