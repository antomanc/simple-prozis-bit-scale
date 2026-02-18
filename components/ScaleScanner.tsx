import { useKeepAwake } from 'expo-keep-awake';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Switch,
  useTheme,
} from 'react-native-paper';
import useBle from '../hooks/useBle';
import { ThemedText } from './ThemedText';

const ScaleScanner = () => {
  const {
    weight,
    message,
    tareScale,
    disconnectScale,
    reconnectScale,
    isConnected,
    battery,
    connectionPhase,
  } = useBle();
  const theme = useTheme();

  // Keep screen awake during BLE operations
  useKeepAwake();

  // State for saved weights
  const [savedWeights, setSavedWeights] = useState<number[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const lastSavedWeightRef = useRef<number | null>(null);
  const autoSaveArmedRef = useRef(false);
  const stableSinceRef = useRef<number | null>(null);
  const stableValueRef = useRef<number | null>(null);
  const lastSeenWeightRef = useRef<number | null>(null);

  const saveWeightValue = (grams: number) => {
    setSavedWeights((prev) => [grams, ...prev]);
  };

  // Save current weight
  const handleSaveWeight = async () => {
    if (weight === null || isNaN(Number(weight))) return;
    const grams = Number(weight);
    saveWeightValue(grams);
    lastSavedWeightRef.current = grams;
    autoSaveArmedRef.current = false;
    stableSinceRef.current = null;
    stableValueRef.current = null;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSaveAndTare = async () => {
    if (weight === null || isNaN(Number(weight))) return;
    const grams = Number(weight);
    saveWeightValue(grams);
    lastSavedWeightRef.current = grams;
    autoSaveArmedRef.current = false;
    stableSinceRef.current = null;
    stableValueRef.current = null;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await tareScale();
  };

  const handleTare = async () => {
    autoSaveArmedRef.current = false;
    stableSinceRef.current = null;
    stableValueRef.current = null;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await tareScale();
  };

  // Delete a single weight
  const handleDeleteWeight = (index: number) => {
    setSavedWeights((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset all saved weights
  const handleResetWeights = () => {
    setSavedWeights([]);
  };

  const handleCopySession = async () => {
    const text = savedWeights.map((w) => `${w}g`).join('\n');
    await Clipboard.setStringAsync(text ? `${text}\n` : '');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    autoSaveArmedRef.current = false;
    stableSinceRef.current = null;
    stableValueRef.current = null;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await disconnectScale();
    setDisconnecting(false);
  };

  const handleReconnect = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reconnectScale();
  };

  useEffect(() => {
    if (!autoSaveEnabled) {
      autoSaveArmedRef.current = false;
      stableSinceRef.current = null;
      stableValueRef.current = null;
      return;
    }
    if (!isConnected) return;
    if (weight === null || isNaN(Number(weight))) return;

    const grams = Number(weight);
    const now = Date.now();

    const AUTO_SAVE_STABLE_MS = 2000;
    const AUTO_SAVE_TOLERANCE_G = 1;
    const AUTO_SAVE_MIN_G = 2;
    const AUTO_SAVE_MIN_DELTA_G = 2;

    const lastSaved = lastSavedWeightRef.current;
    const lastSeen = lastSeenWeightRef.current;
    lastSeenWeightRef.current = grams;

    const differsFromLastSaved =
      lastSaved === null || Math.abs(grams - lastSaved) >= AUTO_SAVE_MIN_DELTA_G;
    const weightIsMeaningful = Math.abs(grams) >= AUTO_SAVE_MIN_G;

    if (!autoSaveArmedRef.current && differsFromLastSaved && weightIsMeaningful) {
      autoSaveArmedRef.current = true;
      stableSinceRef.current = null;
      stableValueRef.current = null;
    }

    if (!autoSaveArmedRef.current) return;

    if (lastSeen !== null && Math.abs(grams - lastSeen) > AUTO_SAVE_TOLERANCE_G) {
      stableSinceRef.current = null;
      stableValueRef.current = null;
      return;
    }

    if (stableSinceRef.current === null || stableValueRef.current === null) {
      stableSinceRef.current = now;
      stableValueRef.current = grams;
      return;
    }

    if (Math.abs(grams - stableValueRef.current) > AUTO_SAVE_TOLERANCE_G) {
      stableSinceRef.current = now;
      stableValueRef.current = grams;
      return;
    }

    if (now - stableSinceRef.current < AUTO_SAVE_STABLE_MS) return;

    const shouldSave =
      lastSavedWeightRef.current === null ||
      Math.abs(grams - lastSavedWeightRef.current) > AUTO_SAVE_TOLERANCE_G;
    if (!shouldSave) {
      autoSaveArmedRef.current = false;
      stableSinceRef.current = null;
      stableValueRef.current = null;
      return;
    }

    saveWeightValue(grams);
    lastSavedWeightRef.current = grams;
    autoSaveArmedRef.current = false;
    stableSinceRef.current = null;
    stableValueRef.current = null;

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [autoSaveEnabled, isConnected, weight]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    status: {
      fontSize: 16,
      opacity: 0.7,
      marginBottom: 32,
      textAlign: 'center',
      fontWeight: '500',
    },
    batteryContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 64,
      gap: 8,
    },
    batteryWarningOverlay: {
      position: 'absolute',
      top: 112,
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    disconnectButton: {
      position: 'absolute',
      top: 56,
      right: 16,
      borderRadius: 20,
    },
    reconnectButton: {
      marginTop: 8,
    },
    batteryBarBackground: {
      width: 90,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.colors.outlineVariant,
      marginLeft: 8,
      overflow: 'hidden',
    },
    batteryBarFill: {
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.colors.primary,
    },
    batteryText: {
      fontWeight: '600',
      fontSize: 16,
      color: theme.colors.onBackground,
    },
    weightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      gap: 8,
    },
    centerContentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    weightContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 16,
      borderRadius: 20,
      minWidth: 120,
      justifyContent: 'center',
    },
    addButton: {
      marginLeft: 8,
      borderRadius: 16,
      elevation: 0,
    },
    tareButton: {
      marginTop: 8,
      marginBottom: 12,
      paddingHorizontal: 48,
      paddingVertical: 16,
      borderRadius: 32,
      alignSelf: 'center',
    },
    savedWeightsSection: {
      position: 'absolute',
      bottom: 32,
      width: '90%',
      borderRadius: 24,
      padding: 16,
      alignSelf: 'center',
      maxHeight: '35%',
    },
    savedWeightsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    autoSaveToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    resetButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    savedWeightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      marginBottom: 2,
    },
    deleteButton: {
      marginLeft: 4,
      borderRadius: 12,
      elevation: 0,
    },
    savedWeightsList: {
      width: '100%',
      height: '100%',
    },
  });

  return (
    <>
      {!isConnected && (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
          }}
        >
          {(connectionPhase === 'scanning' ||
            connectionPhase === 'connecting' ||
            connectionPhase === 'reconnecting') && (
            <ActivityIndicator
              animating
              size="large"
              color={theme.colors.primary}
              style={{ marginBottom: 18 }}
            />
          )}
          <ThemedText
            style={[styles.status, { color: theme.colors.onBackground }]}
          >
            {message}
          </ThemedText>
          {connectionPhase === 'idle' && (
            <Button
              mode="contained"
              onPress={handleReconnect}
              style={styles.reconnectButton}
              accessibilityLabel="Reconnect to scale"
            >
              Reconnect
            </Button>
          )}
        </View>
      )}
      {isConnected && (
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <>
            <Button
              mode="contained-tonal"
              onPress={handleDisconnect}
              loading={disconnecting}
              disabled={disconnecting}
              style={styles.disconnectButton}
              accessibilityLabel="Disconnect scale"
            >
              Disconnect
            </Button>
            <View style={styles.batteryContainer}>
              <IconButton
                icon="battery"
                size={24}
                iconColor={theme.colors.primary}
                style={{ margin: 0 }}
                disabled
              />
              <ThemedText style={styles.batteryText}>
                {battery !== null ? `${battery} %` : '--'}
              </ThemedText>
            </View>
            {battery !== null && battery <= 10 && (
              <View
                style={[
                  styles.batteryWarningOverlay,
                  { backgroundColor: theme.colors.errorContainer },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: theme.colors.onErrorContainer }}
                >
                  Low battery ({battery}%)
                </ThemedText>
              </View>
            )}
            <View style={styles.centerContentContainer}>
              {/* Battery Counter */}

              <View style={[styles.weightRow]}>
                <View
                  style={[
                    styles.weightContainer,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <ThemedText
                    type="title"
                    style={{ color: theme.colors.onBackground }}
                  >
                    {weight ? weight : '0'}
                  </ThemedText>
                  <ThemedText
                    type="default"
                    style={{ color: theme.colors.onBackground }}
                  >
                    {' '}
                    g
                  </ThemedText>
                </View>
                <IconButton
                  icon="plus"
                  mode="contained"
                  size={28}
                  style={styles.addButton}
                  containerColor={theme.colors.primaryContainer}
                  iconColor={theme.colors.primary}
                  onPress={handleSaveWeight}
                  accessibilityLabel="Save weight"
                />
                <IconButton
                  icon="plus-box"
                  mode="contained"
                  size={28}
                  style={styles.addButton}
                  containerColor={theme.colors.secondaryContainer}
                  iconColor={theme.colors.onSecondaryContainer}
                  onPress={handleSaveAndTare}
                  accessibilityLabel="Save and tare"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.tareButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleTare}
                activeOpacity={0.85}
                disabled={!isConnected}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: theme.colors.onPrimary }}
                >
                  Tare
                </ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.savedWeightsSection}>
              <View style={styles.savedWeightsHeader}>
                <ThemedText
                  type="defaultSemiBold"
                  style={{
                    color: theme.colors.onSurface,
                    fontSize: 18,
                    letterSpacing: 0.5,
                  }}
                >
                  Saved weights
                </ThemedText>
                <View style={styles.headerActions}>
                  <IconButton
                    icon="content-copy"
                    size={20}
                    onPress={handleCopySession}
                    accessibilityLabel="Copy session to clipboard"
                  />
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetWeights}
                    accessibilityLabel="Reset all saved weights"
                  >
                    <ThemedText
                      type="default"
                      style={{
                        color: theme.colors.error,
                        fontWeight: 'bold',
                        fontSize: 14,
                      }}
                    >
                      Reset All
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.autoSaveToggleRow}>
                <ThemedText style={{ color: theme.colors.onSurface }}>
                  Auto-save stable weight
                </ThemedText>
                <Switch
                  value={autoSaveEnabled}
                  onValueChange={setAutoSaveEnabled}
                  accessibilityLabel="Toggle auto-save stable weight"
                />
              </View>
              <FlatList
                data={savedWeights}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item, index }) => (
                  <View style={styles.savedWeightRow}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={{
                        color: theme.colors.onSurface,
                        flex: 1,
                      }}
                    >
                      {item} g
                    </ThemedText>
                    <IconButton
                      icon="delete-outline"
                      size={22}
                      style={styles.deleteButton}
                      containerColor={theme.colors.secondaryContainer}
                      iconColor={theme.colors.error}
                      onPress={() => handleDeleteWeight(index)}
                      accessibilityLabel="Delete saved weight"
                    />
                  </View>
                )}
                style={styles.savedWeightsList}
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={true}
              />
            </View>
          </>
        </View>
      )}
    </>
  );
};

export default ScaleScanner;
