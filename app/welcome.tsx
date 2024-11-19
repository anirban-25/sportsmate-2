import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native"
import { useRouter } from "expo-router";
const WelcomeScreen = () => {
  const [name, setName] = useState<string | null>("");
  
  const router = useRouter();
  // Function to navigate to the LoginScreen and pass the name
  const handleGetStarted = () => {
    if (name?.trim()) {
      router.push(`/login?userName=${encodeURIComponent(name)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/name.png")}
        style={styles.image}
      />
      <Text style={styles.heading}>
        Your sport, your way. {"\n"}
        with <Text style={styles.highlight}>Sportsmate.</Text>
      </Text>

      <Text style={styles.subheading}>
        Connect with your fellow athletes{"\n"}
        and let&apos;s get playing!
      </Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name || ""} // Fallback to an empty string if name is null
        onChangeText={(text) => setName(text)}
        placeholder="Enter your name"
      />

      <TouchableOpacity
        style={[styles.button, { opacity: name?.trim() ? 1 : 0.5 }]} // Handle name.trim() safely
        onPress={handleGetStarted}
        disabled={!name?.trim()} // Disable button if name is null or empty
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#000",
    marginBottom: 10,
    letterSpacing: 3,
  },
  highlight: {
    color: "#34C759",
  },
  subheading: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    color: "#333",
    alignSelf: "flex-start",
    marginBottom: 8,
    marginLeft: 45,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    width: "80%",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#34C759",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 50,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  image: {
    width: 350,
    height: 350,
    resizeMode: "contain",
    marginBottom: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default WelcomeScreen;
