import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  Image,
  Easing,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
const SWIPE_THRESHOLD = 50;

type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  comments: string[] | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post | null;
  onAddComment: (comment: string) => void;
  colorScheme: 'dark' | 'light';
}

const CommentsModal = memo(
  ({ visible, onClose, post, onAddComment, colorScheme }: CommentsModalProps) => {
    const [newComment, setNewComment] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const modalAnimation = useRef(new Animated.Value(0)).current;
    const backdropAnimation = useRef(new Animated.Value(0)).current;
    const keyboardAnimation = useRef(new Animated.Value(0)).current;
    const pan = useRef(new Animated.ValueXY()).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to vertical movements
          return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow downward swipes
          if (gestureState.dy > 0) {
            pan.y.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > SWIPE_THRESHOLD) {
            // If swiped down far enough, close the modal
            onClose();
          } else {
            // Otherwise, snap back to original position
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    useEffect(() => {
      const keyboardWillShow = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
          setIsKeyboardVisible(true);
          Animated.timing(keyboardAnimation, {
            toValue: 1,
            duration: Platform.OS === 'ios' ? 400 : 250,
            useNativeDriver: true,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }).start();
        }
      );

      const keyboardWillHide = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
          Animated.timing(keyboardAnimation, {
            toValue: 0,
            duration: Platform.OS === 'ios' ? 400 : 250,
            useNativeDriver: true,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }).start();
        }
      );

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }, []);

    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.timing(modalAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(modalAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible]);

    useEffect(() => {
      // Reset pan value when modal opens/closes
      pan.setValue({ x: 0, y: 0 });
    }, [visible]);

    const handleAddComment = () => {
      if (!newComment.trim()) return;
      onAddComment(newComment);
      setNewComment('');
      Keyboard.dismiss();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    if (!post) return null;

    const modalTranslateY = Animated.add(
      modalAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
      }),
      pan.y
    );

    const keyboardOffset = keyboardAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -keyboardHeight],
    });

    const backdropOpacity = backdropAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.7],
    });

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: backdropOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'],
              }),
            },
          ]}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: Animated.add(modalTranslateY, keyboardOffset) }],
                height: MODAL_HEIGHT,
              },
            ]}>
            <LinearGradient
              colors={colorScheme === 'dark' ? ['#1a1a1a', '#282828'] : ['#ffffff', '#f8f8f8']}
              style={styles.gradientBackground}>
              {/* Drag Handle */}
              <View style={styles.dragHandleContainer}>
                <View
                  style={[
                    styles.dragHandle,
                    { backgroundColor: colorScheme === 'dark' ? '#333' : '#ddd' },
                  ]}
                />
              </View>

              {/* Header */}
              <MotiView
                from={{ opacity: 0, translateY: -20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500 }}
                style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.titleContainer}>
                    <Text
                      style={[
                        styles.headerText,
                        { color: colorScheme === 'dark' ? '#E0E0E0' : '#07020D' },
                      ]}>
                      Comments
                    </Text>
                    <View style={styles.postPreview}>
                      <Image source={{ uri: post.image_url }} style={styles.previewImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                        style={styles.previewGradient}
                      />
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                    />
                  </TouchableOpacity>
                </View>
              </MotiView>

              {/* Comments List */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.commentsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment, index) => (
                    <MotiView
                      key={index}
                      from={{ opacity: 0, translateX: -20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ type: 'timing', duration: 500, delay: index * 100 }}
                      style={styles.commentContainer}>
                      <View
                        style={[
                          styles.commentBubble,
                          {
                            backgroundColor: 'transparent',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.commentText,
                            { color: colorScheme === 'dark' ? '#E0E0E0' : '#07020D' },
                          ]}>
                          {comment}
                        </Text>
                      </View>
                    </MotiView>
                  ))
                ) : (
                  <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 500 }}
                    style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={48}
                        color={colorScheme === 'dark' ? '#5070fd' : '#2f4ccc'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colorScheme === 'dark' ? '#666' : '#999' },
                      ]}>
                      No comments yet. Be the first to comment!
                    </Text>
                  </MotiView>
                )}
              </ScrollView>

              {/* Add Comment Input */}
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
                  },
                ]}>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor:
                        colorScheme === 'dark' ? 'rgba(80,112,253,0.1)' : 'rgba(80,112,253,0.05)',
                    },
                  ]}>
                  <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a comment..."
                    placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                    style={[
                      styles.input,
                      { color: colorScheme === 'dark' ? '#E0E0E0' : '#07020D' },
                    ]}
                    multiline={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="default"
                    returnKeyType="send"
                    onSubmitEditing={handleAddComment}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    onPress={handleAddComment}
                    disabled={!newComment.trim()}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: !newComment.trim()
                          ? colorScheme === 'dark'
                            ? '#333'
                            : '#ddd'
                          : '#5070fd',
                      },
                    ]}>
                    <Ionicons name="send" size={20} color={!newComment.trim() ? '#666' : 'white'} />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
  },
  dragHandleContainer: {
    width: '100%',
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  postPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentContainer: {
    marginBottom: 16,
  },
  commentBubble: {
    padding: 12,
    maxWidth: '85%',
  },
  commentText: {
    fontSize: 16,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(80,112,253,0.1)',
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default CommentsModal;
