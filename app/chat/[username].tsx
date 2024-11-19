// app/chat/[username].tsx
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

interface UserProfile {
  username: string;
  pictureUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface Friend {
  username: string;
  status: "rated" | "unrated";
}

const ChatPage = () => {
    const params = useLocalSearchParams();
    const [currentUsername, setCurrentUsername] = useState<string>('');
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    initializeChat();
    fetchUserProfile();
  }, [username]);

  useEffect(() => {
    const fetchCurrentUsername = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const username = userDoc.data()?.username;
        if (username) {
          setCurrentUsername(username);
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };

    fetchCurrentUsername();
  }, []);

  const renderHeader = () => (
    <View style={styles.chatHeader}>
      <View style={styles.userInfo}>
        {userProfile?.pictureUrl ? (
          <Image 
            source={{ uri: userProfile.pictureUrl }} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.username}>{username}</Text>
          {userProfile?.isOnline ? (
            <Text style={styles.onlineStatus}>Online</Text>
          ) : (
            <Text style={styles.lastSeen}>
              {userProfile?.lastSeen ? 
                `Last seen ${formatDistanceToNow(new Date(userProfile.lastSeen), { addSuffix: true })}` :
                'Offline'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages]);

  const fetchUserProfile = async () => {
    try {
      const usersRef = collection(db, 'usernames');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUserProfile({
          username: userData.username,
          pictureUrl: userData.pictureUrl,
          isOnline: userData.isOnline || false,
          lastSeen: userData.lastSeen,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const initializeChat = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
   
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const currentUsername = userDoc.data()?.username;
   
      const chatId = [currentUsername, username].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
  
      // Check if chat already exists
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [currentUsername, username],
          createdAt: new Date().toISOString()
        });
      }
  
      // Update sender's username document
      const senderRef = doc(db, 'usernames', currentUsername);
      const senderDoc = await getDoc(senderRef);
      if (senderDoc.exists()) {
        const existingFriends = senderDoc.data()?.friends || [];
        const hasUser = existingFriends.some((friend: any) => 
          typeof friend === 'object' 
            ? friend.username === username 
            : friend === username
        );
        
        if (!hasUser) {
          await updateDoc(senderRef, {
            chats: arrayUnion(chatId),
            friends: arrayUnion({ username, status: "unrated" })
          });
        }
      }
  
      // Update receiver's username document
      const receiverRef = doc(db, 'usernames', username);
      const receiverDoc = await getDoc(receiverRef);
      if (receiverDoc.exists()) {
        const existingFriends = receiverDoc.data()?.friends || [];
        const hasUser = existingFriends.some((friend: any) => 
          typeof friend === 'object' 
            ? friend.username === currentUsername 
            : friend === currentUsername
        );
        
        if (!hasUser) {
          await updateDoc(receiverRef, {
            chats: arrayUnion(chatId),
            friends: arrayUnion({ username: currentUsername, status: "unrated" })
          });
        }
      }
   
      setChatId(chatId);
      subscribeToMessages(chatId);
      setOtherUserId(username);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
   const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser || !chatId) return;
   
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const currentUsername = userDoc.data()?.username;
   
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUsername,
        receiverId: username,
        createdAt: new Date().toISOString()
      });
   
      setNewMessage('');
    } catch (error) {
      console.error('Error:', error);
    }
   };
  const subscribeToMessages = (chatId: string) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
    return onSnapshot(q, (snapshot) => {
      const allMessages: Message[] = [];
      snapshot.forEach((doc) => {
        allMessages.push({
          ...doc.data() as Message,
          id: doc.id
        });
      });
      setMessages(allMessages);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  };
  

 const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Compare senderId with current username instead of uid
    const isCurrentUser = item.senderId === currentUsername;
    const showDate = index === 0 || 
      new Date(item.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.senderMessageContainer : styles.receiverMessageContainer,
          ]}
        >
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.senderBubble : styles.receiverBubble
          ]}>
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.senderText : styles.receiverText
            ]}>
              {item.text}
            </Text>
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.senderTime : styles.receiverTime
            ]}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </View>
    );
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59CE8F" />
      </View>
    );
  }

  return (
    <>
    <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderHeader()}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                maxHeight: 100, // Move maxHeight to style
              },
            ]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#666666"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Icon 
              name="send" 
              size={24} 
              color={newMessage.trim() ? '#FFFFFF' : '#CCCCCC'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 8,
    marginVertical: 2,
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  senderMessageContainer: {
    justifyContent: 'flex-end',
  },
  senderBubble: {
    backgroundColor: '#59CE8F',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  senderText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  senderTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },

  // Receiver styles
  receiverMessageContainer: {
    justifyContent: 'flex-start',
  },
  receiverBubble: {
    backgroundColor: '#E8E8E8',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  receiverText: {
    color: '#000000',
    fontSize: 16,
  },
  receiverTime: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  currentUserBubble: {
    backgroundColor: '#59CE8F',
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: '#E8E8E8',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#666666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 40,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 48,
    marginRight: 8,
    fontSize: 16,
    color: '#000000',
  },
  chatHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  defaultAvatar: {
    backgroundColor: '#59CE8F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  onlineStatus: {
    fontSize: 14,
    color: '#59CE8F',
  },
  lastSeen: {
    fontSize: 14,
    color: '#666666',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherUserTime: {
    color: '#666666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#59CE8F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
});

export default ChatPage;