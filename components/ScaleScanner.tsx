import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import useBle from '../hooks/useBle';
import { ThemedText } from './ThemedText';

const ScaleScanner = () => {
  const { weight, message, tareScale, isConnected, battery } = useBle();
  const theme = useTheme();

  // Keep screen awake during BLE operations
  useKeepAwake();

  // State for saved weights
  const [savedWeights, setSavedWeights] = useState<number[]>([]);

  // Save current weight
  const handleSaveWeight = () => {
    if (weight && !isNaN(Number(weight))) {
      setSavedWeights([Number(weight), ...savedWeights]);
    }
  };

  // Delete a single weight
  const handleDeleteWeight = (index: number) => {
    setSavedWeights(savedWeights.filter((_, i) => i !== index));
  };

  // Reset all saved weights
  const handleResetWeights = () => {
    setSavedWeights([]);
  };

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
      {message && !isConnected && (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
          }}
        >
          <ThemedText
            style={[styles.status, { color: theme.colors.onBackground }]}
          >
            {message}
          </ThemedText>
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
              </View>
              <TouchableOpacity
                style={[
                  styles.tareButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={tareScale}
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
