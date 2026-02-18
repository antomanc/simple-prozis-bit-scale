import { Buffer } from 'buffer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import Toast from 'react-native-toast-message';

// BLE UUIDs and Commands
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const CMD_START = 'gwc';
const CMD_TARE = 'st';

const TARGET_SCALE_NAME = 'prozis bit scale';

type ConnectionPhase =
  | 'idle'
  | 'bluetooth_off'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

const useBle = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('Scanning for PROZIS Bit Scale...');
  const [weight, setWeight] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>('idle');

  const bleManagerRef = useRef<BleManager | null>(null);
  const bleStateSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const disconnectedSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const weightSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const isConnectingRef = useRef(false);
  const lastKnownDeviceIdRef = useRef<string | null>(null);
  const isConnectedRef = useRef(false);
  const connectionPhaseRef = useRef<ConnectionPhase>('idle');

  if (bleManagerRef.current === null) {
    bleManagerRef.current = new BleManager();
  }

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return typeof error === 'string' ? error : 'Unknown error';
  };

  const isTargetScale = (scannedDevice: Device) => {
    const advertisedName = (scannedDevice.localName ?? scannedDevice.name ?? '')
      .trim()
      .toLowerCase();

    if (!advertisedName) return false;
    if (advertisedName === TARGET_SCALE_NAME) return true;
    return advertisedName.includes('prozis') && advertisedName.includes('scale');
  };

  const writeCommand = useCallback(async (dev: Device, command: string) => {
    const services = await dev.services();
    const service = services.find((s) => s.uuid === SERVICE_UUID);
    if (!service) throw new Error('RX service not found');
    const characteristics = await service.characteristics();
    const rxChar = characteristics.find((c) => c.uuid === RX_CHAR_UUID);
    if (!rxChar) throw new Error('RX characteristic not found');
    await rxChar.writeWithoutResponse(Buffer.from(command, 'utf8').toString('base64'));
  }, []);

  const tareScale = useCallback(async () => {
    if (!device) {
      return;
    }
    try {
      await writeCommand(device, CMD_TARE);
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: 'Tare error', text2: getErrorMessage(error) });
    }
  }, [device, writeCommand]);

  useEffect(() => {
    tareScale();
  }, [device, tareScale]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    connectionPhaseRef.current = connectionPhase;
  }, [connectionPhase]);

  const subscribeToWeight = useCallback(async (dev: Device) => {
    weightSubscriptionRef.current?.remove();
    weightSubscriptionRef.current = dev.monitorCharacteristicForService(
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

  const clearDeviceSubscriptions = useCallback(() => {
    disconnectedSubscriptionRef.current?.remove();
    disconnectedSubscriptionRef.current = null;
    weightSubscriptionRef.current?.remove();
    weightSubscriptionRef.current = null;
  }, []);

  const connectToScale = useCallback(
    async (scaleDevice: Device, phase: ConnectionPhase) => {
      const bleManager = bleManagerRef.current;
      if (!bleManager) return;
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;

      setConnectionPhase(phase);
      setMessage(
        phase === 'reconnecting'
          ? 'Reconnecting to PROZIS Bit Scale...'
          : 'Connecting to PROZIS Bit Scale...'
      );

      try {
        clearDeviceSubscriptions();

        const connected = await bleManager.connectToDevice(scaleDevice.id);
        await connected.discoverAllServicesAndCharacteristics();

        lastKnownDeviceIdRef.current = connected.id;

        disconnectedSubscriptionRef.current = connected.onDisconnected(() => {
          setIsConnected(false);
          setDevice(null);
          setConnectionPhase('reconnecting');
          setMessage('Scale disconnected. Reconnecting...');
        });

        setDevice(connected);
        setIsConnected(true);
        setConnectionPhase('connected');
        setMessage('Connected to PROZIS Bit Scale.');

        await writeCommand(connected, CMD_START);
        await subscribeToWeight(connected);
      } catch (err: unknown) {
        setIsConnected(false);
        setDevice(null);
        if (phase === 'reconnecting') {
          setConnectionPhase('reconnecting');
          setMessage('Reconnecting to PROZIS Bit Scale...');
        } else {
          setConnectionPhase('error');
          setMessage('Connection failed.');
          Toast.show({
            type: 'error',
            text1: 'Connection error',
            text2: getErrorMessage(err),
          });
        }
      } finally {
        isConnectingRef.current = false;
      }
    },
    [clearDeviceSubscriptions, subscribeToWeight, writeCommand],
  );

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
      const bleManager = bleManagerRef.current;
      if (!bleManager) return;
      try {
        const state = await bleManager.state();
        if (state !== 'PoweredOn') {
          setConnectionPhase('bluetooth_off');
          setMessage('Turn on Bluetooth to scan for the scale...');

          bleStateSubscriptionRef.current?.remove();
          const sub = bleManager.onStateChange((nextState) => {
            if (nextState === 'PoweredOn') {
              sub.remove();
              bleStateSubscriptionRef.current = null;
              scanAndConnect();
            }
          }, true);
          bleStateSubscriptionRef.current = sub;
          return;
        }
      } catch {
      }

      const stickyId = lastKnownDeviceIdRef.current;
      if (stickyId) {
        setConnectionPhase('reconnecting');
        setMessage('Reconnecting to PROZIS Bit Scale...');
        try {
          const knownDevice = await bleManager.devices([stickyId]);
          if (knownDevice[0]) {
            await connectToScale(knownDevice[0], 'reconnecting');
            return;
          }
        } catch {
        }
      }

      setConnectionPhase(stickyId ? 'reconnecting' : 'scanning');
      setMessage(
        stickyId
          ? 'Reconnecting to PROZIS Bit Scale...'
          : 'Scanning for PROZIS Bit Scale...',
      );

      bleManager.startDeviceScan(null, null, async (error, scannedDevice) => {
        if (error) {
          Toast.show({
            type: 'error',
            text1: 'Scan error',
            text2: error.message,
          });
          setConnectionPhase('error');
          return;
        }

        if (!scannedDevice) return;
        if (!isTargetScale(scannedDevice)) return;
        if (isConnectingRef.current) return;

        bleManager.stopDeviceScan();
        await connectToScale(scannedDevice, stickyId ? 'reconnecting' : 'connecting');
      });
    };

    const reconnectLoop = setInterval(() => {
      if (isConnectedRef.current) return;
      if (connectionPhaseRef.current !== 'reconnecting') return;
      if (isConnectingRef.current) return;
      scanAndConnect();
    }, 1200);

    (async () => {
      if (await requestPermissions()) {
        scanAndConnect();
      }
    })();

    return () => {
      clearInterval(reconnectLoop);

      bleStateSubscriptionRef.current?.remove();
      bleStateSubscriptionRef.current = null;

      clearDeviceSubscriptions();

      bleManagerRef.current?.stopDeviceScan();
      bleManagerRef.current?.destroy();
      bleManagerRef.current = null;
    };
  }, [connectToScale]);

  return {
    device,
    isConnected,
    message,
    connectionPhase,
    tareScale,
    weight,
    battery,
  };
};

export default useBle;
