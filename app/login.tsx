import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Platform, ScrollView } from 'react-native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient"; // Ensure expo-linear-gradient is installed
import { app } from "@/firebaseConfig";
import { createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";

const SignUpScreen = () => {
  
  const provider = new GoogleAuthProvider();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true); // State to toggle between SignUp and LogIn
  const { userName } = useLocalSearchParams();
  
  const router = useRouter();
  const auth = getAuth(app)
  const db= getFirestore(app);
  const handleAuth = async () => {
    setLoading(true);
    try {
      const response = isSignUp
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      console.log(response);
      if (isSignUp) {
        await setDoc(doc(db, 'users', response.user.uid), {
          userName: userName || "default user",
          createdAt: new Date().toISOString()
        });
      }
      router.replace("/(tabs)"); // Redirect to the main tab screen after successful login/signup
    } catch (err) {
      console.log(err);
      alert(isSignUp ? "Sign up failed" : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={require("../assets/images/BG.png")}
          style={styles.backgroundImage}
        />
        <LinearGradient
          colors={["transparent", "#fff"]}
          style={styles.fadeOverlay}
        />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.welcomeContainer}>
          <Text
            style={{
              fontSize: 18,
              marginTop: 20,
              fontWeight: "700",
              color: "#7cab87",
            }}
          >
            Welcome
          </Text>
          <Text
            style={{
              fontSize: 25,
              fontWeight: "bold",
              letterSpacing: 7,
              color: "#069b28",
              textTransform: "uppercase",
            }}
          >
            {userName}
          </Text>
        </View>

        <TouchableOpacity style={[styles.googleButton]} onPress={handleGoogleSignIn}>
          <Image
            source={require("../assets/images/google.png")}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Log In with Google</Text>
        </TouchableOpacity>

        <View style={styles.orContainer}>
          <View style={styles.line}></View>
          <Text style={styles.orText}>Or</Text>
          <View style={styles.line}></View>
        </View>

        {/* Email and Password Inputs */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          onPress={handleAuth}
          style={[styles.signUpButton, loading && styles.disabledButton]}
          disabled={loading}
        >
          <Text style={styles.signUpButtonText}>
            {isSignUp ? "Sign Up for Free" : "Log In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.loginText}>
            {isSignUp ? "Already a user? Log in" : "New here? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 350,
  },
  imageContainer: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 350,
    overflow: "hidden",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  fadeOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 100,
  },
  welcomeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  inputContainer: {
    width: "90%",
    backgroundColor: "#F1F1F1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 8,
  },
  input: {
    fontSize: 16,
    color: "#333",
  },
  signUpButton: {
    width: "90%",
    backgroundColor: "#59CE8F",
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: "center", 
    marginVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
 },
  signUpButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  line: {
    width: 100,
    height: 1,
    backgroundColor: "#C7C7CD",
  },
  orText: {
    fontSize: 16,
    color: "#888",
    marginHorizontal: 10,
  },
  googleButton: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#29b5ff",
    borderRadius: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    borderColor: "#0074b0",
    borderWidth: 1,
    marginVertical: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  googleButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  loginText: {
    fontSize: 14,
    color: "#888",
    marginVertical: 10,
  },
  disabledButton: {
    backgroundColor: "#dbedd4",
    borderColor: "#C7C7CD",
  },
});

export default SignUpScreen;
