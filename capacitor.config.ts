import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esp32d.iot',
  appName: 'heartbeat',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: '正在搜索附近的 BLE 蓝牙心率设备...',
        cancel: '取消',
        availableDevices: '可用心率设备',
        noDeviceFound: '未发现设备',
      },
    },
  },
};

export default config;
