import { Buffer } from 'buffer';

export const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const CMD_START = 'gwc';
export const CMD_TARE = 'st';
export const TARGET_SCALE_NAME = 'prozis bit scale';

export type ScaleNotification = {
  battery: number | null;
  weight: number | null;
};

export const decodeScaleNotification = (
  rawBase64Value: string,
): ScaleNotification => {
  const buffer = Buffer.from(rawBase64Value, 'base64');
  const hexValue = buffer.toString('hex');

  const batteryHex = hexValue.slice(2, 4);
  const batteryInt = Number.parseInt(batteryHex, 16);
  const battery =
    batteryInt <= 100 && batteryInt >= 0 && !Number.isNaN(batteryInt)
      ? batteryInt
      : null;

  const weightHex = hexValue.slice(-4);
  const weightInt = Number.parseInt(weightHex, 16);
  if (Number.isNaN(weightInt)) {
    return { battery, weight: null };
  }

  const weight = weightInt > 32767 ? weightInt - 65536 : weightInt;
  return { battery, weight };
};
