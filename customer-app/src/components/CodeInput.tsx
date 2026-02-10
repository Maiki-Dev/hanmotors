import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { theme } from '../constants/theme';

interface CodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  disabled?: boolean;
}

export const CodeInput: React.FC<CodeInputProps> = ({ 
  value, 
  onChangeText, 
  length = 4,
  disabled = false 
}) => {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handlePress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.inputsContainer} onPress={handlePress}>
        {Array(length).fill(0).map((_, index) => {
          const char = value[index] || '';
          const isFocused = focused && index === value.length;
          
          return (
            <View 
              key={index} 
              style={[
                styles.cell,
                isFocused && styles.cellFocused,
                !!char && styles.cellFilled
              ]}
            >
              <Text style={styles.cellText}>{char}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          if (text.length <= length) {
            onChangeText(text.replace(/[^0-9]/g, ''));
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        caretHidden
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cell: {
    width: 56,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  cellFilled: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cellText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
