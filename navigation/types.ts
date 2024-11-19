// navigation/types.ts

export type RootStackParamList = {
    Welcome: undefined; // No params for the Welcome screen
    Login: { userName: string }; // Login screen expects a 'userName' param
  };
  