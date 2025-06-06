// /app/App.js
import React, {useState, useEffect, useMemo} from 'react';
import {SafeAreaView, StyleSheet, Text, View, Button, TextInput, Alert, Image, ScrollView, FlatList} from 'react-native'; // Added FlatList
import {LensClient, development, PublicationType} from '@lens-protocol/client'; // Added PublicationType
import {Wallet} from 'ethers';

// WARNING: THIS IS A TEST-ONLY PRIVATE KEY. DO NOT USE IN A REAL APPLICATION.
// TODO: REMOVE THIS - FOR TESTING ONLY. REPLACE WITH A SECURE WALLET SOLUTION.
const TEST_ONLY_PRIVATE_KEY = "0x0123456789012345678901234567890123456789012345678901234567890123"; // Example private key

// Helper to decode JWT (very basic, only for 'id' field for profileId)
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode JWT:", e);
    return null;
  }
};

const App = () => {
  // Authentication State
  const [address, setAddress] = useState('');
  const [challengeInfo, setChallengeInfo] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedProfileId, setAuthenticatedProfileId] = useState(null);

  // Profile Fetching State
  const [profileHandleToFetch, setProfileHandleToFetch] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  // Post Creation State
  const [postContent, setPostContent] = useState('');

  // Feed Fetching State
  const [feedProfileHandle, setFeedProfileHandle] = useState('');
  const [feedPosts, setFeedPosts] = useState([]);

  // General Feedback
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const lensClient = useMemo(() => {
    const client = new LensClient({ environment: development });
    if (accessToken) {
      client.authentication.setAccessToken(accessToken);
    }
    return client;
  }, [accessToken]);


  const handleLogin = async () => {
    if (!address.trim()) {
      setFeedbackMessage('Please enter a wallet address.');
      return;
    }
    setFeedbackMessage('Attempting login...');
    setUserProfile(null);
    setAuthenticatedProfileId(null);
    setFeedPosts([]);

    try {
      const challenge = await lensClient.authentication.generateChallenge({ signedBy: address });
      setChallengeInfo(challenge);
      setFeedbackMessage(`Challenge received...`);

      if (!TEST_ONLY_PRIVATE_KEY) {
        Alert.alert("Test Error", "TEST_ONLY_PRIVATE_KEY is not set.");
        setFeedbackMessage("Error: Test private key not set.");
        return;
      }
      const wallet = new Wallet(TEST_ONLY_PRIVATE_KEY);
      const signature = await wallet.signMessage(challenge.text);
      setFeedbackMessage('Message signed (simulated). Authenticating...');

      const authResult = await lensClient.authentication.authenticate({ address, signature });

      if (authResult.isFailure()) {
        setFeedbackMessage(`Authentication failed: ${authResult.error.message}`);
        setIsAuthenticated(false);
        setAccessToken(null);
        setAuthenticatedProfileId(null);
        return;
      }

      const newAccessToken = lensClient.authentication.getAccessToken();
      if (newAccessToken) {
        setAccessToken(newAccessToken);
        setIsAuthenticated(true);

        const decodedToken = decodeJwt(newAccessToken);
        if (decodedToken && decodedToken.id) {
          setAuthenticatedProfileId(decodedToken.id);
          setFeedbackMessage(`Login Successful! Profile ID: ${decodedToken.id}`);
        } else {
          setFeedbackMessage('Login Successful, but could not decode Profile ID from token.');
        }
      } else {
        setFeedbackMessage('Authentication succeeded but no access token was found.');
        setIsAuthenticated(false);
        setAccessToken(null);
        setAuthenticatedProfileId(null);
      }
    } catch (error) {
      console.error('Login Error:', error);
      setFeedbackMessage(`Login Error: ${error.message || 'An unexpected error occurred.'}`);
      setIsAuthenticated(false);
      setAccessToken(null);
      setAuthenticatedProfileId(null);
    }
  };

  const handleLogout = async () => {
    await lensClient.authentication.logout();
    setAccessToken(null);
    setIsAuthenticated(false);
    setChallengeInfo(null);
    setAddress('');
    setUserProfile(null);
    setProfileHandleToFetch('');
    setPostContent('');
    setAuthenticatedProfileId(null);
    setFeedProfileHandle('');
    setFeedPosts([]);
    setFeedbackMessage('Logged out.');
  };

  const fetchProfile = async () => {
    if (!profileHandleToFetch.trim()) {
      setFeedbackMessage('Please enter a profile handle (e.g., stani.lens).');
      return;
    }
    setFeedbackMessage(`Fetching profile for ${profileHandleToFetch}...`);
    setUserProfile(null);

    try {
      const profile = await lensClient.profile.fetch({ forHandle: profileHandleToFetch });
      if (profile) {
        setUserProfile(profile);
        setFeedbackMessage('Profile fetched successfully.');
      } else {
        setUserProfile(null);
        setFeedbackMessage(`Profile for "${profileHandleToFetch}" not found.`);
      }
    } catch (error) {
      console.error('Fetch Profile Error:', error);
      setUserProfile(null);
      setFeedbackMessage(`Error fetching profile: ${error.message || 'An unexpected error occurred.'}`);
    }
  };

  const createPost = async () => {
    if (!isAuthenticated) {
      setFeedbackMessage('You must be logged in to create a post.');
      return;
    }
    if (!postContent.trim()) {
      setFeedbackMessage('Post content cannot be empty.');
      return;
    }
    if (!authenticatedProfileId) {
      setFeedbackMessage('Could not determine authenticated profile ID for posting. Please log in again.');
      return;
    }

    setFeedbackMessage('Creating post...');

    try {
      const metadata = {
        version: '2.0.0',
        metadata_id: `metadata-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        description: postContent.substring(0, 250),
        content: postContent,
        locale: 'en-US',
        tags: [],
        mainContentFocus: 'TEXT_ONLY',
      };

      const typedDataResult = await lensClient.publication.createOnchainPostTypedData({
        contentURI: `data:application/json,${JSON.stringify(metadata)}`,
      });

      const { id: typedDataId, typedData } = typedDataResult.unwrap();
      setFeedbackMessage('Typed data created. Signing...');

      const wallet = new Wallet(TEST_ONLY_PRIVATE_KEY);
      const signature = await wallet.signTypedData(typedData.domain, typedData.types, typedData.value);
      setFeedbackMessage('Signed typed data. Broadcasting...');

      const broadcastResult = await lensClient.transaction.broadcastOnchain({ id: typedDataId, signature });
      const broadcastResultValue = broadcastResult.unwrap();

      if (broadcastResultValue.__typename === 'RelayError') {
        setFeedbackMessage(`Error broadcasting post: ${broadcastResultValue.reason}`);
        return;
      }

      setFeedbackMessage(`Post broadcasted! TxHash: ${broadcastResultValue.txHash}. Waiting for indexing...`);
      await lensClient.transaction.waitUntilComplete({forTxHash: broadcastResultValue.txHash});
      setFeedbackMessage(`Post created successfully and indexed! TxHash: ${broadcastResultValue.txHash}`);
      setPostContent('');
    } catch (error) {
      console.error('Create Post Error:', error);
      setFeedbackMessage(`Error creating post: ${error.message || 'An unexpected error occurred.'}`);
    }
  };

  const fetchFeed = async () => {
    if (!feedProfileHandle.trim()) {
      setFeedbackMessage('Please enter a profile handle for the feed.');
      setFeedPosts([]);
      return;
    }
    setFeedbackMessage(`Fetching feed for ${feedProfileHandle}...`);
    setFeedPosts([]);

    try {
      const profile = await lensClient.profile.fetch({ forHandle: feedProfileHandle });
      if (!profile) {
        setFeedbackMessage(`Profile for feed handle "${feedProfileHandle}" not found.`);
        setFeedPosts([]);
        return;
      }
      const profileId = profile.id;
      setFeedbackMessage(`Profile ID ${profileId} found. Fetching posts...`);

      const publicationsResult = await lensClient.publication.fetchAll({
        where: {
          from: [profileId],
          publicationTypes: [PublicationType.Post], // Use enum for type safety
        },
        limit: 10, // Example limit
      });

      if (publicationsResult && publicationsResult.items) {
        setFeedPosts(publicationsResult.items);
        setFeedbackMessage(publicationsResult.items.length > 0 ? 'Feed loaded.' : 'No posts found for this profile.');
      } else {
        setFeedPosts([]);
        setFeedbackMessage('Error fetching feed or no items structure found.');
      }
    } catch (error) {
      console.error('Fetch Feed Error:', error);
      setFeedPosts([]);
      setFeedbackMessage(`Error fetching feed: ${error.message || 'An unexpected error occurred.'}`);
    }
  };


  useEffect(() => {
    const checkAuth = async () => {
      const currentAccessToken = await lensClient.authentication.getAccessToken();
      if (currentAccessToken) {
        setIsAuthenticated(true);
        const decodedToken = decodeJwt(currentAccessToken);
         if (decodedToken && decodedToken.id) {
          setAuthenticatedProfileId(decodedToken.id);
          setFeedbackMessage(`Already logged in. Profile ID: ${decodedToken.id}`);
        } else {
           setFeedbackMessage('Already logged in, but could not retrieve profile ID.');
        }
      }
    };
    checkAuth();
  }, [lensClient]);


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>LensRNApp</Text>

          {!isAuthenticated ? (
            <View style={styles.sectionFullWidth}>
              <TextInput
                style={styles.input}
                placeholder="Enter your wallet address"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="none"
              />
              <Button title="Login with Lens" onPress={handleLogin} />
            </View>
          ) : (
            <View style={styles.sectionFullWidth}>
              <Text style={styles.infoText}>Authenticated! Profile ID: {authenticatedProfileId || 'N/A'}</Text>
              {accessToken && <Text style={styles.tokenTextSmall}>Token: {accessToken.substring(0,30)}...</Text>}
              <Button title="Logout" onPress={handleLogout} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Create a Post</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="What's on your mind?"
                  value={postContent}
                  onChangeText={setPostContent}
                  multiline={true}
                  numberOfLines={3}
                />
                <Button title="Create Post" onPress={createPost} disabled={!isAuthenticated} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fetch Profile Details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Lens handle (e.g., stani.lens)"
                  value={profileHandleToFetch}
                  onChangeText={setProfileHandleToFetch}
                  autoCapitalize="none"
                />
                <Button title="Fetch Profile" onPress={fetchProfile} />
              </View>

              {userProfile && (
                <View style={styles.profileContainer}>
                  <Text style={styles.profileTitle}>{userProfile.handle?.fullHandle || userProfile.handle?.localName}</Text>
                  {userProfile.metadata?.picture?.optimized?.uri && (
                    <Image
                      source={{ uri: userProfile.metadata.picture.optimized.uri }}
                      style={styles.profilePicture}
                      onError={(e) => console.log("Failed to load image", e.nativeEvent.error)}
                    />
                  )}
                  <Text>ID: {userProfile.id}</Text>
                  <Text style={styles.bioText}>Bio: {userProfile.metadata?.bio || 'N/A'}</Text>
                  <View style={styles.statsContainer}>
                    <Text>Posts: {userProfile.stats?.posts ?? 'N/A'}</Text>
                    <Text>Followers: {userProfile.stats?.followers ?? 'N/A'}</Text>
                    <Text>Following: {userProfile.stats?.following ?? 'N/A'}</Text>
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fetch Profile Feed</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter handle for feed (e.g., stani.lens)"
                  value={feedProfileHandle}
                  onChangeText={setFeedProfileHandle}
                  autoCapitalize="none"
                />
                <Button title="Fetch Feed" onPress={fetchFeed} />
              </View>

              {feedPosts.length > 0 && (
                <FlatList
                  style={styles.feedList}
                  data={feedPosts}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.postItem}>
                      <Text style={styles.postHandle}>Post ID: {item.id}</Text>
                      <Text>By Profile ID: {item.by?.id || 'N/A'}</Text>
                      <Text>Content: {item.metadata?.content?.toString() || 'No content'}</Text>
                      <Text style={styles.postDate}>Created At: {new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                  )}
                />
              )}

            </View>
          )}
          {feedbackMessage ? <Text style={styles.feedback}>{feedbackMessage}</Text> : null}
          {challengeInfo && !isAuthenticated && (
            <View style={styles.challengeContainer}>
              <Text style={styles.challengeTitleSmall}>Challenge to Sign:</Text>
              <Text style={styles.challengeText}>{challengeInfo.text}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  centerContent: {
    alignItems: 'center',
    width: '95%',
    paddingVertical: 20,
  },
  sectionFullWidth: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginVertical: 15,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    width: '90%',
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top', // Android
  },
  infoText: {
    fontSize: 16,
    marginVertical: 8,
    textAlign: 'center',
  },
  tokenTextSmall: {
    fontSize: 10,
    color: 'grey',
    marginBottom: 10,
    textAlign: 'center',
  },
  feedback: {
    marginTop: 10,
    color: 'grey',
    textAlign: 'center',
    paddingHorizontal:10,
  },
  challengeContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    width: '90%',
  },
  challengeTitleSmall: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  challengeText: {
    fontSize: 11,
    marginTop: 3,
  },
  section: {
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  profileContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    alignItems: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: '#e0e0e0',
  },
  bioText: {
    textAlign: 'center',
    marginVertical: 5,
    color: '#333',
  },
  statsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  feedList: {
    width: '90%',
    marginTop: 10,
  },
  postItem: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
    borderRadius: 5,
  },
  postHandle: { // Though I'm displaying Post ID, this style name is kept from example
    fontWeight: 'bold',
    fontSize: 14,
  },
  postDate: {
    fontSize: 10,
    color: 'grey',
    marginTop: 4,
  }
});

export default App;
