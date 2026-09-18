import { Capacitor } from '@capacitor/core';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import {
  BleDeviceInfo,
  BluetoothMode,
  ConnectionState,
  HeartRateReading,
} from '../types';
import {
  BATTERY_LEVEL_UUID,
  BATTERY_SERVICE_UUID,
  BODY_SENSOR_LOCATION_UUID,
  HEART_RATE_MEASUREMENT_UUID,
  HEART_RATE_SERVICE_UUID,
  parseHeartRateMeasurement,
  SENSOR_LOCATIONS,
} from './bleParser';

export class BluetoothService {
  private device: any = null;
  private gattServer: any = null;
  private hrCharacteristic: any = null;
  private batteryCharacteristic: any = null;
  private capacitorDeviceId: string | null = null;

  private onReadingCallback?: (reading: HeartRateReading) => void;
  private onStateChangeCallback?: (state: ConnectionState, message?: string) => void;
  private onDeviceInfoCallback?: (info: BleDeviceInfo) => void;

  public currentMode: BluetoothMode = 'web-bluetooth';
  public currentState: ConnectionState = 'disconnected';

  constructor() {
    this.setupAndroidCallbacks();
    if (this.isCapacitorAvailable()) {
      this.currentMode = 'capacitor-ble';
    } else if (this.isAndroidBridgeAvailable()) {
      this.currentMode = 'android-bridge';
    } else {
      this.currentMode = 'web-bluetooth';
    }
  }

