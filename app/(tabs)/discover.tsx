  import React, { useState, useEffect } from "react";
  import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Image,
    ScrollView,
  } from "react-native";
  import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
  } from "firebase/firestore";
  import { getAuth } from "firebase/auth";
  import { app } from "../../firebaseConfig";
  import Icon from "react-native-vector-icons/MaterialCommunityIcons";
  import { useRouter } from "expo-router";
  import { LinearGradient } from "expo-linear-gradient";

  interface UserData {
    username: string;
    userId: string;
    pictureUrl?: string;
    rating?: number;
    reviews?: number;
  }

  const DiscoverPage = () => {
    
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [showCard, setShowCard] = useState<boolean>(false);
    const [randomUsers, setRandomUsers] = useState<UserData[]>([]);
    const router = useRouter();
    const auth = getAuth(app);
    const db = getFirestore(app);

    useEffect(() => {
      if (searchQuery.length > 0) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, [searchQuery]);

    type ChatRouteParams = {
      username: string;
    };
    const searchUsers = async () => {
      try {
        const filteredUsers = allUsers.filter(user =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filteredUsers);
      } catch (error) {
        console.error("Error searching users:", error);
      }
    };


    const handleUserSelect = async (user: UserData) => {
      setSelectedUser(user);
      setShowCard(true);
    };

    const navigateToChats = () => {
      router.push("/chat");
    };

    const handleStartChat = async () => {
      if (!selectedUser || !auth.currentUser) return;

      // Using href for type safety
      router.push({
        pathname: "/chat/[username]",
        params: { username: selectedUser.username },
      } as any);
      setShowCard(false);
    };

    useEffect(() => {
      fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
      try {
        const usersRef = collection(db, "usernames");
        const querySnapshot = await getDocs(usersRef);
        const users = querySnapshot.docs.map(doc => ({
          username: doc.data().username,
          userId: doc.id,
          pictureUrl: doc.data().pictureUrl,
          rating: doc.data().rating,
          reviews: doc.data().reviews,
        }));
        setAllUsers(users);
        // Get initial random users
        getRandomUsers(users);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };


    const getRandomUsers = (users = allUsers) => {
      const shuffled = [...users].sort(() => 0.5 - Math.random());
      setRandomUsers(shuffled.slice(0, 3));
    };

    const renderRandomUserCard = (user: UserData) => {
      return (
        <View style={styles.randomCardContainer} key={user.userId}>
          <View style={styles.cardContentContainer}>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{user.username}</Text>
              <View style={styles.ratingsContainer}>
                <View style={styles.ratings}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text
                      key={star}
                      style={star <= (user.rating || 0) ? styles.starFilled : styles.starEmpty}
                    >
                      {star <= (user.rating || 0) ? "★" : "☆"}
                    </Text>
                  ))}
                </View>
                <Text style={styles.reviewCount}>
                  ({user.reviews || 0} {user.reviews === 1 ? "review" : "reviews"})
                </Text>
              </View>
            </View>
            <View style={styles.imageWrapper}>
              <Image
                source={
                  user.pictureUrl
                    ? { uri: user.pictureUrl }
                    : require("../../assets/images/messi.png")
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
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => handleUserSelect(user)}
            >
              <Icon name="chat" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    };


    const renderListHeader = () => (
      <>
          <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.chatListButton} onPress={navigateToChats}>
                  <Icon name="chat-outline" size={24} color="#59CE8F" />
                  <Text style={styles.chatListText}>My Chats</Text>
              </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
              <Icon name="magnify" size={24} color="#666666" style={styles.searchIcon} />
              <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
              />
          </View>

          {searchQuery.length === 0 && (
              <>
                  <View style={styles.shuffleContainer}>
                      <Text style={styles.suggestedText}>Suggested Users</Text>
                      <TouchableOpacity
                          style={styles.shuffleButton}
                          onPress={() => getRandomUsers()}
                      >
                          <Icon name="shuffle-variant" size={24} color="#ffffff" />
                      </TouchableOpacity>
                  </View>
                  <View style={styles.randomCardsContainer}>
                      {randomUsers.map((user) => renderRandomUserCard(user))}
                  </View>
              </>
          )}
      </>
  );

  const renderSearchResults = () => {
      if (searchQuery.length === 0) {
          return null;
      }

      return (
          <FlatList
              data={searchResults}
              keyExtractor={(item) => item.userId}
              renderItem={({ item }) => (
                  <TouchableOpacity
                      style={styles.userItem}
                      onPress={() => handleUserSelect(item)}
                  >
                      <Image
                          source={
                              item.pictureUrl
                                  ? { uri: item.pictureUrl }
                                  : require("../../assets/images/messi.png")
                          }
                          style={styles.userImage}
                      />
                      <Text style={styles.username}>{item.username}</Text>
                  </TouchableOpacity>
              )}
              style={styles.resultsList}
          />
      );
  };
  
    const renderUserCard = () => {
      if (!selectedUser) return null;

      return (
        <Modal
          visible={showCard}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCard(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.cardContainer}>
              <View style={styles.cardContentContainer}>
                <View style={styles.userInfoContainer}>
                  <Text style={styles.userName}>{selectedUser.username}</Text>
                  <View style={styles.ratingsContainer}>
                    <View style={styles.ratings}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                          key={star}
                          style={
                            star <= (selectedUser.rating || 0)
                              ? styles.starFilled
                              : styles.starEmpty
                          }
                        >
                          {star <= (selectedUser.rating || 0) ? "★" : "☆"}
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.reviewCount}>
                      ({selectedUser.reviews || 0}{" "}
                      {selectedUser.reviews === 1 ? "review" : "reviews"})
                    </Text>
                  </View>
                </View>
                <View style={styles.imageWrapper}>
                  <Image
                    source={
                      selectedUser.pictureUrl
                        ? { uri: selectedUser.pictureUrl }
                        : require("../../assets/images/messi.png")
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
              </View>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={handleStartChat}
              >
                <Icon name="chat" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCard(false)}
            >
              <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Modal>
      );
    };

    return (
<View style={styles.container}>
            {searchQuery.length > 0 ? (
                <>
                    {renderListHeader()}
                    {renderSearchResults()}
                </>
            ) : (
                <FlatList
                    ListHeaderComponent={renderListHeader}
                    data={[]} // Empty data since we're only using the header
                    renderItem={null}
                    style={styles.container}
                />
            )}
            {renderUserCard()}
        </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#fff",
      marginTop: 50,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#ffffff",
      margin: 16,
      paddingHorizontal: 16,
      borderRadius: 25,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
    },
    resultsList: {
      flex: 1,
    },
    userItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: "#ffffff",
      borderBottomWidth: 1,
      borderBottomColor: "#eeeeee",
    },
    shuffleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginTop: 20,
      marginBottom: 16,
    },
    suggestedText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333333',
    },
    shuffleButton: {
      backgroundColor: '#59CE8F',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    randomCardsContainer: {
      padding: 16,
      gap: 16,
    },
    randomCardContainer: {
      height: 200,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      marginBottom: 16,
    },
    userImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    username: {
      fontSize: 16,
      color: "#333333",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    cardContainer: {
      width: 350,
      height: 200,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#ffffff",
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
    chatButton: {
      position: "absolute",
      bottom: 16,
      right: 16,
      backgroundColor: "#59CE8F",
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 3,
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 16,
    },
    chatListButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F0F0F0",
      padding: 8,
      borderRadius: 20,
    },
    chatListText: {
      marginLeft: 8,
      color: "#59CE8F",
      fontWeight: "600",
    },
    closeButton: {
      position: "absolute",
      top: 40,
      right: 16,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
  });

  export default DiscoverPage;
