// import React from 'react';
// import { View, StyleSheet } from 'react-native';
// import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
// import Animated, {
//   useAnimatedGestureHandler,
//   useAnimatedStyle,
//   useSharedValue,
//   runOnJS,
// } from 'react-native-reanimated';

// interface SliderProps {
//   value?: number;
//   onValueChange?: (value: number) => void;
//   minimumValue?: number;
//   maximumValue?: number;
//   disabled?: boolean;
// }

// export function Slider({
//   value = 0,
//   onValueChange,
//   minimumValue = 0,
//   maximumValue = 1,
//   disabled = false,
// }: SliderProps) {
//   const translateX = useSharedValue(0);
//   const sliderWidth = useSharedValue(0);

//   React.useEffect(() => {
//     const percentage = (value - minimumValue) / (maximumValue - minimumValue);
//     translateX.value = percentage * sliderWidth.value;
//   }, [value, minimumValue, maximumValue]);

//   const updateValue = (x: number) => {
//     const percentage = Math.max(0, Math.min(1, x / sliderWidth.value));
//     const newValue = minimumValue + percentage * (maximumValue - minimumValue);
//     onValueChange?.(newValue);
//   };

//   const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
//     onStart: () => {},
//     onActive: (event) => {
//       translateX.value = Math.max(0, Math.min(sliderWidth.value, event.x));
//       runOnJS(updateValue)(translateX.value);
//     },
//   });

//   const thumbStyle = useAnimatedStyle(() => ({
//     transform: [{ translateX: translateX.value - 8 }],
//   }));

//   const fillStyle = useAnimatedStyle(() => ({
//     width: translateX.value,
//   }));

//   return (
//     <View
//       style={[styles.container, disabled && styles.disabled]}
//       onLayout={(e) => {
//         sliderWidth.value = e.nativeEvent.layout.width;
//       }}
//     >
//       <View style={styles.track}>
//         <Animated.View style={[styles.fill, fillStyle]} />
//       </View>
//       <PanGestureHandler onGestureEvent={gestureHandler} enabled={!disabled}>
//         <Animated.View style={[styles.thumb, thumbStyle]} />
//       </PanGestureHandler>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     height: 40,
//     justifyContent: 'center',
//   },
//   track: {
//     height: 6,
//     backgroundColor: '#e5e7eb',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   fill: {
//     height: '100%',
//     backgroundColor: '#3b82f6',
//   },
//   thumb: {
//     position: 'absolute',
//     width: 16,
//     height: 16,
//     borderRadius: 8,
//     backgroundColor: '#ffffff',
//     borderWidth: 2,
//     borderColor: '#3b82f6',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   disabled: {
//     opacity: 0.5,
//   },
// });