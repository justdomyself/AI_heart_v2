import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, Clock, Flame, HeartPulse, FileText } from 'lucide-react';
import { WorkoutSession } from '../types';

interface SessionRecorderProps {
  session: WorkoutSession;
  currentBpm: number;
  hrv: number | null;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

export const SessionRecorder: React.FC<SessionRecorderProps> = ({
  session,
  currentBpm,
  hrv,
  onStart,
  onPause,
  onReset,
  onExportCsv,
  onExportJson,
}) => {
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              运动记录与生理分析
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {session.isActive && !session.isPaused && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
              {session.isActive ? (session.isPaused ? '已暂停' : '正在记录') : '记录待开始'}
            </span>
          </div>
        </div>

        {/* Big Timer & Calories */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 mb-4 text-center">
          <div>
            <div className="text-[10px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              运动时长
            </div>
            <div
              id="workout-timer-display"
              className="text-lg sm:text-xl font-mono font-black text-slate-800 dark:text-white mt-0.5"
            >
              {formatTime(session.elapsedSeconds)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              热量消耗
            </div>
            <div className="text-lg sm:text-xl font-mono font-black text-slate-800 dark:text-white mt-0.5">
              {session.caloriesBurned} <span className="text-[10px] font-normal text-slate-400">kcal</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-400 flex items-center justify-center gap-1">
              <HeartPulse className="h-3 w-3 text-rose-500" />
              HRV (心率变异性)
            </div>
            <div className="text-lg sm:text-xl font-mono font-black text-slate-800 dark:text-white mt-0.5">
              {hrv !== null ? hrv : '--'} <span className="text-[10px] font-normal text-slate-400">ms</span>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 px-1">
          <span>记录样本点: {session.readings.length} 次</span>
          <span>
            心率区间: {session.minBpm > 0 ? `${session.minBpm} - ${session.maxBpm}` : '--'} BPM
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {!session.isActive || session.isPaused ? (
            <button
              id="start-record-btn"
              type="button"
              onClick={onStart}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>{session.isPaused ? '继续记录' : '开始记录运动'}</span>
            </button>
          ) : (
            <button
              id="pause-record-btn"
              type="button"
              onClick={onPause}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Pause className="h-3.5 w-3.5 fill-white" />
              <span>暂停记录</span>
            </button>
          )}

          <button
            id="reset-record-btn"
            type="button"
            onClick={onReset}
            disabled={session.elapsedSeconds === 0 && session.readings.length === 0}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            title="重置计时与数据"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>重置</span>
          </button>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="export-csv-btn"
            type="button"
            onClick={onExportCsv}
            disabled={session.readings.length === 0}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>导出 CSV 报表</span>
          </button>

          <button
            id="export-json-btn"
            type="button"
            onClick={onExportJson}
            disabled={session.readings.length === 0}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>导出 JSON 数据</span>
          </button>
        </div>
      </div>
    </div>
  );
};
