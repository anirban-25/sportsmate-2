import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  StatusBar,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { app } from "@/firebaseConfig";
import CardRevealPage from "@/components/CardRevealPage";
import { getAuth, signOut } from "firebase/auth";

interface UserData {
  userName: string;
  age?: string;
  pictureUrl?: string;
  username?: string;
}
type StyleProp = {
  [key: string]: any;
};

const SettingsPage = () => {
  const { userId } = useLocalSearchParams();
  const [userData, setUserData] = useState<UserData>({ userName: "" });
  const [originalData, setOriginalData] = useState<UserData>({ userName: "" });
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [existingUser, setExistingUser] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const db = getFirestore(app);
  const storage = getStorage(app);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  useEffect(() => {
    const isImageChanged = image !== originalImage;
    const isDataChanged = 
      userData.userName !== originalData.userName ||
      userData.age !== originalData.age;

    setHasChanges(isImageChanged || isDataChanged);
  }, [userData, image, originalData, originalImage]);

  const createUserDocument = async () => {
    if (!userId) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId as string));
      
      if (!userDoc.exists()) {
        // Create initial user document
        await setDoc(doc(db, 'users', userId as string), {
          userName: "",
          createdAt: new Date().toISOString(),
          isReleased: false,
          rating: 3,
          reviews: 0
        });
      }
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  };

  const fetchUserData = async () => {
    try {
      if (!userId) return;
      
      setLoading(true);
      
      // Fetch user data
      const userDoc = await getDoc(doc(db, 'users', userId as string));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);
        setOriginalData(data);
        setImage(data.pictureUrl || null);
        setOriginalImage(data.pictureUrl || null);
        if (data.username) {
          setUsername(data.username);
          setExistingUser(true);
        }
      }
      
      // Fetch username data
      const usernameDoc = await getDoc(doc(db, 'usernames', userId as string));
      if (usernameDoc.exists()) {
        const usernameData = usernameDoc.data();
        if (usernameData?.username) {
          setUsername(usernameData.username);
          setExistingUser(true);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      alert('Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const isNameValid = userData.userName?.trim().length > 0;
    const isAgeValid = userData.age ? userData.age.trim().length > 0 : false;
    const isImageValid = !!image;
  
    return isNameValid && isAgeValid && isImageValid;
  };

const validateInputs = () => {
  const errors = [];

  if (!userData.userName?.trim()) {
    errors.push("Enter your name");
  }
  if (!userData.age || !userData.age.trim()) {
    errors.push("Enter your age");
  }
  if (!image) {
    errors.push("Upload a profile picture");
  }

  if (errors.length > 0) {
    alert(errors.join("\n"));
    return false;
  }
  return true;
};

  const auth = getAuth(app);
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login'); // Navigate to home/login screen
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out');
    }
  };

  const validateUsername = (value: string) => {
    // Only allow a-z, A-Z, underscore and dot
    const regex = /^[a-z._]+$/;
    if (!regex.test(value)) {
      setUsernameError("Only letters, underscore and dot are allowed");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const checkUsernameAvailability = async (value: string) => {
    const usernamesRef = collection(db, "usernames");
    const q = query(usernamesRef, where("username", "==", value.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      setUsernameError("Username already exists");
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert("Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const fileUri = result.assets[0].uri;
        const fileType = fileUri.split(".").pop()?.toLowerCase();

        if (!["png", "jpg", "jpeg"].includes(fileType || "")) {
          alert("Please select a PNG, JPG, or JPEG image");
          return;
        }

        setImage(fileUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Error selecting image");
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileType = uri.split(".").pop()?.toLowerCase() || "jpg";
      const storageRef = ref(
        storage,
        `profile_pictures/${userId}/${Date.now()}.${fileType}`
      );
      await uploadBytes(storageRef, blob);

      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  };

// ... (previous imports and interface remain the same)
const handleSave = async () => {
  if (!validateInputs()) return;

  if (existingUser) {
    try {
      if (!userId) return;
      
      setIsSubmitting(true);
      await createUserDocument(); // Add this line
      
      let pictureUrl = userData.pictureUrl;

      if (image && image !== userData.pictureUrl) {
        pictureUrl = await uploadImage(image);
      }

      await updateDoc(doc(db, 'users', userId as string), {
        userName: userData.userName,
        age: userData.age,
        pictureUrl,
        updatedAt: new Date().toISOString()
      });

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setIsSubmitting(false);
    }
  } else {
    setShowUsernameModal(true);
  }
};

const handleUsernameSubmit = async () => {
  try {
    if (!userId) return;
    
    if (!username.trim()) {
      setUsernameError('Username is required');
      return;
    }

    if (!validateUsername(username)) return;

    setIsSubmitting(true);
    
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) return;

    await createUserDocument(); // Add this line
    
    const usernameLower = username.toLowerCase();
    let pictureUrl = userData.pictureUrl;

    if (image && image !== userData.pictureUrl) {
      pictureUrl = await uploadImage(image);
    }

    // Create username document
    await setDoc(doc(db, 'usernames', usernameLower), {
      username: usernameLower,
      userId: userId,
      createdAt: new Date().toISOString(),
      pictureUrl: pictureUrl,
      rating: 3,
      reviews: 0
    });

    // Update user document
    await updateDoc(doc(db, 'users', userId as string), {
      userName: userData.userName,
      age: userData.age,
      pictureUrl,
      username: usernameLower,
      updatedAt: new Date().toISOString(),
      rating: 3,
      reviews: 0
    });

    setShowUsernameModal(false);
    setExistingUser(true);
    alert('Profile updated successfully!');
  } catch (error) {
    console.error('Error updating username:', error);
    alert('Error updating profile');
  } finally {
    setIsSubmitting(false);
  }
};

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#59CE8F" />
      </View>
    );
  }

  const getButtonStyle = (isDisabled: boolean): StyleProp[] => {
    const baseStyle = styles.saveButton;
    return isDisabled ? [baseStyle, styles.disabledButton] : [baseStyle];
  };
  
  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#59CE8F" />
    <CardRevealPage userId={userId as string} />
    
    <View style={styles.form}>
      <View style={styles.profileSection}>
        {image ? (
          <Image source={{ uri: image }} style={styles.profileImage} />
        ) : (
          <></>
        )}
        
        {existingUser && username && (
          <Text style={styles.usernameText}>@{username}</Text>
        )}
      </View>

      {!existingUser && (
        <Text style={{marginVertical: 10}}></Text>
      )}

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={userData.userName}
        onChangeText={(text) => setUserData(prev => ({ ...prev, userName: text }))}
        placeholder="Enter your name"
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        value={userData.age}
        onChangeText={(text) => setUserData(prev => ({ ...prev, age: text }))}
        placeholder="Enter your age"
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        <Text style={styles.buttonText}>
          {image ? 'Change Profile Picture' : 'Upload Profile Picture'} (PNG, JPG, JPEG)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
  style={getButtonStyle(isSubmitting || !isFormValid())}
  onPress={existingUser ? handleSave : () => setShowUsernameModal(true)}
  disabled={isSubmitting || !isFormValid() || !hasChanges}
>
  <Text style={styles.saveButtonText}>
    {isSubmitting ? 'Saving...' : existingUser ? 'Save Changes' : 'Continue'}
  </Text>
</TouchableOpacity>
      
      <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
    </View>

    {/* Username Modal - Only shown for new users */}
    <Modal
      visible={showUsernameModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose a Username</Text>
          <Text style={styles.modalSubtitle}>
            This cannot be changed later
          </Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              validateUsername(text);
            }}
            placeholder="Enter username"
            autoCapitalize="none"
          />
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : null}
          <TouchableOpacity 
            style={getButtonStyle(isSubmitting || !!usernameError)}
            onPress={handleUsernameSubmit}
            disabled={isSubmitting || !!usernameError}
          >
            <Text style={styles.saveButtonText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowUsernameModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 20,
    bottom: 60,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
    borderWidth: 3,               // Border width
    borderColor: '#59CE8F',
  },
  logoutButton: {
    backgroundColor: '#FF4444',
    padding: 15,
    borderRadius: 60,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
  usernameText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginTop: 8,
  },
  newUserText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imageButton: {
    backgroundColor: '#59CE8F',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }, 
  saveButton: {
    backgroundColor: '#2E2E2E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#A8A8A8', // Lighter color for disabled state
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 16,
  },
});

export default SettingsPage;
