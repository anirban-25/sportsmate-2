import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "react-native-vector-icons/Feather";

interface TournamentCardProps {
  name: string;
  sport: string;
  location: string;
  price: number;
  isOwner: boolean;
  isRegistered?: boolean;
  onEditSettings?: () => void; // Make optional
  onWithdraw?: () => void; // Make optional
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  name,
  sport,
  location,
  price,
  isOwner,
  isRegistered = false,
  onEditSettings,
  onWithdraw,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const getSportImage = (sportName: string): ImageSourcePropType => {
    const sportImages: { [key: string]: ImageSourcePropType } = {
      Football: require("@/assets/images/football.jpg"),
      Tennis: require("@/assets/images/tennis.jpg"),
      Basketball: require("@/assets/images/basketball.jpg"),
      Cricket: require("@/assets/images/cricket.jpg"),
      Volleyball: require("@/assets/images/volleyball.jpg"),
      Baseball: require("@/assets/images/baseball.jpg"),
      Rugby: require("@/assets/images/rugby.jpg"),
      HandBall: require("@/assets/images/handball.jpg"),
      "Table Tennis": require("@/assets/images/table tennis.jpg"),
      Badminton: require("@/assets/images/badminton.jpg"),
    };
    return sportImages[sportName] || sportImages.Football;
  };

  return (
    <View style={styles.cardContainer}>
      <Image
        source={getSportImage(sport)}
        style={styles.cardImage}
        resizeMode="cover"
      />
      {isRegistered && (
        <View style={styles.registeredOverlay}>
          <Text style={styles.registeredText}>REGISTERED</Text>
        </View>
      )}
      {isOwner && (
        <View style={styles.editContainer}>
          <TouchableOpacity
            onPress={() => setShowOptions(!showOptions)}
            style={styles.editButton}
          >
            <Feather name="more-vertical" size={24} color="white" />
          </TouchableOpacity>

          {showOptions && (
            <View style={styles.optionsContainer}>
              {onEditSettings && ( // Only show edit option if function exists
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    onEditSettings();
                    setShowOptions(false);
                  }}
                >
                  <Feather name="edit" size={16} color="black" />
                  <Text style={styles.optionText}>
                    Edit Tournament Settings
                  </Text>
                </TouchableOpacity>
              )}


            </View>
          )}
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)", "#000"]}
        style={styles.gradientOverlay}
      >
        <View style={styles.cardContent}>
          <Text style={styles.tournamentName}>{name}</Text>
          <Text style={styles.tournamentType}>{sport} Tournament</Text>
          <View style={styles.bottomRow}>
            <Text style={styles.location}>{location}</Text>
            <Text style={styles.price}>Rs. {price}/-</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  editContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsContainer: {
    position: "absolute",
    top: 45,
    right: 0,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 200,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 4,
  },
  optionText: {
    marginLeft: 8,
    fontSize: 14,
    color: "black",
  },
  withdrawButton: {
    marginTop: 4,
  },
  withdrawText: {
    marginLeft: 8,
    fontSize: 14,
    color: "red",
  },
  cardContainer: {
    width: Dimensions.get("window").width - 32, // Full width minus margins
    height: 200, // Adjust height as needed
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
    justifyContent: "flex-end",
    padding: 16,
  },
  cardContent: {
    gap: 4,
  },
  tournamentName: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  tournamentType: {
    color: "white",
    fontSize: 16,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  location: {
    color: "#59CE8F",
    fontSize: 14,
  },
  price: {
    color: "#59CE8F",
    fontSize: 14,
    fontWeight: "bold",
  },
  registeredOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  registeredText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
  },
});

export default TournamentCard;
