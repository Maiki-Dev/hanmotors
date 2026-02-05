import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, Platform, View } from 'react-native';
import { Marker, AnimatedRegion } from 'react-native-maps';
import { CarIdle, CarMoving } from './CarIcons';

interface Driver {
  id: string;
  lat: number;
  lng: number;
  heading: number;
  speed?: number;
}

interface Props {
  driver: Driver;
  onPress?: () => void;
}

export const AnimatedDriverMarker = ({ driver, onPress }: Props) => {
  // AnimatedRegion for smooth coordinates
  const coordinate = useRef(new AnimatedRegion({
    latitude: driver.lat || 0,
    longitude: driver.lng || 0,
    latitudeDelta: 0,
    longitudeDelta: 0,
  })).current;

  // Animated.Value for smooth rotation
  const heading = useRef(new Animated.Value(driver.heading || 0)).current;

  useEffect(() => {
    // Animate coordinate
    const newLat = driver.lat || 0;
    const newLng = driver.lng || 0;
    
    if (Platform.OS === 'android') {
      coordinate.timing({
        latitude: newLat,
        longitude: newLng,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 2000,
        useNativeDriver: false,
        easing: Easing.linear,
      } as any).start();
    } else {
      coordinate.timing({
        latitude: newLat,
        longitude: newLng,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 2000,
        useNativeDriver: false,
        easing: Easing.linear,
      } as any).start();
    }

    // Animate heading
    Animated.timing(heading, {
      toValue: driver.heading || 0,
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

  const isMoving = (driver.speed || 0) > 0.5;

  return (
    <Marker.Animated
      coordinate={coordinate as any}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={true}
      onPress={onPress}
      style={{ zIndex: 10 }}
    >
      <Animated.View
        style={[
          styles.markerContainer,
          {
            transform: [{ rotate: rotate }],
          },
        ]}
      >
        {isMoving ? <CarMoving width={50} height={50} /> : <CarIdle width={50} height={50} />}
      </Animated.View>
    </Marker.Animated>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
