import { Buffer } from 'buffer';
import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import Toast from 'react-native-toast-message';

// BLE UUIDs and Commands
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const CMD_START = 'gwc';
const CMD_TARE = 'st';

const useBle = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('Scanning for PROZIS Bit Scale...');
  const [weight, setWeight] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);

  const bleManager = new BleManager();

  const writeCommand = useCallback(async (dev: Device, command: string) => {
    const services = await dev.services();
    const service = services.find((s) => s.uuid === SERVICE_UUID);
    if (!service) throw new Error('RX service not found');
    const characteristics = await service.characteristics();
    const rxChar = characteristics.find((c) => c.uuid === RX_CHAR_UUID);
    if (!rxChar) throw new Error('RX characteristic not found');
    const encoded = new TextEncoder().encode(command);
    await rxChar.writeWithoutResponse(Buffer.from(encoded).toString('base64'));
  }, []);

  const tareScale = useCallback(async () => {
    if (!device) {
      return;
    }
    try {
      await writeCommand(device, CMD_TARE);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Tare error', text2: error.message });
    }
  }, [device, writeCommand]);

  useEffect(() => {
    tareScale();
  }, [device, tareScale]);

  const subscribeToWeight = useCallback(async (dev: Device) => {
    dev.monitorCharacteristicForService(
      SERVICE_UUID,
      TX_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          Toast.show({
            type: 'error',
            text1: 'BLE error',
            text2: error.message,
          });
          return;
        }
        const rawValue = characteristic?.value;
        if (rawValue) {
          try {
            const buffer = Buffer.from(rawValue, 'base64');
            const hexValue = buffer.toString('hex');
            const batteryHex = hexValue.slice(2, 4);
            const batteryInt = parseInt(batteryHex, 16);
            if (batteryInt <= 100 && batteryInt >= 0) {
              setBattery(batteryInt);
            }
            const weightHex = hexValue.slice(-4);
            const weightInt = parseInt(weightHex, 16);
            const grams = weightInt > 32767 ? weightInt - 65536 : weightInt;
            setWeight(grams);
          } catch {
            setBattery(null);
          }
        }
      },
    );
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        if (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !==
            'granted' ||
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !==
            'granted' ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
            'granted'
        ) {
          Toast.show({
            type: 'error',
            text1: 'Bluetooth permissions not granted.',
          });
          return false;
        }
      }
      return true;
    };

    const scanAndConnect = async () => {
      setMessage('Scanning for PROZIS Bit Scale...');
      bleManager.startDeviceScan(null, null, async (error, scannedDevice) => {
        if (error) {
          Toast.show({
            type: 'error',
            text1: 'Scan error',
            text2: error.message,
          });
          return;
        }
        if (scannedDevice?.name === 'PROZIS Bit Scale') {
          bleManager.stopDeviceScan();
          setMessage('Connecting to PROZIS Bit Scale...');
          try {
            const connected = await bleManager.connectToDevice(
              scannedDevice.id,
            );
            await connected.discoverAllServicesAndCharacteristics();
            setDevice(connected);
            setIsConnected(true);
            setMessage('Connected to PROZIS Bit Scale.');
            await writeCommand(connected, CMD_START);
            await subscribeToWeight(connected);
          } catch (err: any) {
            console.error('Connection error:', err);
            setMessage('Connection failed.');
            Toast.show({
              type: 'error',
              text1: 'Connection error',
              text2: err.message,
            });
          }
        }
      });
    };

    (async () => {
      if (await requestPermissions()) {
        scanAndConnect();
      }
    })();

    return () => {
      bleManager.destroy();
    };
    // eslint-disable-next-line
  }, [subscribeToWeight, writeCommand]);

  return { device, isConnected, message, tareScale, weight, battery };
};

export default useBle;
