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
  private simulationInterval: any = null;
  private simulatedBpm: number = 72;
  private simulatedBattery: number = 95;

  private onReadingCallback?: (reading: HeartRateReading) => void;
  private onStateChangeCallback?: (state: ConnectionState, message?: string) => void;
  private onDeviceInfoCallback?: (info: BleDeviceInfo) => void;

  public currentMode: BluetoothMode = 'simulation';
  public currentState: ConnectionState = 'disconnected';

  constructor() {
    this.setupAndroidCallbacks();
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
  public async connect(mode: BluetoothMode, simulatedTargetBpm: number = 75): Promise<void> {
    this.currentMode = mode;
    this.disconnect();

    if (mode === 'android-bridge') {
      await this.connectAndroidBridge();
    } else if (mode === 'web-bluetooth') {
      await this.connectWebBluetooth();
    } else {
      this.startSimulation(simulatedTargetBpm);
    }
  }

  /**
   * Connect via Web Bluetooth API (Standard Chrome / Android Web Bluetooth)
   */
  private async connectWebBluetooth(): Promise<void> {
    if (!this.isWebBluetoothAvailable()) {
      this.updateState(
        'error',
        '当前浏览器不支持 Web Bluetooth API。请使用安卓 Chrome 浏览器、Edge 或在设置中切换为模拟/安卓原生模式。'
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
          '浏览器限制：内嵌 iframe 窗口无法直接调用蓝牙权限。请点击右上角【新标签页打开】以使用真机蓝牙，或切换至模拟/安卓原生模式。'
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
        '未检测到 Android 原生桥接对象 (window.AndroidBridge)。请在 Android 原生 WebView App 中打开此页面，或在模拟器中注入 JavascriptInterface。'
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
          batteryLevel: 92,
          sensorLocation: '原生底层适配',
          mode: 'android-bridge',
        });
      }
    } catch (err: any) {
      this.updateState('error', `调用 Android 原生接口失败: ${err.message}`);
    }
  }

  /**
   * High-fidelity simulation mode for instant browser & iframe testing
   */
  private startSimulation(initialBpm: number = 75): void {
    this.simulatedBpm = initialBpm;
    this.simulatedBattery = 98;
    this.updateState('connecting', '正在启动模拟蓝牙心率设备...');

    setTimeout(() => {
      this.updateState('connected', '已连接虚拟心率设备 (Polar H10 模拟器)');

      if (this.onDeviceInfoCallback) {
        this.onDeviceInfoCallback({
          id: 'sim-polar-h10',
          name: 'Polar H10 心率带 (模拟)',
          connected: true,
          batteryLevel: this.simulatedBattery,
          sensorLocation: '胸部 (Chest)',
          mode: 'simulation',
        });
      }

      let tick = 0;
      this.simulationInterval = setInterval(() => {
        tick++;
        // Natural physiological respiratory sinus arrhythmia (RSA) and slight random drift
        const variation = Math.sin(tick / 5) * 3 + (Math.random() * 2 - 1);
        const currentBpm = Math.max(50, Math.min(195, Math.round(this.simulatedBpm + variation)));
        const rrMs = Math.round(60000 / currentBpm + (Math.random() * 20 - 10));

        if (tick % 100 === 0 && this.simulatedBattery > 10) {
          this.simulatedBattery -= 1;
        }

        if (this.onReadingCallback) {
          this.onReadingCallback({
            bpm: currentBpm,
            timestamp: Date.now(),
            rrIntervals: [rrMs],
            energyExpended: Math.round(tick * 0.15),
            sensorContact: true,
          });
        }
      }, 1000);
    }, 600);
  }

  public setSimulatedTargetBpm(bpm: number) {
    this.simulatedBpm = Math.max(50, Math.min(200, bpm));
  }

  public disconnect(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
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
