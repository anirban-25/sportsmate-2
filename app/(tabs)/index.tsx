import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Linking,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
  Image,
  Modal
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { app } from "@/firebaseConfig";
import TournamentCard from "@/components/TournamentCard";
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Turf {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface TournamentData {
  name: string;
  price: number;
  winningPrize: number | null;
  phoneNumber: string;
  location: string;
  maxParticipants: number;
  date: string;
  time: string;
  sport: string;
  createdBy: string;
  createdAt: Date;
}

interface TournamentWithId extends TournamentData {
  id: string;
  registeredParticipants?: number;
}

const GOOGLE_PLACES_API_KEY = '';
const screenHeight = Dimensions.get('window').height;

interface Friend {
  username: string;
  isRated: boolean;
  pictureUrl?: string;
  rating?: number;
  reviews?: number;
}


const Page = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [nearbyTurfs, setNearbyTurfs] = useState<Turf[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [participatingTournaments, setParticipatingTournaments] = useState<TournamentWithId[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);

  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;

  

  const handleRatingSubmit = async () => {
    
    if (!selectedFriend || !auth.currentUser?.uid) return;
  
    try {
      const db = getFirestore(app);
      
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const currentUsername = userDoc.data()?.username;
  
      if (!currentUsername) {
        Alert.alert("Error", "Could not find your user profile");
        return;
      }
  
      // Update friend's rating
      const friendRef = doc(db, "usernames", selectedFriend.username);
      const friendDoc = await getDoc(friendRef);
  
      if (!friendDoc.exists()) {
        Alert.alert("Error", "Friend not found");
        return;
      }
  
      const currentData = friendDoc.data();
      const currentReviews = currentData.reviews || 0;
      let newRating: number;
  
      if (currentReviews === 0) {
        newRating = currentRating;
        await updateDoc(friendRef, {
          rating: newRating,
          reviews: 1
        });
      } else if (currentReviews > 0 && !selectedFriend.isRated) {
        newRating = ((currentData.rating * currentReviews) + currentRating) / (currentReviews + 1);
        await updateDoc(friendRef, {
          rating: newRating,
          reviews: currentReviews + 1
        });
      } else if (currentReviews > 0 && selectedFriend.isRated) {
        newRating = ((currentData.rating * currentReviews) + currentRating) / (currentReviews + 1);
        await updateDoc(friendRef, {
          rating: newRating
        });
      }
  
      // Update current user's friends array
      const usernameRef = doc(db, "usernames", currentUsername);
      const usernameDoc = await getDoc(usernameRef);
  
      if (!usernameDoc.exists()) {
        Alert.alert("Error", "Your profile not found");
        return;
      }
  
      const friendsArray = usernameDoc.data()?.friends || [];
      
      // Convert existing array if it's in old format
      let updatedFriends = Array.isArray(friendsArray) ? 
        (typeof friendsArray[0] === 'string' ? 
          chunk(friendsArray, 2).map(([username, status]) => ({ username, status })) : 
          friendsArray) : 
        [];
  
      // Update or add friend
      const friendIndex = updatedFriends.findIndex(f => f.username === selectedFriend.username);
      if (friendIndex !== -1) {
        updatedFriends[friendIndex].status = "rated";
      } else {
        updatedFriends.push({ username: selectedFriend.username, status: "rated" });
      }
  
      // Update the document with new friends array
      await updateDoc(usernameRef, { 
        friends: updatedFriends 
      });
  
      Alert.alert("Success", "Rating submitted successfully!");
      setShowRatingModal(false);
      fetchFriends(); // Refresh the friends list
    } catch (error) {
      console.error("Error submitting rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    }
  };
  
  const chunk = <T extends any>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };
  
  // Also update the fetchFriends function to handle missing data better
  const fetchFriends = () => {
    if (!auth.currentUser?.uid) return;
  
    const fetchAndSetupListener = async () => {
      try {
        const db = getFirestore(app);
        const userRef = doc(db, "users", auth.currentUser!.uid);
        const userDoc = await getDoc(userRef);
  
        if (!userDoc.exists()) {
          console.log("User document not found");
          return;
        }
  
        const username = userDoc.data().username;
        if (!username) {
          console.log("Username not found in user document");
          return;
        }
  
        const usernameRef = doc(db, "usernames", username);
        const unsubscribe = onSnapshot(usernameRef, async (usernameDoc) => {
          if (!usernameDoc.exists()) {
            console.log("Username document not found");
            setFriends([]);
            return;
          }
  
          const friendsData = usernameDoc.data()?.friends || [];
          
          // Remove duplicates from the source data
          const uniqueFriendsData = friendsData.reduce((acc: any[], curr: any) => {
            const exists = acc.find(item => 
              typeof item === 'object' 
                ? item.username === curr.username 
                : item === curr
            );
            if (!exists) {
              acc.push(curr);
            }
            return acc;
          }, []);
  
          // If there were duplicates, update the database
          if (uniqueFriendsData.length !== friendsData.length) {
            await updateDoc(usernameRef, {
              friends: uniqueFriendsData
            });
          }
  
          // Convert array if it's in old format and ensure uniqueness
          const processedFriends = Array.isArray(uniqueFriendsData) ? 
            (typeof uniqueFriendsData[0] === 'string' ? 
              chunk(uniqueFriendsData, 2)
                .map(([username, status]) => ({ username, status }))
                .filter((item, index, self) => 
                  index === self.findIndex(t => t.username === item.username)
                ) : 
              uniqueFriendsData) : 
            [];
  
          const friendsWithDetails = await Promise.all(
            processedFriends.map(async (friend) => {
              const friendRef = doc(db, "usernames", friend.username);
              const friendDoc = await getDoc(friendRef);
              
              if (friendDoc.exists()) {
                const friendData = friendDoc.data();
                return {
                  username: friend.username,
                  isRated: friend.status === "rated",
                  pictureUrl: friendData.pictureUrl,
                  rating: friendData.rating || 0,
                  reviews: friendData.reviews || 0
                } as Friend;
              }
              return null;
            })
          );
  
          // Final uniqueness check and null filtering
          const validFriends = friendsWithDetails
            .filter((friend): friend is Friend => friend !== null)
            .filter((friend, index, self) => 
              index === self.findIndex(f => f.username === friend.username)
            );
  
          setFriends(validFriends);
        });
  
        return unsubscribe;
      } catch (error) {
        console.error("Error fetching friends:", error);
        Alert.alert("Error", "Failed to fetch friends list");
      }
    };
  
    const unsubscribe = fetchAndSetupListener();
    
    return () => {
      if (unsubscribe) {
        unsubscribe.then(unsub => unsub && unsub());
      }
    };
  };
  const handleStartChat = (username: string) => {
    router.push({
      pathname: "/chat/[username]",
      params: { username }
    } as any);
  };

  useEffect(() => {
    fetchFriends();
  }, [auth.currentUser?.uid]);

  const searchNearbyTurfs = async (latitude: number, longitude: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=100000&` +
        `type=ground&` +
        `keyword=turf&` +
        `key=${GOOGLE_PLACES_API_KEY}`
      );

      const data = await response.json();
      
      if (data.status === 'OK') {
        const turfs = data.results.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          rating: place.rating || 0,
        }));
        setNearbyTurfs(turfs);
      } else {
        setErrorMsg('No turfs found nearby');
      }
    } catch (error) {
      setErrorMsg('Error fetching nearby turfs');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      };
      setLocation(coords);
      await searchNearbyTurfs(coords.latitude, coords.longitude);
    } catch (error) {
      setErrorMsg('Error getting location');
    }
  };

  const openInGoogleMaps = (turf: Turf): void => {
    const url = `https://www.google.com/maps/search/?api=1&query=${turf.latitude},${turf.longitude}&query_place_id=${turf.id}`;
    Linking.openURL(url);
  };

  const fetchParticipatingTournaments = async () => {
    if (!userId) {
      setIsLoadingTournaments(false);
      setParticipatingTournaments([]); // Reset state when no user
      return;
    }
  
    try {
      setIsLoadingTournaments(true);
      const db = getFirestore(app);
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        const tournamentIds = userDoc.data().tournaments || [];
        console.log("Found tournament IDs:", tournamentIds); // Debug log
        
        if (tournamentIds.length === 0) {
          setParticipatingTournaments([]);
          setIsLoadingTournaments(false);
          return;
        }
  
        const tournaments: TournamentWithId[] = [];
        
        for (const tournamentId of tournamentIds) {
          const tournamentRef = doc(db, "tournaments", tournamentId);
          const tournamentDoc = await getDoc(tournamentRef);
          
          if (tournamentDoc.exists()) {
            const tournamentData = tournamentDoc.data() as TournamentData;
            tournaments.push({
              ...tournamentData,
              id: tournamentId,
              registeredParticipants: tournamentDoc.data().registeredParticipants || 0,
            });
          }
        }
  
        console.log("Fetched tournaments:", tournaments); // Debug log
        setParticipatingTournaments(tournaments);
      } else {
        setParticipatingTournaments([]);
      }
    } catch (error) {
      console.error("Error fetching participating tournaments:", error);
      Alert.alert("Error", "Failed to fetch participating tournaments");
    } finally {
      setIsLoadingTournaments(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
  
    const db = getFirestore(app);
    const userRef = doc(db, "users", userId);
  
    // Set up real-time listener for user document
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        // Trigger a refresh of participating tournaments when user data changes
        fetchParticipatingTournaments();
      }
    });
  
    // Clean up listener on unmount
    return () => unsubscribe();
  }, [userId]);

  const TournamentList = () => {
    console.log("Rendering tournaments:", participatingTournaments); // Debug log
    
    if (isLoadingTournaments) {
      return <ActivityIndicator size="large" color="#59CE8F" />;
    }
  
    if (!participatingTournaments || participatingTournaments.length === 0) {
      return (
        <View style={styles.noTournamentsContainer}>
          <Text style={styles.noTournamentsText}>
            You don't have any upcoming tournaments
          </Text>
        </View>
      );
    }
  
    return (
      <ScrollView style={styles.tournamentsList}>
        {participatingTournaments.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            name={tournament.name}
            sport={tournament.sport}
            location={tournament.location}
            price={tournament.price}
            isOwner={tournament.createdBy === userId}
            isRegistered={true}
          />
        ))}
      </ScrollView>
    );
  };


  return (
    <ScrollView style={styles.container}>
      {/* Top 50% - Map Section */}
      <View style={styles.mapSection}>
        {location && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
              pinColor="blue"
            />

            {nearbyTurfs.map(turf => (
              <Marker
                key={turf.id}
                coordinate={{
                  latitude: turf.latitude,
                  longitude: turf.longitude,
                }}
                title={turf.name}
                description={`Rating: ${turf.rating}`}
                onCalloutPress={() => openInGoogleMaps(turf)}
              />
            ))}
          </MapView>
        )}

        <TouchableOpacity
          style={styles.searchButton}
          onPress={getLocation}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Searching...' : 'Get Nearby Turfs'}
          </Text>
        </TouchableOpacity>

        {isLoading && (
          <ActivityIndicator 
            size="large" 
            color="#007AFF" 
            style={styles.loader}
          />
        )}

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>

      {/* Bottom 50% - Tournaments Section */}
      <View style={styles.tournamentsSection}><View style={styles.newcontainer}>
        <View style={styles.line} />
        <Text style={styles.headerTextTop}>Participating Tournaments</Text>
        <View style={styles.line} />
      </View>
        
        {isLoadingTournaments ? (
          <ActivityIndicator size="large" color="#59CE8F" />
        ) : participatingTournaments.length === 0 ? (
          <Text style={styles.noTournamentsText}>
            You don't have any upcoming tournaments
          </Text>
        ) : (
          <ScrollView style={styles.tournamentsList}>
            {participatingTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                name={tournament.name}
                sport={tournament.sport}
                location={tournament.location}
                price={tournament.price}
                isOwner={tournament.createdBy === userId}
                isRegistered={true}
              />
            ))}
          </ScrollView>
        )}
      </View>
      <View style={styles.friendsSection}>
      <View style={styles.newcontainer}>
        <View style={styles.line} />
        <Text style={styles.headerTextTop}>Rate your Friends</Text>
        <View style={styles.line} />
      </View>
        <ScrollView horizontal={false} style={styles.friendsList}>
          {friends.map((friend) => (
            <View key={friend.username} style={styles.friendCard}>
              <View style={styles.cardContentContainer}>
                <View style={styles.userInfoContainer}>
                  <Text style={styles.userName}>{friend.username}</Text>
                  <View style={styles.ratingsContainer}>
                    <View style={styles.ratings}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                          key={star}
                          style={star <= (friend.rating || 0) ? styles.starFilled : styles.starEmpty}
                        >
                          {star <= (friend.rating || 0) ? "★" : "☆"}
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.reviewCount}>
                      ({friend.reviews || 0} {friend.reviews === 1 ? "review" : "reviews"})
                    </Text>
                  </View>
                </View>
                <View style={styles.imageWrapper}>
                  <Image
                    source={
                      friend.pictureUrl
                        ? { uri: friend.pictureUrl }
                        : require("@/assets/images/messi.png")
                    }
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["#000000", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.5, y: 0 }}
                    style={styles.imageOverlay}
                  />
                </View>
                <View style={styles.cardButtons}>
                  <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => {
                      setSelectedFriend(friend);
                      setCurrentRating(0);
                      setShowRatingModal(true);
                    }}
                  >
                    <Icon name="star" size={24} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => handleStartChat(friend.username)}
                  >
                    <Icon name="chat" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Rate {selectedFriend?.username}
            </Text>
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setCurrentRating(star)}
                >
                  <Text style={[styles.starButton, star <= currentRating ? styles.starFilled : styles.starEmpty]}>
                    {star <= currentRating ? "★" : "☆"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.submitButton, { opacity: currentRating > 0 ? 1 : 0.5 }]}
              onPress={handleRatingSubmit}
              disabled={currentRating === 0}
            >
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowRatingModal(false)}
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
    backgroundColor: '#fff',
  },
  noTournamentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTournamentsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  newcontainer: {
    flexDirection: 'row',          // Arrange children in a row
    alignItems: 'center',          // Center items vertically
    justifyContent: 'center',      // Center items horizontally
    width: '100%',
    marginTop: 0,                 // Take full screen width
  },
  line: {
    height: 1,                     // Line thickness
    backgroundColor: '#000',       // Line color (you can change this)
    flex: 1,                        // Space between text and the lines
    marginTop: 10,            // Take full screen width
  },
  headerTextTop: {
    marginHorizontal: 10,           // Space between text and the lines
    marginTop: 10,           // Space between text and the lines
    fontSize: 20,
    letterSpacing: 2,                   // Font size for the text
    fontWeight: 'bold',             // Make the text bold (optional)
  },
    // Friend Card Styles
    friendCard: {
      height: 200,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      marginBottom: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    cardContentContainer: {
      width: "100%",
      height: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#000000",
    },
    userInfoContainer: {
      position: "absolute",
      bottom: 30,
      left: 20,
      zIndex: 2,
    },
    userName: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#ffffff",
      marginBottom: 5,
    },
    ratingsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    ratings: {
      flexDirection: "row",
      gap: 2,
    },
    starFilled: {
      fontSize: 16,
      color: "#59CE8F",
    },
    starEmpty: {
      fontSize: 16,
      color: "#59CE8F",
    },
    reviewCount: {
      fontSize: 14,
      color: "#ffffff",
      marginLeft: 5,
    },
    imageWrapper: {
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
    },
    cardImage: {
      width: "100%",
      height: "100%",
      position: "absolute",
      right: 0,
    },
    imageOverlay: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: "100%",
      zIndex: 1,
    },
    cardButtons: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      flexDirection: 'row',
      gap: 8,
      zIndex: 3,
    },
    rateButton: {
      backgroundColor: '#FFA500',
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    chatButton: {
      backgroundColor: '#59CE8F',
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
  
    // Rating Modal Styles
    modalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 12,
      width: '80%',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      color: '#333',
    },
    starContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
      justifyContent: 'center',
    },
    starButton: {
      fontSize: 32,
    },
    submitButton: {
      backgroundColor: '#59CE8F',
      padding: 12,
      borderRadius: 8,
      width: '100%',
      marginBottom: 8,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
    },
    submitButtonText: {
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelButton: {
      padding: 12,
      borderRadius: 8,
      width: '100%',
    },
    cancelButtonText: {
      color: '#666',
      textAlign: 'center',
      fontSize: 16,
    },
  friendsSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  friendsList: {
    marginTop: 16,
  },
  mapSection: {
    height: screenHeight * 0.5,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    zIndex: 1,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 10,
    position: 'absolute',
    bottom: 60,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  tournamentsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  tournamentsList: {
    flex: 1,
    margin: "auto",
  },
});

export default Page;