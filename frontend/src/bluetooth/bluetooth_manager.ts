import { BleDeviceInfo, BleConnectionStatus, ParsedHeartRateData, ParsedMotionData } from './types';
import { deviceScanner } from './device_scanner';
import { BleConnectionManager } from './ble_connection';
import { api } from '../services/api';

export class BluetoothManager {
  private connection = new BleConnectionManager();
  private currentDevice: any = null;
  private discoveredDevices: BleDeviceInfo[] = [];
  private listeners: Array<(state: {
    status: BleConnectionStatus;
    device?: BleDeviceInfo;
    latestHeartRate?: ParsedHeartRateData;
    latestMotion?: ParsedMotionData;
    error?: string;
  }) => void> = [];

  private latestHeartRate?: ParsedHeartRateData;
  private latestMotion?: ParsedMotionData;
  private lastErrorMessage?: string;

  constructor() {
    this.connection.onStatusChange((status, info) => {
      this.notify();
    });
  }

  public subscribe(listener: (state: {
    status: BleConnectionStatus;
    device?: BleDeviceInfo;
    latestHeartRate?: ParsedHeartRateData;
    latestMotion?: ParsedMotionData;
    error?: string;
  }) => void) {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getState() {
    return {
      status: this.connection.getStatus(),
      device: this.connection.getDeviceInfo(),
      latestHeartRate: this.latestHeartRate,
      latestMotion: this.latestMotion,
      error: this.lastErrorMessage
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  public isSupported(): boolean {
    return deviceScanner.isSupported();
  }

  /**
   * Scans for and initiates pairing with a BLE wearable.
   */
  public async scanAndConnect(): Promise<boolean> {
    this.lastErrorMessage = undefined;
    try {
      const rawDevice = await deviceScanner.scanForDevice();
      if (!rawDevice) {
        throw new Error('No device selected.');
      }

      this.currentDevice = rawDevice;
      const connected = await this.connection.connectToDevice(
        rawDevice,
        (hrData: ParsedHeartRateData) => {
          this.latestHeartRate = hrData;
          this.notify();
          // Forward clean telemetry to backend in LIVE mode
          api.sendWatchTelemetry(
            hrData.heartRate,
            hrData.heartRate > 100 ? 'ELEVATED' : 'RESTING',
            hrData.contactDetected ? 'CONNECTED' : 'DISCONNECTED'
          ).catch(() => {});
        },
        (motionData: ParsedMotionData) => {
          this.latestMotion = motionData;
          this.notify();
          api.sendSensorTelemetry(
            motionData.accelX,
            motionData.accelY,
            motionData.accelZ,
            0,
            0,
            0
          ).catch(() => {});
        }
      );

      if (!connected) {
        this.lastErrorMessage = 'Failed to pair or discover supported GATT characteristics on selected device.';
        this.notify();
      }

      return connected;
    } catch (err: any) {
      console.warn('Bluetooth Manager Scan/Connect Error:', err.message);
      this.lastErrorMessage = err.message;
      this.notify();
      return false;
    }
  }

  public disconnect() {
    this.connection.disconnect();
    this.currentDevice = null;
    this.latestHeartRate = undefined;
    this.latestMotion = undefined;
    this.lastErrorMessage = undefined;
    this.notify();
  }

  public isConnected(): boolean {
    return this.connection.isConnected();
  }

  public getHeartRate(): number | undefined {
    return this.latestHeartRate?.heartRate;
  }
}

export const bluetoothManager = new BluetoothManager();
export * from './types';
export * from './data_parser';
export * from './device_scanner';
export * from './ble_connection';
export * from './heart_rate_service';
export * from './motion_service';
