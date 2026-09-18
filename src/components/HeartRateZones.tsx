import React, { useState } from 'react';
import { Flame, Settings2, Check } from 'lucide-react';
import { HeartRateZone } from '../types';

interface HeartRateZonesProps {
  currentBpm: number;
  zones: HeartRateZone[];
  zoneSeconds: Record<string, number>;
  maxHeartRate: number;
  onUpdateMaxHeartRate: (newMax: number) => void;
}

export const HeartRateZones: React.FC<HeartRateZonesProps> = ({
  currentBpm,
  zones,
  zoneSeconds,
  maxHeartRate,
  onUpdateMaxHeartRate,
}) => {
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [tempMax, setTempMax] = useState(maxHeartRate);

  const totalTrackedSeconds = Object.values(zoneSeconds).reduce((a, b) => a + b, 0);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleSaveMax = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempMax >= 120 && tempMax <= 230) {
      onUpdateMaxHeartRate(tempMax);
    }
    setIsEditingMax(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            心率训练区间 (Heart Rate Zones)
          </h2>
        </div>

        {/* Max HR Setting toggle */}
        <div className="flex items-center gap-2">
          {isEditingMax ? (
            <form onSubmit={handleSaveMax} className="flex items-center gap-1.5">
              <input
                type="number"
                min="120"
                max="230"
                value={tempMax}
                onChange={(e) => setTempMax(Number(e.target.value))}
                className="w-16 px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="p-1 rounded bg-rose-500 text-white hover:bg-rose-600 text-xs"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <button
              id="edit-max-hr-btn"
              type="button"
              onClick={() => setIsEditingMax(true)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <span>最大心率: {maxHeartRate}</span>
              <Settings2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Zones list */}
      <div className="space-y-3">
        {zones.map((zone) => {
          const isCurrent = currentBpm >= zone.min && currentBpm <= zone.max;
          const timeInZone = zoneSeconds[zone.name] || 0;
          const percentage =
            totalTrackedSeconds > 0
              ? Math.round((timeInZone / totalTrackedSeconds) * 100)
              : 0;

          return (
            <div
              key={zone.name}
              className={`p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${zone.bgColor}`} />
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {zone.name}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      当前区间
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {zone.min} - {zone.max} <span className="text-[10px] font-normal text-slate-400">BPM</span>
                  </span>
                </div>
              </div>

              {/* Progress bar representing time or intensity */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className={`h-full ${zone.bgColor} transition-all duration-300`}
                  style={{
                    width: `${Math.max(percentage, isCurrent ? 25 : 0)}%`,
                    opacity: isCurrent ? 1 : 0.6,
                  }}
                />
              </div>

              {/* Time stats */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>{zone.description}</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {timeInZone > 0 ? `${formatSeconds(timeInZone)} (${percentage}%)` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
