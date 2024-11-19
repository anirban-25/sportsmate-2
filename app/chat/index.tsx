import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  DocumentData,
  QueryDocumentSnapshot,
  limit,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../../firebaseConfig";
import { router, useRouter } from "expo-router";
import { useEffect, useState } from "react";

interface ChatPreview {
  id: string;
  otherUser: {
    username: string;
    pictureUrl?: string;
    userId: string;
  };
  lastMessage: string;
  lastMessageTime: string;
}

interface UserData {
  username: string;
  pictureUrl?: string;
  userId: string;
  // Add other user fields as needed
}

interface ChatData {
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  createdAt: string;
}
const navigateToHome = () => {
  router.push("/(tabs)");
};

const ChatListPage = () => {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);


  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const chatsRef = collection(db, "chats");
    const unsubscribe = onSnapshot(chatsRef, async (snapshot) => {
      try {
        // First get current user's username
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const currentUsername = userDoc.data()?.username;
        
        if (!currentUsername) return;

        const chatPreviews: ChatPreview[] = [];

        for (const chatDoc of snapshot.docs) {
          // Get participants array with proper typing
          const participants: string[] = chatDoc.data().participants;
          if (!participants.includes(currentUsername)) continue;

          // Fixed type for username parameter
          const otherUsername: string | undefined = participants.find((username: string) => username !== currentUsername);
          
          if (otherUsername) {
            // Get other user's profile
            const otherUserDoc = await getDoc(doc(db, "usernames", otherUsername));
            const otherUserData = otherUserDoc.data() as UserData;

            if (otherUserData) {
              // Get latest message from messages subcollection
              const messagesRef = collection(db, "chats", chatDoc.id, "messages");
              const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(1));
              const messageSnapshot = await getDocs(messagesQuery);
              
              const lastMessage = messageSnapshot.empty ? 
                { text: "No messages yet", createdAt: chatDoc.data().createdAt } : 
                messageSnapshot.docs[0].data();

              chatPreviews.push({
                id: chatDoc.id,
                otherUser: {
                  username: otherUserData.username,
                  pictureUrl: otherUserData.pictureUrl,
                  userId: otherUsername
                },
                lastMessage: lastMessage.text,
                lastMessageTime: lastMessage.createdAt
              });
            }
          }
        }

        setChats(chatPreviews);
      } catch (error) {
        console.error('Error processing chats:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  const navigateToChat = (username: string) => {
    router.push({
      pathname: "/chat/[username]",
      params: { username },
    } as any);
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " years ago";
    }

    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " months ago";
    }

    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " days ago";
    }

    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hours ago";
    }

    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minutes ago";
    }

    return "just now";
  };

  const renderChatItem = ({ item }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigateToChat(item.otherUser.username)}
    >
      <Image
        source={
          item.otherUser.pictureUrl
            ? { uri: item.otherUser.pictureUrl }
            : require("../../assets/images/messi.png")
        }
        style={styles.avatar}
      />
      <View style={styles.chatInfo}>
        <Text style={styles.username}>{item.otherUser.username}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      <Text style={styles.timeStamp}>
        {getTimeAgo(new Date(item.lastMessageTime))}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.header}>
        </View>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Your conversations will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  chatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: "#000000",
  },
  timeStamp: {
    fontSize: 12,
    color: "#999999",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
  backButton: {
    fontSize: 30,
    position: "absolute",
    left: 16,
    bottom: 10,
  },
});

export default ChatListPage;
