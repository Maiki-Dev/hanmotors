import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Marker, AnimatedRegion } from 'react-native-maps';

interface Driver {
  id: string;
  lat: number;
  lng: number;
  heading: number;
}

interface Props {
  driver: Driver;
  onPress?: () => void;
}

export const AnimatedDriverMarker = ({ driver, onPress }: Props) => {
  // AnimatedRegion for smooth coordinates
  const coordinate = useRef(new AnimatedRegion({
    latitude: driver.lat,
    longitude: driver.lng,
    latitudeDelta: 0,
    longitudeDelta: 0,
  })).current;

  // Animated.Value for smooth rotation
  const heading = useRef(new Animated.Value(driver.heading)).current;

  useEffect(() => {
    // Animate coordinate
    if (Platform.OS === 'android') {
      coordinate.timing({
        latitude: driver.lat,
        longitude: driver.lng,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 2000,
        useNativeDriver: false,
        easing: Easing.linear,
      } as any).start();
    } else {
       coordinate.timing({
        latitude: driver.lat,
        longitude: driver.lng,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 2000,
        useNativeDriver: false,
        easing: Easing.linear,
      } as any).start();
    }

    // Animate heading
    Animated.timing(heading, {
      toValue: driver.heading,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start();

  }, [driver]);

  // Interpolate rotation for style
  const rotate = heading.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Marker.Animated
      coordinate={coordinate as any}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={true}
      onPress={onPress}
    >
      <Animated.Image
        source={require('../../assets/car_icon.png')}
        style={[
          styles.carIcon,
          {
            transform: [{ rotate: rotate }],
          },
        ]}
        resizeMode="contain"
      />
    </Marker.Animated>
  );
};

const styles = StyleSheet.create({
  carIcon: {
    width: 40,
    height: 40,
    // Add shadow for 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
