import { GATT_SERVICES, GATT_CHARACTERISTICS, ParsedHeartRateData } from './types';
import { parseHeartRateMeasurement } from './data_parser';

export class BleHeartRateService {
  private characteristic: any = null;
  private onDataCallback: ((data: ParsedHeartRateData) => void) | null = null;

  public async startService(
    gattServer: any,
    onData: (data: ParsedHeartRateData) => void
  ): Promise<boolean> {
    this.onDataCallback = onData;

    try {
      // 1. Get Primary Service
      const service = await gattServer.getPrimaryService(GATT_SERVICES.HEART_RATE);
      if (!service) {
        throw new Error('Heart Rate service (0x180D) not found on device.');
      }

      // 2. Get Heart Rate Measurement Characteristic
      this.characteristic = await service.getCharacteristic(
        GATT_CHARACTERISTICS.HEART_RATE_MEASUREMENT
      );
      if (!this.characteristic) {
        throw new Error('Heart Rate measurement characteristic (0x2A37) not found.');
      }

      // 3. Start Notifications
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValue);

      console.info('BLE Heart Rate service initialized and notifications active.');
      return true;
    } catch (err: any) {
      console.warn('Could not initialize BLE Heart Rate Service:', err.message);
      return false;
    }
  }

  private handleCharacteristicValue = (event: any) => {
    try {
      const dataView: DataView = event.target.value;
      if (!dataView) return;
      const parsed = parseHeartRateMeasurement(dataView);
      if (this.onDataCallback) {
        this.onDataCallback(parsed);
      }
    } catch (e) {
      console.error('Error parsing BLE heart rate frame:', e);
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
    this.onDataCallback = null;
  }
}
