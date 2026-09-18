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
  AlertCircle,
  ArrowRight,
  ShieldCheck,
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
  isCapacitorAvailable: boolean;
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
  isCapacitorAvailable,
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
            {mode === 'capacitor-ble' ? (
              <ShieldCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            ) : mode === 'web-bluetooth' ? (
              <Smartphone className="h-3 w-3" />
            ) : (
              <Cpu className="h-3 w-3" />
            )}
            <span>
              {mode === 'capacitor-ble'
                ? isCapacitorAvailable
                  ? 'Capacitor 原生 (已激活)'
                  : 'Capacitor APK 模式'
                : mode === 'web-bluetooth'
                ? 'Web 蓝牙 (真机)'
                : '安卓原生桥接'}
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl mb-4 text-xs font-medium">
          <button
            id="tab-webble-btn"
            type="button"
            onClick={() => onSelectMode('web-bluetooth')}
            className={`py-2 px-1 text-center rounded-lg transition-all flex flex-col items-center gap-0.5 ${
              mode === 'web-bluetooth'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold ring-1 ring-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5" />
              <span className="font-semibold text-[11px]">手机浏览器</span>
            </div>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal">
              Chrome/Edge
            </span>
          </button>

          <button
            id="tab-capble-btn"
            type="button"
            onClick={() => onSelectMode('capacitor-ble')}
            className={`py-2 px-1 text-center rounded-lg transition-all flex flex-col items-center gap-0.5 ${
              mode === 'capacitor-ble'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs font-bold ring-1 ring-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="font-semibold text-[11px]">Capacitor</span>
            </div>
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-normal">
              {isCapacitorAvailable ? '原生已激活' : '打包 APK'}
            </span>
          </button>

          <button
            id="tab-android-btn"
            type="button"
            onClick={() => onSelectMode('android-bridge')}
            className={`py-2 px-1 text-center rounded-lg transition-all flex flex-col items-center gap-0.5 ${
              mode === 'android-bridge'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold ring-1 ring-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5" />
              <span className="font-semibold text-[11px]">WebView</span>
            </div>
            <span className="text-[9px] text-slate-400 font-normal">
              原生桥接
            </span>
          </button>
        </div>

        {/* Notice for Capacitor BLE mode */}
        {mode === 'capacitor-ble' && (
          <div className="p-3 mb-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs">
            <div className="flex items-start gap-2 text-purple-900 dark:text-purple-200 font-medium">
              <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                {isCapacitorAvailable ? (
                  <span>
                    ✅ <strong>Android 原生环境检测通过！</strong>已自动对接 <code>@capacitor-community/bluetooth-le</code> 插件，点击下方按钮即可原生扫描配对心率设备。
                  </span>
                ) : (
                  <span>
                    📱 <strong>Capacitor 原生 APK 模式已就绪：</strong>代码已集成 <code>@capacitor-community/bluetooth-le</code> 驱动与原生权限处理。通过命令行打包生成 APK 安装至手机后，将自动调用此通道；若当前在电脑/手机网页测试，请点击上方<strong>【手机浏览器】</strong>直连模式。
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning if on android-bridge mode but no bridge object is found */}
        {mode === 'android-bridge' && !isAndroidBridgeAvailable && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200 font-medium mb-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">您当前在普通浏览器中访问</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300 font-normal mt-0.5 leading-relaxed">
                  未检测到 App 注入的 <code>window.AndroidBridge</code>。安卓手机（Chrome/Edge）请直接使用<strong>浏览器直连</strong>模式，即可直接调用手机蓝牙！
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectMode('web-bluetooth')}
              className="mt-1 w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>立即切换为【手机浏览器直连】</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Warning if on web-bluetooth mode but browser does not support it */}
        {mode === 'web-bluetooth' && !isWebBleAvailable && (
          <div className="p-3 mb-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs">
            <div className="flex items-start gap-2 text-sky-900 dark:text-sky-200 font-medium">
              <AlertCircle className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                当前浏览器未开放 Web 蓝牙接口。<strong>安卓手机用户</strong>请使用手机自带的 <strong>Chrome</strong> 或 <strong>Edge</strong> 浏览器打开本网页（并开启系统蓝牙与位置/GPS定位）。若在微信中打开，请点右上角【在浏览器中打开】。
              </div>
            </div>
          </div>
        )}

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
            className={`p-3 rounded-xl text-xs mb-4 leading-relaxed ${
              connectionState === 'error'
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200 dark:border-rose-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <div>{stateMessage}</div>
            {stateMessage.includes('AndroidBridge') && mode === 'android-bridge' && (
              <button
                type="button"
                onClick={() => onSelectMode('web-bluetooth')}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <span>一键切换为手机浏览器直连</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
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
            onClick={() => {
              if (mode === 'android-bridge' && !isAndroidBridgeAvailable) {
                onSelectMode('web-bluetooth');
              } else {
                onConnect();
              }
            }}
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
                  {mode === 'capacitor-ble'
                    ? isCapacitorAvailable
                      ? '原生扫描并连接心率设备'
                      : '原生蓝牙扫描 (打包后直连)'
                    : mode === 'web-bluetooth'
                    ? '搜索并连接 BLE 蓝牙心率设备'
                    : !isAndroidBridgeAvailable
                    ? '切换为浏览器直连并配对'
                    : '调用安卓原生蓝牙接口连接'}
                </span>
              </>
            )}
          </button>
        )}

        {/* Hint text */}
        <p className="text-[11px] text-center text-slate-400 leading-relaxed">
          {mode === 'capacitor-ble'
            ? isCapacitorAvailable
              ? '💡 当前运行于 Capacitor Android 原生容器，已由底层蓝牙栈直接提供支持'
              : '💡 已配置 @capacitor-community/bluetooth-le 驱动，打包成 APK 安装后自动原生免配对调用'
            : mode === 'web-bluetooth'
            ? '💡 安卓手机请使用 Chrome/Edge 浏览器，并打开手机系统的【蓝牙】与【定位/GPS】'
            : '💡 原生桥接模式仅在已集成 window.AndroidBridge 的打包 Android APK 中生效'}
        </p>
      </div>
    </div>
  );
};
