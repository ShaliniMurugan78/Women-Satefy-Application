import { BleDeviceInfo, BleConnectionStatus } from './types';
import { BleHeartRateService } from './heart_rate_service';
import { BleMotionService } from './motion_service';

export class BleConnectionManager {
  private device: any = null;
  private gattServer: any = null;
  private status: BleConnectionStatus = 'DISCONNECTED';
  private statusListeners: Array<(status: BleConnectionStatus, info?: BleDeviceInfo) => void> = [];
  private autoReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  public heartRateService = new BleHeartRateService();
  public motionService = new BleMotionService();

  public onStatusChange(listener: (status: BleConnectionStatus, info?: BleDeviceInfo) => void) {
    this.statusListeners.push(listener);
    listener(this.status, this.getDeviceInfo());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyStatus(status: BleConnectionStatus) {
    this.status = status;
    const info = this.getDeviceInfo();
    this.statusListeners.forEach(l => l(status, info));
  }

  public getStatus(): BleConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return !!(this.gattServer && this.gattServer.connected);
  }

  public getDeviceInfo(): BleDeviceInfo | undefined {
    if (!this.device) return undefined;
    return {
      id: this.device.id,
      name: this.device.name || 'Bluetooth Wearable',
      connected: this.isConnected(),
      servicesSupported: [],
      hasHeartRate: false,
      hasMotion: this.motionService.isSupportedOnDevice,
      hasBattery: false
    };
  }

  public async connectToDevice(
    device: any,
    onHeartRate?: (data: any) => void,
    onMotion?: (data: any) => void
  ): Promise<boolean> {
    this.device = device;
    this.reconnectAttempts = 0;

    // Listen for unexpected GATT disconnections
    this.device.addEventListener('gattserverdisconnected', this.handleDisconnection);

    return this.establishGattConnection(onHeartRate, onMotion);
  }

  private async establishGattConnection(
    onHeartRate?: (data: any) => void,
    onMotion?: (data: any) => void
  ): Promise<boolean> {
    try {
      this.notifyStatus('CONNECTING');
      this.gattServer = await this.device.gatt.connect();

      this.notifyStatus('DISCOVERING_SERVICES');

      // Discover and start Heart Rate Service
      let hrOk = false;
      if (onHeartRate) {
        hrOk = await this.heartRateService.startService(this.gattServer, onHeartRate);
      }

      // Discover and start Motion Service if available
      let motionOk = false;
      if (onMotion) {
        motionOk = await this.motionService.startService(this.gattServer, onMotion);
      }

      if (hrOk || motionOk) {
        this.notifyStatus('SUBSCRIBED');
      } else {
        this.notifyStatus('CONNECTED');
      }

      return true;
    } catch (err: any) {
      console.error('Failed to establish BLE GATT connection:', err);
      this.notifyStatus('ERROR');
      return false;
    }
  }

  private handleDisconnection = async () => {
    console.warn(`BLE device ${this.device?.name} disconnected.`);
    this.notifyStatus('DISCONNECTED');
    this.heartRateService.stopService();
    this.motionService.stopService();

    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts && this.device) {
      this.reconnectAttempts++;
      console.info(`Attempting BLE auto-reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        if (this.device && !this.isConnected()) {
          this.establishGattConnection();
        }
      }, 2000);
    }
  };

  public disconnect() {
    this.autoReconnect = false;
    if (this.gattServer && this.gattServer.connected) {
      try {
        this.gattServer.disconnect();
      } catch (e) {}
    }
    this.heartRateService.stopService();
    this.motionService.stopService();
    this.device = null;
    this.gattServer = null;
    this.notifyStatus('DISCONNECTED');
  }
}
