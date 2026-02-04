import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, Platform, Image, View } from 'react-native';
import { Marker, AnimatedRegion } from 'react-native-maps';

export const AnimatedCarMarker = ({ 
  coordinate, 
  heading = 0, 
  isTowing = false,
  duration = 2000,
  onPress
}) => {
  // AnimatedRegion for smooth coordinates
  const animatedCoordinate = useRef(new AnimatedRegion({
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: 0,
    longitudeDelta: 0,
  })).current;

  // Animated.Value for smooth rotation
  const animatedHeading = useRef(new Animated.Value(heading)).current;

  useEffect(() => {
    // Animate coordinate
    const newCoordinate = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    };

    if (Platform.OS === 'android') {
      if (animatedCoordinate) {
        animatedCoordinate.timing({
          ...newCoordinate,
          duration: duration,
          useNativeDriver: false,
          easing: Easing.linear,
        }).start();
      }
    } else {
      if (animatedCoordinate) {
        animatedCoordinate.timing({
          ...newCoordinate,
          duration: duration,
          useNativeDriver: false,
          easing: Easing.linear,
        }).start();
      }
    }

    // Animate heading
    Animated.timing(animatedHeading, {
      toValue: heading,
      duration: 500, // Rotate faster than movement for responsiveness
      useNativeDriver: true, // Rotation on View supports native driver
      easing: Easing.linear,
    }).start();

  }, [coordinate, heading, duration]);

  // Interpolate rotation for style
  const rotate = animatedHeading.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  // Adjust rotation based on platform if needed (sometimes Android/iOS differ in marker orientation)
  // Usually 0 is North. If icon points up, it's fine.
  
  const iconSource = isTowing 
    ? require('../../assets/tow-truck.png') 
    : require('../../assets/car_icon.png');

  return (
    <Marker.Animated
      coordinate={animatedCoordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={true} // Map-aligned (moves with map rotation)
      onPress={onPress}
      style={{ zIndex: 10 }} // Keep above roads
    >
      <Animated.View
        style={[
          styles.markerContainer,
          {
            transform: [{ rotate: rotate }],
          },
        ]}
      >
        <Image
          source={iconSource}
          style={styles.carIcon}
          resizeMode="contain"
        />
      </Animated.View>
    </Marker.Animated>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  carIcon: {
    width: 40,
    height: 40,
  },
});
