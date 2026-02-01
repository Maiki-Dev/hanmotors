import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

export const PremiumCard = ({ children, style, noPadding }) => {
  return (
    <View style={[styles.card, noPadding && styles.noPadding, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    ...theme.shadows.small,
  },
  noPadding: {
    padding: 0
  }
});
