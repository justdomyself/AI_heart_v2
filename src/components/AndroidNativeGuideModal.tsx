import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu, ShieldCheck, Smartphone, BookOpen } from 'lucide-react';

interface AndroidNativeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidNativeGuideModal: React.FC<AndroidNativeGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'manifest' | 'kotlin-ble' | 'bridge' | 'overview'>('overview');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  if (!isOpen) return null;

  const manifestCode = `<!-- AndroidManifest.xml (Android 6.0 ~ Android 14+ 完整权限配置) -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.bleheartrate">

    <!-- 基础网络与网页权限 -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Android 11 及以下版本所需的蓝牙与精确定位权限 -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />

    <!-- Android 12+ (API 31+) 全新蓝牙权限标准 -->
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN"
        android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <!-- 声明设备必须支持 BLE 低功耗蓝牙硬件 -->
    <uses-feature
        android:name="android.hardware.bluetooth_le"
        android:required="true" />

    <application
        android:allowBackup="true"
        android:label="BLE心率监测"
        android:theme="@style/Theme.MaterialComponents.DayNight.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const kotlinBleCode = `// BleHeartRateManager.kt - 安卓原生 BLE 核心管理器 (Kotlin)
package com.example.bleheartrate

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.util.Log
import java.util.UUID

@SuppressLint("MissingPermission")
class BleHeartRateManager(private val context: Context, private val listener: BleListener) {

    private val bluetoothAdapter: BluetoothAdapter? =
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
    private var bluetoothGatt: BluetoothGatt? = null

    companion object {
        // Bluetooth SIG 标准心率服务与特征 UUID
        val HEART_RATE_SERVICE_UUID: UUID = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb")
        val HEART_RATE_MEASUREMENT_UUID: UUID = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb")
        val CLIENT_CHARACTERISTIC_CONFIG: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    }

    interface BleListener {
        fun onHeartRateReceived(bpm: Int, rrIntervals: List<Int>, energy: Int?, contact: Boolean)
        fun onConnectionStateChanged(state: String)
        fun onDeviceFound(device: BluetoothDevice, rssi: Int)
    }

    // 1. 开始扫描附近的蓝牙心率设备
    fun startScan() {
        val scanner = bluetoothAdapter?.bluetoothLeScanner ?: return
        listener.onConnectionStateChanged("scanning")
        scanner.startScan(object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult?) {
                result?.device?.let { device ->
                    listener.onDeviceFound(device, result.rssi)
                }
            }
        })
    }

    // 2. 连接目标 BLE 设备并监听 GATT 回调
    fun connect(deviceAddress: String) {
        val device = bluetoothAdapter?.getRemoteDevice(deviceAddress) ?: return
        listener.onConnectionStateChanged("connecting")
        bluetoothGatt = device.connectGatt(context, false, gattCallback)
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                listener.onConnectionStateChanged("connected")
                gatt?.discoverServices() // 发现 GATT 服务
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                listener.onConnectionStateChanged("disconnected")
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val service = gatt?.getService(HEART_RATE_SERVICE_UUID)
                val characteristic = service?.getCharacteristic(HEART_RATE_MEASUREMENT_UUID)
                if (characteristic != null) {
                    // 开启心率特征通知 (Notify)
                    gatt.setCharacteristicNotification(characteristic, true)
                    val descriptor = characteristic.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG)
                    descriptor?.let {
                        it.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        gatt.writeDescriptor(it)
                    }
                }
            }
        }

        @Deprecated("Deprecated in Java")
        override fun onCharacteristicChanged(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?) {
            if (characteristic?.uuid == HEART_RATE_MEASUREMENT_UUID) {
                parseHeartRateData(characteristic.value)
            }
        }
    }

    // 3. 解析 Bluetooth SIG 0x2A37 标准心率协议字节流
    private fun parseHeartRateData(data: ByteArray) {
        if (data.isEmpty()) return
        val flags = data[0].toInt()
        val is16Bit = (flags and 0x01) != 0
        var offset = 1

        val bpm = if (is16Bit) {
            val low = data[offset].toInt() and 0xFF
            val high = data[offset + 1].toInt() and 0xFF
            offset += 2
            (high shl 8) or low
        } else {
            val v = data[offset].toInt() and 0xFF
            offset += 1
            v
        }

        val contactDetected = (flags and 0x02) != 0
        listener.onHeartRateReceived(bpm, emptyList(), null, contactDetected)
    }

    fun disconnect() {
        bluetoothGatt?.disconnect()
        bluetoothGatt?.close()
        bluetoothGatt = null
        listener.onConnectionStateChanged("disconnected")
    }
}`;

  const bridgeCode = `// MainActivity.kt - WebView JavascriptInterface 注入与双向通信
