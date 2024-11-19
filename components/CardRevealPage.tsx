import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ColorPicker from 'react-native-wheel-color-picker';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

interface UserData {
  userName: string;
  createdAt: string;
  pictureUrl?: string;
  rating?: number;
  reviews?: number;
}

interface CardRevealPageProps {
  userId?: string;
}

const defaultImage = require('../assets/images/messi.png');

const CARD_HEIGHT = 200;
const CARD_WIDTH = 350;

interface UserRatingData {
  rating: number;
  reviews: number;
}
const CardRevealPage: React.FC<CardRevealPageProps> = ({ userId }) => {
  if (userId === undefined) {
    userId = 'default';
  }
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [showReleaseButton, setShowReleaseButton] = useState<boolean>(false);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [userImage, setUserImage] = useState<any>(defaultImage);
  const [isCardReleased, setIsCardReleased] = useState<boolean>(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [userReviews, setUserReviews] = useState<number>(0);

  useEffect(() => {
    fetchUserData();
    checkCardStatus();
  }, []);

  const fetchUserRatingData = async (username: string): Promise<UserRatingData | null> => {
    try {
      const db = getFirestore();
      const userRatingDoc = await getDoc(doc(db, 'usernames', username));
      
      if (userRatingDoc.exists()) {
        const data = userRatingDoc.data();
        return {
          rating: data.rating || 0,
          reviews: data.reviews || 0
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user rating data:', error);
      return null;
    }
  };

  const checkCardStatus = async () => {
    setLoading(true);
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isReleased) {
          setIsCardReleased(true);
          setSelectedColor(userData.cardColor);
          setShowCard(true);
        }
      }
    } catch (error) {
      console.error('Error checking card status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) return;
        
        const userDoc = await getDoc(doc(getFirestore(), 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          setUserName(userData.userName);
          
          // Fetch rating data using username
          const ratingData = await fetchUserRatingData(userData.userName);
          if (ratingData) {
            setUserRating(ratingData.rating);
            setUserReviews(ratingData.reviews);
          }
          
          if (userData.pictureUrl) {
            setUserImage({ uri: userData.pictureUrl });
          } else {
            setUserImage(defaultImage);
          }
        }
      } catch (error) {
        console.error('Error fetching updated user data:', error);
      }
    };
  
    const intervalId = setInterval(fetchData, 1000);
    fetchData();
  
    return () => clearInterval(intervalId);
  }, [userId]);

  const fetchUserData = async (): Promise<void> => {
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        setUserName(userData.userName);
        
        // Fetch rating data using username
        const ratingData = await fetchUserRatingData(userData.userName);
        if (ratingData) {
          setUserRating(ratingData.rating);
          setUserReviews(ratingData.reviews);
        }
        
        if (userData.pictureUrl) {
          setUserImage({ uri: userData.pictureUrl });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleColorSelect = (color: string): void => {
    setSelectedColor(color);
    setShowReleaseButton(true);
  };

  const handleReleaseCard = async (): Promise<void> => {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);
      
      // First get the username
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('User document does not exist');
        return;
      }
      
      
      // Update the user document
      await updateDoc(userRef, {
        isReleased: true,
        cardColor: selectedColor,
        releasedAt: new Date().toISOString()
      });

      setIsCardReleased(true);
      setShowCard(true);
    } catch (error) {
      console.error('Error releasing card:', error);
      alert('Error releasing card. Please try again.');
    }
  };

  if (loading) {
    return (
      <View>
        <Text>loading</Text>
      </View>
    );
  }

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text
          key={i}
          style={i <= userRating ? styles.starFilled : styles.starEmpty}
        >
          {i <= userRating ? '★' : '☆'}
        </Text>
      );
    }
    return stars;
  };
  return (
    <View style={styles.container}>
      {!isCardReleased && !showCard && (
        <View style={styles.setupContainer}>
          <View style={styles.colorPickerContainer}>
            <ColorPicker
              color={selectedColor}
              onColorChange={handleColorSelect}
              thumbSize={30}
              sliderSize={30}
              noSnap={true}
              row={false}
            />
          </View>
          
          {showReleaseButton && (
            <TouchableOpacity
              style={styles.releaseButton}
              onPress={handleReleaseCard}
            >
              <Text style={styles.releaseButtonText}>Release your card</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showCard && (
        <View style={styles.cardContainer}>
          <View style={styles.cardContentContainer}>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.ratingsContainer}>
                <View style={styles.ratings}>
                  {renderStars()}
                </View>
                <Text style={styles.reviewCount}>
                  ({userReviews} {userReviews === 1 ? 'review' : 'reviews'})
                </Text>
              </View>
            </View>
            <View style={styles.imageWrapper}>
              <Image
                source={userImage}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['#000000', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 0 }}
                style={styles.imageOverlay}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: 70,
  },
  setupContainer: {
    width: '100%',
    alignItems: 'center',
  },
  cardContentContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
  },
  ratingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratings: {
    flexDirection: 'row',
    gap: 2,
  },
  starFilled: {
    fontSize: 16,
    color: '#59CE8F',
  },
  starEmpty: {
    fontSize: 16,
    color: '#59CE8F',
  },
  reviewCount: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 5,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    right: 0,
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    zIndex: 1,
  },
  userInfoContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    zIndex: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
    zIndex: 2,
  },
  colorPickerContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 340,
    height: 340,
    justifyContent: 'center',
    alignItems: 'center',
  },
  releaseButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  releaseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default CardRevealPage;