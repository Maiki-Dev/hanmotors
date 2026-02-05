import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, Platform, Image, View } from 'react-native';
import { Marker, AnimatedRegion } from 'react-native-maps';
import { CarIdle, CarMoving, CarSelected } from './CarIcons';

export const AnimatedCarMarker = ({ 
  coordinate, 
  heading = 0, 
  vehicleType = 'Ride', // Ride, Tow, Cargo
  status = 'idle', // idle, moving, selected
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

  // Render correct icon based on type and status
  const renderIcon = () => {
    if (vehicleType === 'Tow') {
      // Keep existing Tow Truck PNG for now
      return (
        <Image
          source={require('../../assets/tow-truck.png')}
          style={styles.carIcon}
          resizeMode="contain"
        />
      );
    }

    // For Ride (Sedan)
    switch (status) {
      case 'moving':
        return <CarMoving width={50} height={50} />;
      case 'selected':
        return <CarSelected width={60} height={60} />;
      default:
        return <CarIdle width={50} height={50} />;
    }
  };

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
        {renderIcon()}
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
