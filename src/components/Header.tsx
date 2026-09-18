import React from 'react';
import { Activity, Bluetooth, Code2, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';
import { BluetoothMode, ConnectionState } from '../types';

interface HeaderProps {
  mode: BluetoothMode;
  connectionState: ConnectionState;
  onSelectMode: (mode: BluetoothMode) => void;
  onOpenAndroidGuide: () => void;
  isIframe: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  connectionState,
  onSelectMode,
  onOpenAndroidGuide,
  isIframe,
}) => {
  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="h-2 w-2 rounded-full bg-emerald-500 -ml-3.5" />
            已连接
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            连接中...
          </span>
        );
      case 'scanning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            搜索蓝牙...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            连接异常
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            未连接
          </span>
        );
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Activity className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  BLE 心率监测器
                </h1>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Web Bluetooth & 安卓原生蓝牙双模支持
              </p>
            </div>
          </div>

          {/* Mobile open new tab if iframe */}
          {isIframe && (
            <button
              id="header-open-tab-btn-mobile"
              onClick={handleOpenNewTab}
              title="由于浏览器安全策略，新标签页打开可完美调用手机或电脑真实蓝牙"
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mode Selector & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Mode Pill Switcher */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              id="mode-webble-btn"
              type="button"
              onClick={() => onSelectMode('web-bluetooth')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                mode === 'web-bluetooth'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Web 蓝牙 (真机)
            </button>
            <button
              id="mode-android-btn"
              type="button"
              onClick={() => onSelectMode('android-bridge')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                mode === 'android-bridge'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              安卓原生桥接
            </button>
          </div>

          {/* Android Native Integration Guide Button */}
          <button
            id="open-android-guide-btn"
            type="button"
            onClick={onOpenAndroidGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors"
          >
            <Code2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>安卓原生源码</span>
          </button>

          {/* Open in New Window if in iframe */}
          {isIframe && (
            <button
              id="header-open-tab-btn"
              type="button"
              onClick={handleOpenNewTab}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>新标签页打开</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
