import { BleDeviceInfo, GATT_SERVICES } from './types';

export class DeviceScanner {
  /**
   * Checks whether Web Bluetooth API is supported by the client browser.
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Requests user to pair/scan for a Bluetooth Low Energy device exposing Heart Rate or Sensor services.
   * Returns standard BluetoothDevice instance or throws explicit descriptive error.
   */
  public async scanForDevice(): Promise<any> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Bluefy on iOS.'
      );
    }

    try {
      const navBluetooth = (navigator as any).bluetooth;
      
      // Request device with primary Heart Rate filter or broad optional services for smartwatches
      const device = await navBluetooth.requestDevice({
        filters: [
          { services: [GATT_SERVICES.HEART_RATE] },
          { namePrefix: 'Watch' },
          { namePrefix: 'Band' },
          { namePrefix: 'Fit' },
          { namePrefix: 'Garmin' },
          { namePrefix: 'Polar' },
          { namePrefix: 'Apple' },
          { namePrefix: 'Galaxy' },
          { namePrefix: 'Mi ' },
          { namePrefix: 'Amazfit' }
        ],
        optionalServices: [
          GATT_SERVICES.HEART_RATE,
          GATT_SERVICES.BATTERY,
          GATT_SERVICES.DEVICE_INFO,
          GATT_SERVICES.GENERIC_ACCESS,
          GATT_SERVICES.MOTION_SERVICE_UUID
        ]
      });

      return device;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('Device scan cancelled by user or no device selected.');
      } else if (err.name === 'SecurityError') {
        throw new Error('Bluetooth access blocked by browser security policy. Ensure HTTPS/localhost is used.');
      } else {
        throw new Error(`Bluetooth scan failed: ${err.message || err}`);
      }
    }
  }

  /**
   * Creates a clean BleDeviceInfo object from a raw Web Bluetooth device
   */
  public createDeviceInfo(device: any): BleDeviceInfo {
    return {
      id: device.id || 'unknown_id',
      name: device.name || 'Unnamed BLE Wearable',
      connected: !!(device.gatt && device.gatt.connected),
      servicesSupported: [],
      hasHeartRate: false,
      hasMotion: false,
      hasBattery: false
    };
  }
}

export const deviceScanner = new DeviceScanner();
