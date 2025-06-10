// /app/App.js
import React, {useState, useEffect, useMemo} from 'react';
import {SafeAreaView, StyleSheet, Text, View, Button, TextInput, Alert, Image, ScrollView, FlatList, ActivityIndicator} from 'react-native';
import {LensClient, development, PublicationType} from '@lens-protocol/client';
import {Wallet} from 'ethers';
import {jwtDecode} from 'jwt-decode';

// Helper to decode JWT using jwt-decode library
const decodeJwt = (token) => {
  try {
    return jwtDecode(token);
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
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    setFeedbackMessage('Attempting login...');
    setUserProfile(null);
    setAuthenticatedProfileId(null);
    setFeedPosts([]);

    try {
      const challenge = await lensClient.authentication.generateChallenge({ signedBy: address });
      setChallengeInfo(challenge);
      setFeedbackMessage(`Challenge received...`);

      // TODO: Replace this with proper wallet connection
      Alert.alert(
        "Wallet Connection Required",
        "Please implement proper wallet connection using a wallet provider like WalletConnect or Web3Modal.",
        [{ text: "OK" }]
      );
      setFeedbackMessage("Error: Wallet connection not implemented.");
      return;

      // The following code should be replaced with proper wallet connection
      /*
      const wallet = new Wallet(privateKey); // This should come from wallet connection
      const signature = await wallet.signMessage(challenge.text);
      setFeedbackMessage('Message signed. Authenticating...');

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
      */
    } catch (error) {
      console.error('Login Error:', error);
      setFeedbackMessage(`Login Error: ${error.message || 'An unexpected error occurred.'}`);
      setIsAuthenticated(false);
      setAccessToken(null);
      setAuthenticatedProfileId(null);
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
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

      // TODO: Replace with proper wallet connection
      Alert.alert(
        "Wallet Connection Required",
        "Please implement proper wallet connection using a wallet provider like WalletConnect or Web3Modal.",
        [{ text: "OK" }]
      );
      setFeedbackMessage("Error: Wallet connection not implemented.");
      return;

      // The following code should be replaced with proper wallet connection
      /*
      const wallet = new Wallet(privateKey); // This should come from wallet connection
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
      */
    } catch (error) {
      console.error('Create Post Error:', error);
      setFeedbackMessage(`Error creating post: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeed = async () => {
    if (!feedProfileHandle.trim()) {
      setFeedbackMessage('Please enter a profile handle for the feed.');
      setFeedPosts([]);
      return;
    }
    setIsLoading(true);
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
          publicationTypes: [PublicationType.Post],
        },
        limit: 10,
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
    } finally {
      setIsLoading(false);
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter wallet address"
            value={address}
            onChangeText={setAddress}
            editable={!isLoading}
          />
          <Button
            title={isAuthenticated ? "Logout" : "Login"}
            onPress={isAuthenticated ? handleLogout : handleLogin}
            disabled={isLoading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter profile handle (e.g., stani.lens)"
            value={profileHandleToFetch}
            onChangeText={setProfileHandleToFetch}
            editable={!isLoading}
          />
          <Button
            title="Fetch Profile"
            onPress={fetchProfile}
            disabled={isLoading}
          />
          {userProfile && (
            <View style={styles.profileInfo}>
              <Text>Handle: {userProfile.handle}</Text>
              <Text>ID: {userProfile.id}</Text>
            </View>
          )}
        </View>

        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create Post</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's on your mind?"
              value={postContent}
              onChangeText={setPostContent}
              multiline
              numberOfLines={4}
              editable={!isLoading}
            />
            <Button
              title="Post"
              onPress={createPost}
              disabled={isLoading}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feed</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter profile handle for feed"
            value={feedProfileHandle}
            onChangeText={setFeedProfileHandle}
            editable={!isLoading}
          />
          <Button
            title="Load Feed"
            onPress={fetchFeed}
            disabled={isLoading}
          />
          <FlatList
            data={feedPosts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.postItem}>
                <Text style={styles.postContent}>{item.metadata.content}</Text>
                <Text style={styles.postDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          />
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}

        {feedbackMessage && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  profileInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  postItem: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  postContent: {
    fontSize: 16,
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#333',
  },
});

export default App;
