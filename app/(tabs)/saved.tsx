import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { app } from "@/firebaseConfig";
import PlusCircle from "react-native-vector-icons/Feather";
import TournamentCard from "@/components/TournamentCard";

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
  id: string; // This will store the userId of the tournament creator
  registeredParticipants?: number;
}

type Sport =
  | "Football"
  | "Basketball"
  | "Cricket"
  | "Tennis"
  | "Volleyball"
  | "Baseball"
  | "Rugby"
  | "HandBall"
  | "Table Tennis"
  | "Badminton";

const Page: React.FC = () => {
  const [isModalVisible, setModalVisible] = useState<boolean>(false);

  const [userTournament, setUserTournament] = useState<TournamentWithId | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [userRegisteredTournaments, setUserRegisteredTournaments] = useState<
    string[]
  >([]);
  const [allTournaments, setAllTournaments] = useState<TournamentWithId[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = () => {
    setIsRefreshing(true);

    // Simulate a network request or refresh operation
    setTimeout(() => {
      setIsRefreshing(false); // Stop refreshing
      console.log("Refreshed!");
    }, 2000);
  };
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentWithId | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tournamentName, setTournamentName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [winningPrize, setWinningPrize] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [maxParticipants, setMaxParticipants] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [sport, setSport] = useState<Sport | "">("");
  const [showSportsDropdown, setShowSportsDropdown] = useState<boolean>(false);

  const sports: Sport[] = [
    "Football",
    "Basketball",
    "Cricket",
    "Tennis",
    "Volleyball",
    "Baseball",
    "Rugby",
    "HandBall",
    "Table Tennis",
    "Badminton",
  ];

  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;

  const toggleModal = (): void => {
    setModalVisible(!isModalVisible);
    setShowSportsDropdown(false);
  };

  const handleSaveChanges = async (): Promise<void> => {
    // ... (same validation logic as handleCreateTournament)
    if (userId === undefined) {
      return;
    }
    const tournamentData: TournamentData = {
      name: tournamentName,
      price: parseFloat(price),
      winningPrize:
        parseFloat(winningPrize) > 0 ? parseFloat(winningPrize) : null,
      phoneNumber,
      location,
      maxParticipants: parseInt(maxParticipants, 10),
      date,
      time,
      sport,
      createdBy: userId,
      createdAt: userTournament?.createdAt || new Date(),
      // updatedAt: new Date(),
    };

    try {
      const db = getFirestore(app);
      const tournamentRef = doc(db, "tournaments", userId!);
      await setDoc(tournamentRef, tournamentData);

      // Include the id when setting the tournament
      setUserTournament({
        ...tournamentData,
        id: userId!,
      });

      Alert.alert("Success", "Tournament updated successfully!");
      setModalVisible(false);
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update tournament: " + error);
    }
  };
  const handleEditSettings = () => {
    // Populate form with existing data
    setTournamentName(userTournament?.name || "");
    setPrice(userTournament?.price.toString() || "");
    setWinningPrize(userTournament?.winningPrize?.toString() || "");
    setPhoneNumber(userTournament?.phoneNumber || "");
    setLocation(userTournament?.location || "");
    setMaxParticipants(userTournament?.maxParticipants.toString() || "");
    setDate(userTournament?.date || "");
    setTime(userTournament?.time || "");
    setSport((userTournament?.sport as Sport) || "");
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleWithdraw = async (tournament: TournamentWithId) => {
    if (!userId) return;

    Alert.alert(
      "Withdraw Registration",
      "Are you sure you want to withdraw from this tournament?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              const db = getFirestore(app);

              // Update tournament's registeredParticipants
              const tournamentRef = doc(db, "tournaments", tournament.id);
              await updateDoc(tournamentRef, {
                registeredParticipants:
                  (tournament.registeredParticipants || 1) - 1,
              });

              // Remove tournament from user's registered tournaments
              const userRef = doc(db, "users", userId);
              await updateDoc(userRef, {
                tournaments: userRegisteredTournaments.filter(
                  (id) => id !== tournament.id
                ),
              });

              // Update local states
              setUserRegisteredTournaments((prev) =>
                prev.filter((id) => id !== tournament.id)
              );
              setAllTournaments((prev) =>
                prev.map((t) =>
                  t.id === tournament.id
                    ? {
                        ...t,
                        registeredParticipants:
                          (t.registeredParticipants || 1) - 1,
                      }
                    : t
                )
              );

              Alert.alert(
                "Success",
                "Successfully withdrawn from the tournament"
              );
              setShowDetailsModal(false);
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to withdraw from tournament: " + error
              );
            }
          },
        },
      ]
    );
  };

  const fetchUserTournament = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const db = getFirestore(app);
      const tournamentRef = doc(db, "tournaments", userId);
      const tournamentDoc = await getDoc(tournamentRef);

      if (tournamentDoc.exists()) {
        // Include the userId as id when setting the tournament
        setUserTournament({
          ...(tournamentDoc.data() as TournamentData),
          id: userId,
        } as TournamentWithId);
      }
    } catch (error) {
      console.error("Error fetching user tournament:", error);
    }
  };

  // Fetch tournament on component mount

  const fetchAllTournaments = async () => {
    try {
      const db = getFirestore(app);
      const tournamentsRef = collection(db, "tournaments");
      const tournamentDocs = await getDocs(tournamentsRef);

      const tournaments: TournamentWithId[] = [];
      tournamentDocs.forEach((doc) => {
        tournaments.push({
          ...(doc.data() as TournamentData),
          id: doc.id,
          registeredParticipants: doc.data().registeredParticipants || 0,
        });
      });

      setAllTournaments(tournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRegisteredTournaments = async () => {
    if (!userId) return;

    try {
      const db = getFirestore(app);
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        setUserRegisteredTournaments(userDoc.data().tournaments || []);
      }
    } catch (error) {
      console.error("Error fetching user registered tournaments:", error);
    }
  };

  // Add to useEffect
  useEffect(() => {
    fetchUserTournament();
    fetchAllTournaments();
    fetchUserRegisteredTournaments();
  }, [userId]);
  const validateDate = (input: string): boolean => {
    const dateRegex: RegExp = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input)) return false;
    const dateObj = new Date(input);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  };

  const validateTime = (input: string): boolean => {
    const timeRegex: RegExp = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(input);
  };

  const handleRegister = async (tournament: TournamentWithId) => {
    if (!userId) {
      Alert.alert("Error", "Please sign in to register");
      return;
    }

    try {
      const db = getFirestore(app);

      // Update tournament's registeredParticipants
      const tournamentRef = doc(db, "tournaments", tournament.id);
      await updateDoc(tournamentRef, {
        registeredParticipants: (tournament.registeredParticipants || 0) + 1,
      });

      // Add tournament to user's registered tournaments
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          tournaments: arrayUnion(tournament.id),
        },
        { merge: true }
      );

      // Update local states
      setAllTournaments((prev) =>
        prev.map((t) =>
          t.id === tournament.id
            ? {
                ...t,
                registeredParticipants: (t.registeredParticipants || 0) + 1,
              }
            : t
        )
      );

      // Update userRegisteredTournaments state
      setUserRegisteredTournaments((prev) => [...prev, tournament.id]);

      // Update selectedTournament to reflect new registration count
      setSelectedTournament((prev) =>
        prev && prev.id === tournament.id
          ? {
              ...prev,
              registeredParticipants: (prev.registeredParticipants || 0) + 1,
            }
          : prev
      );

      Alert.alert("Success", "Successfully registered for the tournament!");

      // Instead of closing the modal, force a re-render of the details
      setShowDetailsModal(false);
      setTimeout(() => setShowDetailsModal(true), 0);
    } catch (error) {
      Alert.alert("Error", "Failed to register for tournament: " + error);
    }
  };

  // Update TournamentDetailsModal
  const TournamentDetailsModal: React.FC<{ tournament: TournamentWithId }> = ({
    tournament,
  }) => {
    let isRegistered = userRegisteredTournaments.includes(tournament.id);
    const emptySlots =
      tournament.maxParticipants - (tournament.registeredParticipants || 0);

    return (
      <View style={styles.detailsModalContainer}>
        <Text style={styles.detailsTitle}>{tournament.name}</Text>
        <Text style={styles.detailsText}>Empty Slots: {emptySlots}</Text>
        <Text style={styles.detailsText}>
          Contact: {tournament.phoneNumber}
        </Text>
        <Text style={styles.detailsText}>Date: {tournament.date}</Text>
        <Text style={styles.detailsText}>Time: {tournament.time} IST</Text>
        <Text style={styles.detailsText}>Location: {tournament.location}</Text>
        <Text style={styles.detailsText}>Price: Rs. {tournament.price}/-</Text>
        {tournament.winningPrize && (
          <Text style={styles.detailsText}>
            Winning Prize: Rs. {tournament.winningPrize}/-
          </Text>
        )}

        {isRegistered ? (
          <TouchableOpacity
            style={[styles.registerButton, styles.withdrawButton]}
            onPress={() => handleWithdraw(tournament)}
          >
            <Text style={styles.registerButtonText}>Withdraw Registration</Text>
          </TouchableOpacity>
        ) : (
          emptySlots > 0 &&
          tournament.createdBy !== userId && (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => handleRegister(tournament)}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          )
        )}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowDetailsModal(false)}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  };
  const handleCreateTournament = async (): Promise<void> => {
    if (
      !tournamentName ||
      !price ||
      !phoneNumber ||
      !location ||
      !maxParticipants ||
      !date ||
      !time ||
      !sport
    ) {
      Alert.alert("Error", "Please fill in all the fields.");
      return;
    }

    if (!validateDate(date)) {
      Alert.alert("Error", "Please enter a valid date in YYYY-MM-DD format.");
      return;
    }

    if (!validateTime(time)) {
      Alert.alert(
        "Error",
        "Please enter a valid time in HH:mm format (24-hour)."
      );
      return;
    }

    if (Number(price) <= 0 && Number(winningPrize) > 0) {
      Alert.alert(
        "Error",
        "Winning prize can only be set if price is greater than 0."
      );
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User is not authenticated.");
      return;
    }

    const tournamentData: TournamentData = {
      name: tournamentName,
      price: parseFloat(price),
      winningPrize:
        parseFloat(winningPrize) > 0 ? parseFloat(winningPrize) : null,
      phoneNumber,
      location,
      maxParticipants: parseInt(maxParticipants, 10),
      date,
      time,
      sport,
      createdBy: userId,
      createdAt: new Date(),
    };

    try {
      const db = getFirestore(app);
      const tournamentRef = doc(db, "tournaments", userId!);
      await setDoc(tournamentRef, tournamentData);

      // Include the id when setting the tournament
      setUserTournament({
        ...tournamentData,
        id: userId!,
      });

      Alert.alert("Success", "Tournament created successfully!");
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to create tournament: " + error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh} // Trigger refresh
          tintColor="#0000FF" // Optional: color of the loading spinner
          title="Refreshing..." // Optional: text shown while refreshing
          titleColor="#000" // Optional: color of the title
        />
      }
    >
      <View style={styles.newcontainer}>
        <View style={styles.line} />
        <Text style={styles.headerTextTop}>Upcoming</Text>
        <View style={styles.line} />
      </View>
      <View style={styles.allTournamentsSection}>
        {allTournaments.map((tournament) => {
          // Create scoped handlers for this specific tournament
          const handleTournamentEdit = () => {
            handleEditSettings();
          };

          const handleTournamentWithdraw = () => {
            handleWithdraw(tournament);
          };

          return (
            <TouchableOpacity
              key={tournament.id}
              onPress={() => {
                setSelectedTournament(tournament);
                setShowDetailsModal(true);
              }}
            >
              <TournamentCard
                name={tournament.name}
                sport={tournament.sport}
                location={tournament.location}
                price={tournament.price}
                isOwner={tournament.createdBy === userId}
                isRegistered={userRegisteredTournaments.includes(tournament.id)}
                onEditSettings={
                  tournament.createdBy === userId
                    ? handleTournamentEdit
                    : undefined
                }
                onWithdraw={
                  tournament.createdBy === userId
                    ? handleTournamentWithdraw
                    : undefined
                }
              />
            </TouchableOpacity>
          );
        })}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDetailsModal}
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View style={styles.modalBackground}>
            {selectedTournament && (
              <TournamentDetailsModal tournament={selectedTournament} />
            )}
          </View>
        </Modal>
      </View>
      {userTournament ? (
  <>
    <Text style={styles.headerText}>Your Hostings</Text>
    <View style={{marginHorizontal: 16}}>

    <TournamentCard
      name={userTournament.name}
      sport={userTournament.sport}
      location={userTournament.location}
      price={userTournament.price}
      isOwner={userTournament.createdBy === userId}
      onEditSettings={() => handleEditSettings()}
      onWithdraw={() => handleWithdraw(userTournament)}
      />
      </View>
  </>
) : (
  userId && (
    <TouchableOpacity 
      onPress={toggleModal} 
      style={styles.plusButtonContainer}
    >
      <PlusCircle name="plus-circle" size={40} color="#59CE8F" />
    </TouchableOpacity>
  )
)}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setIsEditing(false);
        }}
      >
        <View style={styles.modalBackground}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Create a Tournament</Text>

              <TextInput
                style={styles.input}
                placeholder="Tournament Name"
                value={tournamentName}
                onChangeText={setTournamentName}
              />

              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                value={date}
                onChangeText={setDate}
              />

              <TextInput
                style={styles.input}
                placeholder="Time (HH:mm) IST"
                value={time}
                onChangeText={setTime}
              />

              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowSportsDropdown(!showSportsDropdown)}
                >
                  <Text>{sport || "Select Sport"}</Text>
                </TouchableOpacity>

                {showSportsDropdown && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      style={styles.dropdownScrollView}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {sports.map((sportItem) => (
                        <TouchableOpacity
                          key={sportItem}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSport(sportItem);
                            setShowSportsDropdown(false);
                          }}
                        >
                          <Text>{sportItem}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* // Also add a TouchableOpacity to close the dropdown when clicking outside */}
              {/* {showSportsDropdown && (
  <TouchableOpacity
    style={StyleSheet.absoluteFill}
    onPress={() => setShowSportsDropdown(false)}
  /> */}

              <TextInput
                style={styles.input}
                placeholder="Price"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />

              <TextInput
                style={[styles.input, Number(price) <= 0 && styles.blurInput]}
                placeholder="Winning Prize"
                keyboardType="numeric"
                value={winningPrize}
                onChangeText={setWinningPrize}
                editable={Number(price) > 0}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />

              <TextInput
                style={styles.input}
                placeholder="Location"
                value={location}
                onChangeText={setLocation}
              />

              <TextInput
                style={styles.input}
                placeholder="Max Participants"
                keyboardType="numeric"
                value={maxParticipants}
                onChangeText={setMaxParticipants}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={isEditing ? handleSaveChanges : handleCreateTournament}
              >
                <Text style={styles.buttonText}>
                  {isEditing ? "Save Changes" : "Create Tournament"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleModal}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  newcontainer: {
    flexDirection: 'row',          // Arrange children in a row
    alignItems: 'center',          // Center items vertically
    justifyContent: 'center',      // Center items horizontally
    width: '100%',
    marginTop: 10,                 // Take full screen width
  },
  line: {
    height: 1,                     // Line thickness
    backgroundColor: '#000',       // Line color (you can change this)
    flex: 1,                        // Space between text and the lines
    marginTop: 50,            // Take full screen width
  },
  headerTextTop: {
    marginHorizontal: 10,           // Space between text and the lines
    marginTop: 50,           // Space between text and the lines
    fontSize: 24,                   // Font size for the text
    fontWeight: 'light',             // Make the text bold (optional)
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    margin: 16,
    color: "#333",
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginTop: 16,
    color: "#666",
  },
  userTournamentSection: {
    marginBottom: 24,
  },
  allTournamentsSection: {
    alignItems: "center",
    gap: 16,
    padding: 16,
  },
  withdrawButton: {
    backgroundColor: "#ff4444",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsModalContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  detailsText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#666",
  },
  registerButton: {
    backgroundColor: "#59CE8F",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  registerButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: "#666",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  closeButtonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
  },
  plusButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "white",
    borderRadius: 30,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    marginLeft: 16,
    alignSelf: "flex-start",
  },
  scrollView: {
    width: "100%",
    maxHeight: "90%",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 5,
    justifyContent: "center",
  },
  blurInput: {
    backgroundColor: "#f0f0f0",
  },
  dropdown: {
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12,
    maxHeight: 150, // Fixed height for the dropdown
    position: "absolute", // Position absolute to overlay
    top: "100%", // Position right below the input
    left: 0,
    right: 0,
    backgroundColor: "white", // Ensure background is white
    zIndex: 1000, // Ensure dropdown appears above other elements
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownContainer: {
    position: "relative", // Container for the dropdown
    marginBottom: 12, // Space for the dropdown when open
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "white", // Ensure items have white background
  },
  dropdownScrollView: {
    maxHeight: 150, // Match dropdown maxHeight
  },
  button: {
    backgroundColor: "#59CE8F",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 10,
    backgroundColor: "gray",
    borderRadius: 5,
  },
  cancelButtonText: {
    color: "white",
    textAlign: "center",
  },
});

export default Page;
