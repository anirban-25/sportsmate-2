import React, { useEffect, useState } from 'react';
import { router, Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebaseConfig';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { StatusBar } from 'react-native';

const TabLayout = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Tabs 
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push({
              pathname: "/settings",
              params: { userId: userId }
            });
          }
        }}
      />
    </Tabs>
  );
};

export default TabLayout;