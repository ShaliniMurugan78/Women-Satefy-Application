// Bluetooth Types and GATT Constants for Web Bluetooth API
export interface BleDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  rssi?: number;
  batteryLevel?: number;
  servicesSupported: string[];
  hasHeartRate: boolean;
  hasMotion: boolean;
  hasBattery: boolean;
}

export interface ParsedHeartRateData {
  heartRate: number;
  contactDetected: boolean;
  energyExpended?: number;
  rrIntervals?: number[];
  timestamp: string;
}

export interface ParsedMotionData {
  accelX: number;
  accelY: number;
  accelZ: number;
  magnitude: number;
  gyroX?: number;
  gyroY?: number;
  gyroZ?: number;
  activity: 'STATIONARY' | 'WALKING' | 'RUNNING' | 'FALL_DETECTED' | 'STRUGGLE' | 'UNKNOWN';
  timestamp: string;
}

export type BleConnectionStatus = 
  | 'DISCONNECTED'
  | 'SCANNING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCOVERING_SERVICES'
  | 'SUBSCRIBED'
  | 'ERROR'
  | 'UNSUPPORTED';

export const GATT_SERVICES = {
  HEART_RATE: 'heart_rate',                      // 0x180D standard
  BATTERY: 'battery_service',                    // 0x180F standard
  DEVICE_INFO: 'device_information',            // 0x180A standard
  GENERIC_ACCESS: 'generic_access',              // 0x1800
  // Standard UUIDs in 16-bit hex
  HEART_RATE_UUID: 0x180D,
  BATTERY_UUID: 0x180F,
  DEVICE_INFO_UUID: 0x180A,
  // Custom or vendor IMU / motion services
  GENERIC_ACCEL_UUID: '0000ffa0-0000-1000-8000-00805f9b34fb',
  MOTION_SERVICE_UUID: 'e95d0753-251d-470a-a062-fa1922dfa9a8', // BBC micro:bit / Nordic accelerometer standard
};

export const GATT_CHARACTERISTICS = {
  HEART_RATE_MEASUREMENT: 'heart_rate_measurement', // 0x2A37
  BODY_SENSOR_LOCATION: 'body_sensor_location',     // 0x2A38
  BATTERY_LEVEL: 'battery_level',                   // 0x2A19
  MANUFACTURER_NAME: 'manufacturer_name_string',     // 0x2A29
  MODEL_NUMBER: 'model_number_string',              // 0x2A24
  ACCELEROMETER_DATA: 'e95dca4b-251d-470a-a062-fa1922dfa9a8',
};
