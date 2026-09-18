import React from 'react';
import {
  Bluetooth,
  Battery,
  BatteryCharging,
  BatteryLow,
  MapPin,
  Radio,
  RefreshCw,
  Power,
  Smartphone,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { BleDeviceInfo, BluetoothMode, ConnectionState } from '../types';

interface DevicePanelProps {
  deviceInfo: BleDeviceInfo | null;
  connectionState: ConnectionState;
  stateMessage?: string;
  mode: BluetoothMode;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectMode: (mode: BluetoothMode) => void;
  isWebBleAvailable: boolean;
  isAndroidBridgeAvailable: boolean;
}

export const DevicePanel: React.FC<DevicePanelProps> = ({
  deviceInfo,
  connectionState,
  stateMessage,
  mode,
  onConnect,
  onDisconnect,
  onSelectMode,
  isWebBleAvailable,
  isAndroidBridgeAvailable,
}) => {
  const isConnected = connectionState === 'connected';
  const isBusy = connectionState === 'connecting' || connectionState === 'scanning';

  const renderBattery = (battery?: number | null) => {
    if (battery === undefined || battery === null) return null;
    let Icon = Battery;
    let color = 'text-emerald-500';
    if (battery <= 20) {
      Icon = BatteryLow;
      color = 'text-rose-500 animate-pulse';
    } else if (battery <= 50) {
      color = 'text-amber-500';
    }

    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <Icon className={`h-4 w-4 ${color}`} />
        <span>{battery}% 电量</span>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              蓝牙设备与底层模式
            </h2>
          </div>

          {/* Mode Badge */}
          <div className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-1">
            {mode === 'web-bluetooth' && <Smartphone className="h-3 w-3" />}
            {mode === 'android-bridge' && <Cpu className="h-3 w-3" />}
            {mode === 'simulation' && <Sparkles className="h-3 w-3" />}
            <span>
              {mode === 'web-bluetooth'
                ? 'Web 蓝牙 (真机)'
                : mode === 'android-bridge'
                ? '安卓原生桥接'
                : '虚拟心率测试'}
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl mb-4 text-xs font-medium">
          <button
            id="tab-sim-btn"
            type="button"
            onClick={() => onSelectMode('simulation')}
            className={`py-2 px-1 text-center rounded-lg transition-all flex flex-col items-center gap-1 ${
              mode === 'simulation'
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>模拟测试</span>
          </button>
          <button
            id="tab-webble-btn"
            type="button"
            onClick={() => onSelectMode('web-bluetooth')}
            className={`py-2 px-1 text-center rounded-lg transition-all flex flex-col items-center gap-1 ${
              mode === 'web-bluetooth'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Web 蓝牙</span>
          </button>
          <button
            id="tab-android-btn"
            type="button"
            onClick={() => onSelectMode('android-bridge')}
            className={`py-2 px-1 text-center rounded-lg transition-all flex flex-col items-center gap-1 ${
              mode === 'android-bridge'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>安卓原生</span>
          </button>
        </div>

        {/* Current Device Details */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 mb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                <Bluetooth className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {isConnected && deviceInfo
                    ? deviceInfo.name || '心率设备已连接'
                    : '未连接任何蓝牙设备'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isConnected && deviceInfo
                    ? `服务: GATT 0x180D (Heart Rate)`
                    : '支持 Polar, Garmin, Wahoo, 各种手环及安卓原生蓝牙'}
                </div>
              </div>
            </div>

            {/* Battery Level */}
            {isConnected && renderBattery(deviceInfo?.batteryLevel)}
          </div>

          {/* Sensor Location info if connected */}
          {isConnected && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>传感器佩戴部位: {deviceInfo?.sensorLocation || '胸部 / 手腕'}</span>
            </div>
          )}
        </div>

        {/* Status Message or Warning */}
        {stateMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs mb-4 leading-relaxed ${
              connectionState === 'error'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {stateMessage}
          </div>
        )}
      </div>

      {/* Main Connect / Disconnect Action Button */}
      <div className="space-y-2">
        {isConnected ? (
          <button
            id="disconnect-ble-btn"
            type="button"
            onClick={onDisconnect}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900 transition-colors flex items-center justify-center gap-2"
          >
            <Power className="h-4 w-4" />
            <span>断开蓝牙连接</span>
          </button>
        ) : (
          <button
            id="connect-ble-btn"
            type="button"
            disabled={isBusy}
            onClick={onConnect}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 transition-all shadow-sm shadow-rose-600/30 flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{connectionState === 'scanning' ? '正在搜索设备...' : '正在建立连接...'}</span>
              </>
            ) : (
              <>
                <Bluetooth className="h-4 w-4" />
                <span>
                  {mode === 'web-bluetooth'
                    ? '搜索并连接 BLE 心率设备'
                    : mode === 'android-bridge'
                    ? '调用安卓原生蓝牙接口'
                    : '连接虚拟测试心率设备'}
                </span>
              </>
            )}
          </button>
        )}

        {/* Hint text */}
        <p className="text-[11px] text-center text-slate-400">
          {mode === 'web-bluetooth'
            ? '支持 Android Chrome / Edge 浏览器直连蓝牙，需开启手机蓝牙与定位权限'
            : mode === 'android-bridge'
            ? '运行于包含 window.AndroidBridge 的 Android WebView 原生应用中'
            : '无需任何实体蓝牙硬件，可在当前网页或 iframe 预览中无缝体验所有功能'}
        </p>
      </div>
    </div>
  );
};
