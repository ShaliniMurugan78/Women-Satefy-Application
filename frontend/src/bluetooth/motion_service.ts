import { GATT_SERVICES, GATT_CHARACTERISTICS, ParsedMotionData } from './types';
import { parseMotionData } from './data_parser';

export class BleMotionService {
  private characteristic: any = null;
  private onDataCallback: ((data: ParsedMotionData) => void) | null = null;
  public isSupportedOnDevice = false;

  public async startService(
    gattServer: any,
    onData: (data: ParsedMotionData) => void
  ): Promise<boolean> {
    this.onDataCallback = onData;

    try {
      // Try to query motion service UUID
      const service = await gattServer.getPrimaryService(GATT_SERVICES.MOTION_SERVICE_UUID);
      if (!service) {
        this.isSupportedOnDevice = false;
        return false;
      }

      this.characteristic = await service.getCharacteristic(
        GATT_CHARACTERISTICS.ACCELEROMETER_DATA
      );
      if (!this.characteristic) {
        this.isSupportedOnDevice = false;
        return false;
      }

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValue);
      this.isSupportedOnDevice = true;
      return true;
    } catch (err: any) {
      // Most consumer BLE smartwatches lock IMU behind proprietary encrypted protocols.
      // We honestly record that the wearable does not expose raw IMU characteristics.
      this.isSupportedOnDevice = false;
      return false;
    }
  }

  private handleCharacteristicValue = (event: any) => {
    try {
      const dataView: DataView = event.target.value;
      if (!dataView) return;
      const parsed = parseMotionData(dataView);
      if (this.onDataCallback) {
        this.onDataCallback(parsed);
      }
    } catch (e) {
      console.error('Error parsing BLE motion frame:', e);
    }
  };

  public stopService() {
    if (this.characteristic) {
      try {
        this.characteristic.removeEventListener('characteristicvaluechanged', this.handleCharacteristicValue);
        this.characteristic.stopNotifications().catch(() => {});
      } catch (e) {}
      this.characteristic = null;
    }
    this.isSupportedOnDevice = false;
    this.onDataCallback = null;
  }
}
