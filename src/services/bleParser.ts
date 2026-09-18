import { HeartRateReading, HeartRateZone } from '../types';

export const HEART_RATE_SERVICE_UUID = 0x180d;
export const HEART_RATE_MEASUREMENT_UUID = 0x2a37;
export const BODY_SENSOR_LOCATION_UUID = 0x2a38;
export const BATTERY_SERVICE_UUID = 0x180f;
export const BATTERY_LEVEL_UUID = 0x2a19;
export const DEVICE_INFORMATION_SERVICE_UUID = 0x180a;

/**
 * Standard Bluetooth SIG Body Sensor Location enum (0x2A38)
 */
export const SENSOR_LOCATIONS: Record<number, string> = {
  0: '其它位置 (Other)',
  1: '胸部 (Chest)',
  2: '手腕 (Wrist)',
  3: '手指 (Finger)',
  4: '手部 (Hand)',
  5: '耳垂 (Ear Lobe)',
  6: '脚部 (Foot)',
};

/**
 * Parses Bluetooth SIG Heart Rate Measurement Characteristic (0x2A37) DataView
 */
export function parseHeartRateMeasurement(dataView: DataView): HeartRateReading {
  const flags = dataView.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  let offset = 1;

  let bpm = 0;
  if (is16Bit) {
    bpm = dataView.getUint16(offset, true);
    offset += 2;
  } else {
    bpm = dataView.getUint8(offset);
    offset += 1;
  }

  // Sensor Contact status (Bits 1 and 2)
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = (flags & 0x02) !== 0;
  const sensorContact = contactSupported ? contactDetected : null;

  // Energy Expended status (Bit 3)
  const energyExpendedPresent = (flags & 0x08) !== 0;
  let energyExpended: number | undefined;
  if (energyExpendedPresent && offset + 1 < dataView.byteLength) {
    energyExpended = dataView.getUint16(offset, true);
    offset += 2;
  }

  // RR-Intervals (Bit 4)
  const rrIntervalPresent = (flags & 0x10) !== 0;
  const rrIntervals: number[] = [];
  if (rrIntervalPresent) {
    while (offset + 1 < dataView.byteLength) {
      const rawRR = dataView.getUint16(offset, true);
      // Unit is 1/1024 second -> convert to milliseconds
      const rrMs = Math.round((rawRR / 1024) * 1000);
      if (rrMs > 0 && rrMs < 3000) {
        rrIntervals.push(rrMs);
      }
      offset += 2;
    }
  }

  return {
    bpm,
    timestamp: Date.now(),
    rrIntervals,
    energyExpended,
    sensorContact,
  };
}

/**
 * Standard 5-Zone Heart Rate Training Model based on max heart rate (default 190 or 220 - age)
 */
export function getHeartRateZones(maxHeartRate: number = 190): HeartRateZone[] {
  return [
    {
      name: '休闲热身 (Warm-up)',
      min: Math.round(maxHeartRate * 0.5),
      max: Math.round(maxHeartRate * 0.6) - 1,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500',
      borderColor: 'border-emerald-500',
      description: '轻度活动，促进血液循环与体温升高',
    },
    {
      name: '燃脂耐力 (Fat Burn)',
      min: Math.round(maxHeartRate * 0.6),
      max: Math.round(maxHeartRate * 0.7) - 1,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-500',
      borderColor: 'border-cyan-500',
      description: '最佳脂肪燃烧区间，增强基础有氧耐力',
    },
    {
      name: '有氧强化 (Aerobic)',
      min: Math.round(maxHeartRate * 0.7),
      max: Math.round(maxHeartRate * 0.8) - 1,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500',
      borderColor: 'border-amber-500',
      description: '提升心肺功能与机体摄氧能力',
    },
    {
      name: '乳酸阈值 (Anaerobic)',
      min: Math.round(maxHeartRate * 0.8),
      max: Math.round(maxHeartRate * 0.9) - 1,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      description: '增强乳酸耐受力，提升高强度运动表现',
    },
    {
      name: '极限冲刺 (Maximum)',
      min: Math.round(maxHeartRate * 0.9),
      max: maxHeartRate + 20,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-500',
      borderColor: 'border-rose-500',
      description: '极高强度爆发负荷，不可持续过长时间',
    },
  ];
}

export function getCurrentZone(bpm: number, zones: HeartRateZone[]): HeartRateZone | null {
  if (bpm <= 0) return null;
  for (const zone of zones) {
    if (bpm >= zone.min && bpm <= zone.max) {
      return zone;
    }
  }
  if (bpm < zones[0].min) {
    return {
      name: '静息状态 (Resting)',
      min: 0,
      max: zones[0].min - 1,
      color: 'text-slate-500 dark:text-slate-400',
      bgColor: 'bg-slate-400',
      borderColor: 'border-slate-400',
      description: '身体处于静息或极低负荷状态',
    };
  }
  return zones[zones.length - 1];
}

/**
 * Calculates RMSSD (Root Mean Square of Successive Differences) for HRV estimation
 */
export function calculateHRV(rrIntervals: number[]): number | null {
  if (rrIntervals.length < 2) return null;
  let sumSquaredDiffs = 0;
  let count = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumSquaredDiffs += diff * diff;
    count++;
  }
  if (count === 0) return null;
  return Math.round(Math.sqrt(sumSquaredDiffs / count));
}