  public isCapacitorAvailable(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        (Boolean((window as any).Capacitor?.isNativePlatform?.()) || Capacitor.isNativePlatform())
      );
    } catch {
      return false;
    }
  }

  public setCallbacks(
    onReading: (reading: HeartRateReading) => void,
    onStateChange: (state: ConnectionState, message?: string) => void,
    onDeviceInfo: (info: BleDeviceInfo) => void
  ) {
    this.onReadingCallback = onReading;
    this.onStateChangeCallback = onStateChange;
    this.onDeviceInfoCallback = onDeviceInfo;
  }

  public isWebBluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isAndroidBridgeAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      (Boolean(window.AndroidBridge) || Boolean(window.AndroidBle))
    );
  }

  public isInsideIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  /**
   * Initialize Android WebView JavascriptInterface hooks
   */
  private setupAndroidCallbacks() {
    if (typeof window === 'undefined') return;

    window.onAndroidBleHeartRate = (bpm, rrIntervals, energy, contact) => {
      if (this.onReadingCallback) {
        this.onReadingCallback({
          bpm,
          timestamp: Date.now(),
          rrIntervals: rrIntervals || [Math.round(60000 / (bpm || 70))],
          energyExpended: energy,
          sensorContact: contact ?? true,
        });
      }
    };

    window.onAndroidBleBatteryLevel = (level: number) => {
      if (this.onDeviceInfoCallback) {
        this.onDeviceInfoCallback({
          id: 'android-native-device',
          name: 'Android 原生蓝牙设备',
          connected: true,
          batteryLevel: level,
          sensorLocation: '胸部 / 手环',
          mode: 'android-bridge',
        });
      }
    };

    window.onAndroidBleStateChange = (state: string) => {
      if (state === 'connected') {
        this.updateState('connected', '已通过安卓原生蓝牙连接');
      } else if (state === 'connecting') {
        this.updateState('connecting', '正在通过安卓原生蓝牙连接设备...');
      } else if (state === 'disconnected') {
        this.updateState('disconnected', '安卓蓝牙设备已断开');
      }
    };

    window.onAndroidBleError = (errorMsg: string) => {
      this.updateState('error', `安卓原生蓝牙错误: ${errorMsg}`);
    };
  }

  private updateState(state: ConnectionState, message?: string) {
    this.currentState = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state, message);
    }
  }

  /**
   * Connect based on mode
   */
  public async connect(mode: BluetoothMode): Promise<void> {
    this.currentMode = mode;
    this.disconnect();

    if (mode === 'capacitor-ble') {
      await this.connectCapacitorBle();
    } else if (mode === 'android-bridge') {
      await this.connectAndroidBridge();
    } else if (mode === 'web-bluetooth') {
      await this.connectWebBluetooth();
    }
  }

  /**
   * Connect via Web Bluetooth API (Standard Chrome / Android Web Bluetooth)
   */
  private async connectWebBluetooth(): Promise<void> {
    if (!this.isWebBluetoothAvailable()) {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isWeChat = /MicroMessenger/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);

      let advice = '请使用安卓手机的 Chrome 或 Edge 浏览器打开（并开启手机蓝牙与系统位置/GPS权限）。';
      if (isWeChat) {
        advice = '微信内置浏览器不支持 Web 蓝牙。请点击右上角【···】，选择【在系统/默认浏览器打开】并使用 Chrome。';
      } else if (isIOS) {
        advice = 'iOS Safari 浏览器暂不开放 Web 蓝牙接口。建议使用安卓手机 Chrome 浏览器，或安装 Bluefy 等支持 BLE 的专用浏览器。';
      }

      this.updateState(
        'error',
        `当前浏览器不支持 Web 蓝牙 API。${advice}`
      );
      return;
    }

    try {
      this.updateState('scanning', '正在搜索附近的 BLE 蓝牙心率设备...');

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE_UUID] }],
        optionalServices: [
          BATTERY_SERVICE_UUID,
          BODY_SENSOR_LOCATION_UUID,
          0x180a, // Device Information
        ],
      });

      if (!device) {
        this.updateState('disconnected', '未选择蓝牙设备');
        return;
      }

      this.device = device;
      this.updateState('connecting', `正在连接到 ${device.name || '心率设备'}...`);

      // Add disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        this.updateState('disconnected', '蓝牙设备已断开连接');
        this.cleanup();
      });

      const server = await device.gatt.connect();
      this.gattServer = server;

      // 1. Heart Rate Service
      const hrService = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);
      const hrChar = await hrService.getCharacteristic(HEART_RATE_MEASUREMENT_UUID);
      this.hrCharacteristic = hrChar;

      await hrChar.startNotifications();
      hrChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value as DataView;
        const reading = parseHeartRateMeasurement(dataView);
        if (this.onReadingCallback) {
          this.onReadingCallback(reading);
        }
      });

      // 2. Body Sensor Location (optional)
      let sensorLocation = '胸部/手腕';
      try {
        const locationChar = await hrService.getCharacteristic(BODY_SENSOR_LOCATION_UUID);
        const locVal = await locationChar.readValue();
        const locCode = locVal.getUint8(0);
        sensorLocation = SENSOR_LOCATIONS[locCode] || '标准传感器';
      } catch {
        // Optional characteristic not available on all sensors
      }

      // 3. Battery Level Service (optional)
      let batteryLevel: number | null = null;
      try {
        const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID);
        const batteryChar = await batteryService.getCharacteristic(BATTERY_LEVEL_UUID);
        this.batteryCharacteristic = batteryChar;
        const batVal = await batteryChar.readValue();
        batteryLevel = batVal.getUint8(0);

        try {
          await batteryChar.startNotifications();
          batteryChar.addEventListener('characteristicvaluechanged', (ev: any) => {
            const level = ev.target.value.getUint8(0);
            if (this.onDeviceInfoCallback && this.device) {
              this.onDeviceInfoCallback({
                id: this.device.id,
                name: this.device.name || 'BLE 心率带',
                connected: true,
                batteryLevel: level,
                sensorLocation,
                mode: 'web-bluetooth',
              });
            }
          });
        } catch {
          // Battery notification not supported
        }
      } catch {
        // Battery service not present
      }

      this.updateState('connected', `已成功连接到 ${device.name || '心率设备'}`);

      if (this.onDeviceInfoCallback) {
        this.onDeviceInfoCallback({
          id: device.id,
          name: device.name || 'BLE 心率带/手环',
          connected: true,
          batteryLevel,
          sensorLocation,
          mode: 'web-bluetooth',
        });
      }
    } catch (err: any) {
      console.warn('Web Bluetooth connection error:', err);
      const isUserCancel = err.name === 'NotFoundError' || err.message?.includes('cancelled');
      const isIframeBlocked =
        err.name === 'SecurityError' ||
        err.message?.includes('iframe') ||
        err.message?.includes('Permissions-Policy');

      if (isUserCancel) {
        this.updateState('disconnected', '已取消蓝牙配对选择');
      } else if (isIframeBlocked) {
        this.updateState(
          'error',
          '浏览器限制：内嵌 iframe 窗口无法直接调用蓝牙权限。请点击右上角【新标签页打开】以使用真机蓝牙，或在 Android WebView 原生 App 中运行。'
        );
      } else {
        this.updateState('error', `蓝牙连接失败: ${err.message || '未知错误'}`);
      }
      this.cleanup();
    }
  }

  /**
   * Connect via Android Native Bridge (WebView JavascriptInterface)
   */
  private async connectAndroidBridge(): Promise<void> {
    const bridge = window.AndroidBridge || window.AndroidBle;
    if (!bridge) {
      this.updateState(
        'error',
        '未检测到 Android 原生桥接对象 (window.AndroidBridge)。您当前是在普通浏览器中访问，请切换至【手机浏览器直连】模式；若要使用此模式，需在打包了原生蓝牙插件的 Android WebView App 中运行。'
      );
      return;
    }

    try {
      this.updateState('connecting', '正在调用安卓原生蓝牙接口扫描与连接...');
      if (bridge.startScan) {
        bridge.startScan();
      } else if (bridge.connectDevice) {
        bridge.connectDevice('');
      }

      if (this.onDeviceInfoCallback) {
        this.onDeviceInfoCallback({
          id: 'android-ble-bridge',
          name: 'Android Native BLE Host',
          connected: true,
          batteryLevel: null,
          sensorLocation: '原生底层适配',
          mode: 'android-bridge',
        });
      }
    } catch (err: any) {
      this.updateState('error', `调用 Android 原生接口失败: ${err.message}`);
    }
  }

  /**
   * Connect via Capacitor Community Bluetooth LE Plugin (Android Native APK)
   */
  private async connectCapacitorBle(): Promise<void> {
    try {
      this.updateState('connecting', '正在初始化 Android 原生蓝牙与权限...');

      try {
        await BleClient.initialize();
      } catch (initErr) {
        console.warn('BleClient initialize warning:', initErr);
      }

      // Check if Bluetooth is enabled
      try {
        const enabled = await BleClient.isEnabled();
        if (!enabled) {
          try {
            await BleClient.requestEnable();
          } catch {
            this.updateState('error', '请先在手机系统设置中开启蓝牙与定位');
            return;
          }
        }
      } catch {
        // Continue if check unsupported
      }

      this.updateState('scanning', '正在扫描心率设备 (请在弹出列表中选择)...');

      // Heart Rate Service UUID: 0x180D, Battery: 0x180F
      const HR_SERVICE = numberToUUID(0x180d);
      const HR_MEASUREMENT = numberToUUID(0x2a37);
      const BATTERY_SERVICE = numberToUUID(0x180f);
      const BATTERY_LEVEL = numberToUUID(0x2a19);

      let device;
      try {
        device = await BleClient.requestDevice({
          services: [HR_SERVICE],
          optionalServices: [BATTERY_SERVICE, numberToUUID(0x180a)],
        });
      } catch (reqErr: any) {
        if (reqErr?.message?.includes('cancel') || reqErr?.message?.includes('canceled')) {
          this.updateState('disconnected', '已取消蓝牙设备选择');
          return;
        }
        // If filtering by service didn't show the device, scan without service filter
        device = await BleClient.requestDevice({
          optionalServices: [HR_SERVICE, BATTERY_SERVICE],
        });
      }

      if (!device || !device.deviceId) {
        this.updateState('disconnected', '未选中心率设备');
        return;
      }

      this.capacitorDeviceId = device.deviceId;
      this.updateState('connecting', `正在连接到 ${device.name || '心率设备'}...`);

      await BleClient.connect(device.deviceId, () => {
        this.updateState('disconnected', '蓝牙设备已断开连接');
        this.cleanup();
      });

      // Start notifications for Heart Rate
      await BleClient.startNotifications(
        device.deviceId,
        HR_SERVICE,
        HR_MEASUREMENT,
        (dataView: DataView) => {
          const reading = parseHeartRateMeasurement(dataView);
          if (this.onReadingCallback) {
            this.onReadingCallback(reading);
          }
        }
      );

      // Read battery level if available
      let batteryLevel: number | null = null;
      try {
        const batVal = await BleClient.read(device.deviceId, BATTERY_SERVICE, BATTERY_LEVEL);
        batteryLevel = batVal.getUint8(0);
      } catch {
        // Battery service not present on all devices
      }

      this.updateState('connected', `已成功连接到 ${device.name || 'BLE 心率设备'}`);

      if (this.onDeviceInfoCallback) {
        this.onDeviceInfoCallback({
          id: device.deviceId,
          name: device.name || 'Capacitor BLE 设备',
          connected: true,
          batteryLevel,
          sensorLocation: '胸部/手腕',
          mode: 'capacitor-ble',
        });
      }
    } catch (err: any) {
      console.warn('Capacitor BLE connection error:', err);
      const isUserCancel =
        err?.message?.includes('cancelled') ||
        err?.message?.includes('canceled') ||
        err?.name === 'NotFoundError';

      if (isUserCancel) {
        this.updateState('disconnected', '已取消选择');
      } else {
        this.updateState(
          'error',
          `Capacitor 原生蓝牙错误: ${err.message || '请确保手机已授予蓝牙和定位权限'}`
        );
      }
      this.cleanup();
    }
  }

  public disconnect(): void {
    if (this.capacitorDeviceId) {
      try {
        BleClient.disconnect(this.capacitorDeviceId).catch(() => {});
      } catch (e) {
        console.warn('Capacitor disconnect error', e);
      }
      this.capacitorDeviceId = null;
    }

    if (this.currentMode === 'android-bridge') {
      try {
        const bridge = window.AndroidBridge || window.AndroidBle;
        bridge?.disconnectDevice?.();
      } catch (e) {
        console.warn('Android bridge disconnect error', e);
      }
    }

    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (e) {
        console.warn('Web Bluetooth disconnect error', e);
      }
    }

    this.cleanup();
    this.updateState('disconnected', '蓝牙连接已断开');
  }

  private cleanup() {
    this.device = null;
    this.gattServer = null;
    this.hrCharacteristic = null;
    this.batteryCharacteristic = null;
  }
}

export const bluetoothService = new BluetoothService();