package com.example.bleheartrate

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bleManager: BleHeartRateManager

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        bleManager = BleHeartRateManager(this, object : BleHeartRateManager.BleListener {
            override fun onHeartRateReceived(bpm: Int, rrIntervals: List<Int>, energy: Int?, contact: Boolean) {
                // 原生心率数据主动推送到网页端 onAndroidBleHeartRate 回调
                runOnUiThread {
                    webView.evaluateJavascript("window.onAndroidBleHeartRate?.($bpm, [], null, $contact);", null)
                }
            }

            override fun onConnectionStateChanged(state: String) {
                runOnUiThread {
                    webView.evaluateJavascript("window.onAndroidBleStateChange?.('$state');", null)
                }
            }

            override fun onDeviceFound(device: BluetoothDevice, rssi: Int) {
                val name = device.name ?: "BLE心率计"
                val addr = device.address
                runOnUiThread {
                    webView.evaluateJavascript("window.onAndroidBleDeviceDiscovered?.({name:'$name', address:'$addr', rssi:$rssi});", null)
                }
            }
        })

        // 配置 WebView 启用 JavaScript 和桥接对象
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webViewClient = WebViewClient()

        // 注入 window.AndroidBridge 原生对象
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        // 加载本应用 URL
        webView.loadUrl("https://your-domain.com")
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun startScan() {
            bleManager.startScan()
        }

        @JavascriptInterface
        fun connectDevice(address: String) {
            bleManager.connect(address)
        }

        @JavascriptInterface
        fun disconnectDevice() {
            bleManager.disconnect()
        }
    }
}`;

  const handleCopy = (code: string, tabKey: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabKey);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                安卓原生蓝牙集成规范与源码指南
              </h2>
              <p className="text-xs text-slate-500">
                双轨方案：Web Bluetooth 标准直连 + Android WebView JavascriptInterface 原生桥接
              </p>
            </div>
          </div>
          <button
            id="close-android-guide-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>集成架构方案</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kotlin-ble')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'kotlin-ble'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>BleHeartRateManager.kt</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bridge')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'bridge'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>MainActivity.kt (桥接注入)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'manifest'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>AndroidManifest.xml</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950/60 font-sans text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-4 max-w-3xl text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-rose-500" />
                  方案一：免原生编译，Android Chrome 直接连接
                </h3>
                <p className="mb-2">
                  Android 系统自 Chrome 56+ 起原生支持 <strong>Web Bluetooth API (navigator.bluetooth)</strong>。
                  在安卓手机 Chrome 或 Edge 浏览器中直接打开本应用，点击【Web 蓝牙】即可直接调起安卓系统的原生蓝牙配对对话框，直连任何蓝牙心率带！
                </p>
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  ⚠️ 注意：安卓系统安全策略要求开启手机系统的【定位服务】并授予浏览器蓝牙权限，且不可在跨域限制的 iframe 中调用（请在新标签页打开）。
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-500" />
                  方案二：原生 Android APK 封装 (WebView + JavascriptInterface)
                </h3>
                <p className="mb-2">
                  如果打包为独立的 Android APK 原生 App：
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 mb-3">
                  <li>
                    使用 Android Studio 创建项目，将本前端应用托管至服务器或打包进 <code>assets</code> 目录。
                  </li>
                  <li>
                    在 <code>MainActivity.kt</code> 中配置 <code>webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")</code>。
                  </li>
                  <li>
                    网页端会自动侦测 <code>window.AndroidBridge</code> 并将扫描、连接、断开指令派发给原生层，底层解析心率数据后通过 <code>window.onAndroidBleHeartRate(bpm)</code> 实时推流。
                  </li>
                </ol>
                <p className="text-slate-500">
                  点击上方选项卡可直接复制完整的 Kotlin 蓝牙服务代码及清单权限。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'kotlin-ble' && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() => handleCopy(kotlinBleCode, 'kotlin-ble')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {copiedTab === 'kotlin-ble' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>复制代码</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
                {kotlinBleCode}
              </pre>
            </div>
          )}

          {activeTab === 'bridge' && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() => handleCopy(bridgeCode, 'bridge')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {copiedTab === 'bridge' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>复制代码</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
                {bridgeCode}
              </pre>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() => handleCopy(manifestCode, 'manifest')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {copiedTab === 'manifest' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>复制代码</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
                {manifestCode}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-bold transition-colors"
          >
            完成了解
          </button>
        </div>
      </div>
    </div>
  );
};
