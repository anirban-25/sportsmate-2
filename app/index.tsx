import { StyleSheet, Text, View, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

  export default function Index() {
    const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Wait for 2 seconds then fade out
    const timer = setTimeout(() => {
      // Start fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000, // 1 second fade out animation
        useNativeDriver: true,
      }).start(() => {
        // After animation completes, navigate to login
        router.replace("/welcome");
      });
    }, 2000); // 2 second delay

    // Cleanup timer on component unmount
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.animatedContainer, 
          { opacity: fadeAnim }
        ]}
      >
        <Text style={styles.logo}>Sportsmate</Text>
        <Text style={styles.subtitle}>Your Sports Companion</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#59CE8F", // Green background
  },
  animatedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontFamily: 'SpaceMono',
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    color: "white",
    opacity: 0.8,
  }
});