import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';

export const GoldButton = ({ onPress, title, loading, style, textStyle, disabled }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        disabled && styles.disabled,
        style
      ]} 
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.black} />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.borderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.medium,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...theme.typography.button,
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
