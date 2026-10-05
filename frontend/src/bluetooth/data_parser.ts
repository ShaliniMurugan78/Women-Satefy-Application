import { ParsedHeartRateData, ParsedMotionData } from './types';

/**
 * Parses standard Bluetooth GATT Heart Rate Measurement Characteristic (0x2A37).
 * Specification: https://www.bluetooth.com/specifications/gatt/
 * 
 * Flags field (Byte 0):
 * - Bit 0: Heart Rate Value Format (0 = UINT8, 1 = UINT16)
 * - Bit 1-2: Sensor Contact Status (10 or 11 = Sensor Contact Supported and Detected)
 * - Bit 3: Energy Expended Status (1 = Present)
 * - Bit 4: RR-Interval (1 = One or more RR-Interval values present)
 */
export function parseHeartRateMeasurement(dataView: DataView): ParsedHeartRateData {
  const flags = dataView.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = contactSupported ? (flags & 0x02) !== 0 : true;
  const energyExpendedPresent = (flags & 0x08) !== 0;
  const rrIntervalPresent = (flags & 0x10) !== 0;

  let offset = 1;
  let heartRate = 0;

  if (is16Bit) {
    heartRate = dataView.getUint16(offset, true); // Little endian
    offset += 2;
  } else {
    heartRate = dataView.getUint8(offset);
    offset += 1;
  }

  let energyExpended: number | undefined;
  if (energyExpendedPresent && offset + 2 <= dataView.byteLength) {
    energyExpended = dataView.getUint16(offset, true);
    offset += 2;
  }

  const rrIntervals: number[] = [];
  if (rrIntervalPresent) {
    while (offset + 2 <= dataView.byteLength) {
      const rr = dataView.getUint16(offset, true);
      // RR intervals in 1/1024 seconds
      rrIntervals.push(Math.round((rr / 1024) * 1000));
      offset += 2;
    }
  }

  return {
    heartRate,
    contactDetected,
    energyExpended,
    rrIntervals: rrIntervals.length > 0 ? rrIntervals : undefined,
    timestamp: new Date().toISOString()
  };
}

/**
 * Parses raw accelerometer bytes from standard/custom BLE motion characteristics.
 */
export function parseMotionData(dataView: DataView): ParsedMotionData {
  let accelX = 0;
  let accelY = 0;
  let accelZ = 9.8;

  if (dataView.byteLength >= 6) {
    // Standard int16 representation in milli-g (mg)
    accelX = dataView.getInt16(0, true) / 1000.0 * 9.80665;
    accelY = dataView.getInt16(2, true) / 1000.0 * 9.80665;
    accelZ = dataView.getInt16(4, true) / 1000.0 * 9.80665;
  }

  const magnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

  let activity: ParsedMotionData['activity'] = 'STATIONARY';
  if (magnitude > 25.0) {
    activity = 'FALL_DETECTED';
  } else if (magnitude > 16.0) {
    activity = 'RUNNING';
  } else if (magnitude > 11.5) {
    activity = 'WALKING';
  }

  return {
    accelX: Math.round(accelX * 100) / 100,
    accelY: Math.round(accelY * 100) / 100,
    accelZ: Math.round(accelZ * 100) / 100,
    magnitude: Math.round(magnitude * 100) / 100,
    activity,
    timestamp: new Date().toISOString()
  };
}
