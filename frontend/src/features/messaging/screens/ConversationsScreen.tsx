/**
 * TANDER Conversations Screen - Facebook Messenger Style
 * 100% rewritten with inline chat view for landscape mode
 *
 * Features:
 * - Portrait: Full conversation list, tap navigates to chat
 * - Landscape: Split view with chat inline (no navigation)
 * - Simple design following Messenger pattern
 * - Senior-friendly touch targets
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  Image,
  TextInput,
  Keyboard,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@shared/components';
import { colors } from '@shared/styles/colors';
import { spacing } from '@shared/styles/spacing';
import { useResponsive } from '@shared/hooks/useResponsive';
import {
  IncomingCallModal,
  NewMatchesList,
} from '../components';
import { useConversations, Conversation as APIConversation } from '../hooks/useConversations';
import type { Conversation, IncomingCall, Message } from '../types';

// ============================================================================
// HELPERS
// ============================================================================
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// SIMPLE VECTOR ICONS
// ============================================================================
interface IconProps {
  size: number;
  color: string;
}

const SearchIcon: React.FC<IconProps> = ({ size, color }) => {
  const borderW = clamp(size * 0.12, 1.5, 3);
  const circleSize = size * 0.55;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: circleSize, height: circleSize, borderRadius: circleSize / 2,
        borderWidth: borderW, borderColor: color,
        marginTop: -size * 0.08, marginLeft: -size * 0.08,
      }} />
      <View style={{
        position: 'absolute', width: borderW, height: size * 0.28,
        backgroundColor: color, borderRadius: borderW / 2,
        transform: [{ rotate: '45deg' }], bottom: size * 0.12, right: size * 0.18,
      }} />
    </View>
  );
};

const SendIcon: React.FC<IconProps> = ({ size, color }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: 0, height: 0,
      borderTopWidth: size * 0.3, borderBottomWidth: size * 0.3, borderLeftWidth: size * 0.5,
      borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color,
      marginLeft: size * 0.1,
    }} />
  </View>
);

const PhoneIcon: React.FC<IconProps> = ({ size, color }) => {
  const borderW = clamp(size * 0.1, 1.5, 3);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.5, height: size * 0.5, borderWidth: borderW, borderColor: color,
        borderRadius: size * 0.1, transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
};

const VideoIcon: React.FC<IconProps> = ({ size, color }) => {
  const borderW = clamp(size * 0.1, 1.5, 3);
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
      <View style={{
        width: size * 0.45, height: size * 0.35, borderWidth: borderW, borderColor: color,
        borderRadius: size * 0.06,
      }} />
      <View style={{
        width: 0, height: 0, marginLeft: 2,
        borderTopWidth: size * 0.15, borderBottomWidth: size * 0.15, borderLeftWidth: size * 0.2,
        borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color,
      }} />
    </View>
  );
};

const MoreIcon: React.FC<IconProps> = ({ size, color }) => {
  const dotSize = size * 0.15;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: dotSize * 0.8 }}>
      <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />
      <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />
      <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />
    </View>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================
const CURRENT_USER_ID = 'current-user';

const MOCK_NEW_MATCHES = [
  {
    id: 'match-1',
    user: { id: 'user-5', firstName: 'Carmen', profilePhoto: 'https://randomuser.me/api/portraits/women/72.jpg', isOnline: true, isVerified: true },
    matchedAt: new Date(Date.now() - 3600000),
    expiresAt: new Date(Date.now() + 20 * 3600000),
    isYourTurn: true,
  },
  {
    id: 'match-2',
    user: { id: 'user-6', firstName: 'Fernando', profilePhoto: 'https://randomuser.me/api/portraits/men/71.jpg', isOnline: false, isVerified: false },
    matchedAt: new Date(Date.now() - 7200000),
    expiresAt: new Date(Date.now() + 4 * 3600000),
    hasNewMessage: true,
  },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    participants: [{ id: 'user-1', firstName: 'Maria', lastName: 'Santos', profilePhoto: 'https://randomuser.me/api/portraits/women/65.jpg', isOnline: true, isVerified: true }],
    lastMessage: { id: 'msg-1', conversationId: 'conv-1', senderId: 'user-1', type: 'text', content: "I'd love to! Perhaps we could meet at the Manila Orchid Society's exhibit next weekend?", status: 'delivered', createdAt: new Date(Date.now() - 900000) },
    unreadCount: 2, isPinned: true, isMuted: false,
    createdAt: new Date(Date.now() - 86400000 * 5), updatedAt: new Date(Date.now() - 900000),
  },
  {
    id: 'conv-2',
    participants: [{ id: 'user-2', firstName: 'Jose', lastName: 'Reyes', profilePhoto: 'https://randomuser.me/api/portraits/men/67.jpg', isOnline: false, lastSeen: new Date(Date.now() - 3600000), isVerified: true }],
    lastMessage: { id: 'msg-2', conversationId: 'conv-2', senderId: 'current-user', type: 'text', content: 'Thank you for the lovely conversation yesterday!', status: 'read', createdAt: new Date(Date.now() - 3600000 * 5) },
    unreadCount: 0, isPinned: false, isMuted: false,
    createdAt: new Date(Date.now() - 86400000 * 3), updatedAt: new Date(Date.now() - 3600000 * 5),
  },
  {
    id: 'conv-3',
    participants: [{ id: 'user-3', firstName: 'Elena', lastName: 'Cruz', profilePhoto: 'https://randomuser.me/api/portraits/women/68.jpg', isOnline: true, isVerified: false }],
    lastMessage: { id: 'msg-3', conversationId: 'conv-3', senderId: 'user-3', type: 'text', content: 'Have you tried the new restaurant in Makati?', status: 'delivered', createdAt: new Date(Date.now() - 86400000) },
    unreadCount: 1, isPinned: false, isMuted: false,
    createdAt: new Date(Date.now() - 86400000 * 7), updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'conv-4',
    participants: [{ id: 'user-4', firstName: 'Ricardo', profilePhoto: undefined, isOnline: false, lastSeen: new Date(Date.now() - 86400000 * 2), isVerified: true }],
    lastMessage: { id: 'msg-4', conversationId: 'conv-4', senderId: 'user-4', type: 'text', content: 'It was nice meeting you at the church event.', status: 'read', createdAt: new Date(Date.now() - 86400000 * 3) },
    unreadCount: 0, isPinned: false, isMuted: false,
    createdAt: new Date(Date.now() - 86400000 * 10), updatedAt: new Date(Date.now() - 86400000 * 3),
  },
];

// Mock messages for inline chat
const getMockMessages = (conversationId: string): Message[] => [
  { id: '1', conversationId, senderId: 'user-1', type: 'text', content: 'Hello! I noticed we both enjoy gardening. What kind of plants do you grow?', status: 'read', createdAt: new Date(Date.now() - 3600000 * 2) },
  { id: '2', conversationId, senderId: CURRENT_USER_ID, type: 'text', content: "Hi! Yes, I love gardening. I mostly grow vegetables - tomatoes, eggplants, and some herbs.", status: 'read', createdAt: new Date(Date.now() - 3600000 * 1.5) },
  { id: '3', conversationId, senderId: 'user-1', type: 'text', content: "That's wonderful! I have a small flower garden. Orchids are my favorite.", status: 'read', createdAt: new Date(Date.now() - 3600000) },
  { id: '4', conversationId, senderId: CURRENT_USER_ID, type: 'text', content: 'Orchids are beautiful! Maybe you can teach me sometime?', status: 'read', createdAt: new Date(Date.now() - 1800000) },
  { id: '5', conversationId, senderId: 'user-1', type: 'text', content: "I'd love to! Perhaps we could meet at the Manila Orchid Society's exhibit next weekend?", status: 'read', createdAt: new Date(Date.now() - 900000) },
];

// ============================================================================
// INLINE CHAT PANEL (for landscape mode)
// ============================================================================
interface InlineChatProps {
  conversation: Conversation | null;
  onSendMessage: (text: string) => void;
  bottomPadding: number;
}

const InlineChat: React.FC<InlineChatProps> = ({ conversation, onSendMessage, bottomPadding: _bottomPadding }) => {
  const { hp } = useResponsive();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  const headerHeight = clamp(hp(14), 50, 70);
  const inputHeight = clamp(hp(12), 44, 56);
  const fontSize = clamp(hp(4), 14, 17);
  const iconSize = clamp(hp(6), 20, 28);
  const avatarSize = clamp(hp(10), 36, 48);

  // Handle keyboard show/hide with animation
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const hideListener = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [keyboardHeight]);

  useEffect(() => {
    if (conversation) {
      setMessages(getMockMessages(conversation.id));
    }
  }, [conversation?.id]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!inputText.trim() || !conversation) return;
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conversation.id,
      senderId: CURRENT_USER_ID,
      type: 'text',
      content: inputText.trim(),
      status: 'sent',
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    onSendMessage(inputText.trim());
  };

  if (!conversation) {
    return (
      <View style={styles.emptyChatPanel}>
        <Text style={[styles.emptyChatText, { fontSize }]}>Select a conversation</Text>
      </View>
    );
  }

  const user = conversation.participants[0];

  return (
    <Animated.View style={[styles.chatPanel, { paddingBottom: keyboardHeight }]}>
      {/* Chat Header */}
      <View style={[styles.chatHeader, { height: headerHeight }]}>
        {user.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={[styles.chatAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
        ) : (
          <View style={[styles.chatAvatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            <Text style={{ color: colors.white, fontWeight: '600', fontSize: avatarSize * 0.4 }}>{user.firstName.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.chatHeaderInfo}>
          <Text style={[styles.chatHeaderName, { fontSize: fontSize + 1 }]} numberOfLines={1}>
            {user.firstName} {user.lastName || ''}
          </Text>
          <Text style={[styles.chatHeaderStatus, { fontSize: fontSize - 2 }]}>
            {user.isOnline ? 'Active now' : 'Offline'}
          </Text>
        </View>
        <View style={styles.chatHeaderActions}>
          <TouchableOpacity style={styles.chatHeaderButton}>
            <PhoneIcon size={iconSize} color={colors.romantic.pink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatHeaderButton}>
            <VideoIcon size={iconSize} color={colors.romantic.pink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatHeaderButton}>
            <MoreIcon size={iconSize} color={colors.neutral.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isOwn = item.senderId === CURRENT_USER_ID;
          return (
            <View style={[styles.messageBubbleContainer, isOwn && styles.messageBubbleContainerOwn]}>
              {!isOwn && user.profilePhoto && (
                <Image source={{ uri: user.profilePhoto }} style={styles.messageAvatar} />
              )}
              <View style={[
                styles.messageBubble,
                isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
                { maxWidth: '70%' }
              ]}>
                <Text style={[styles.messageText, isOwn && styles.messageTextOwn, { fontSize: fontSize - 1 }]}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={[styles.chatInputContainer, {
        minHeight: inputHeight + 16,
        paddingBottom: 8,
      }]}>
        <TextInput
          style={[styles.chatInput, { height: inputHeight, fontSize }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Aa"
          placeholderTextColor={colors.neutral.placeholder}
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, { width: inputHeight, height: inputHeight }]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <SendIcon size={iconSize} color={inputText.trim() ? colors.romantic.pink : colors.neutral.disabled} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ConversationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isLandscape, hp, moderateScale } = useResponsive();

  // Use real conversations from API with live presence updates
  const { conversations: apiConversations, isLoading, refresh: refreshConversations } = useConversations();

  // Convert API conversations to local Conversation format
  const conversations: Conversation[] = useMemo(() => {
    return apiConversations.map((conv) => ({
      id: conv.id,
      participants: [{
        id: conv.otherUserId.toString(),
        firstName: conv.name.split(" ")[0] || conv.name,
        lastName: conv.name.split(" ").slice(1).join(" ") || undefined,
        profilePhoto: conv.avatarUrl || undefined,
        isOnline: conv.online,
        isVerified: false,
      }],
      lastMessage: {
        id: `msg-${conv.id}`,
        conversationId: conv.id,
        senderId: "other",
        type: "text" as const,
        content: conv.message,
        status: "delivered" as const,
        createdAt: new Date(),
      },
      unreadCount: conv.unreadCount,
      isPinned: false,
      isMuted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }, [apiConversations]);
  const [newMatches] = useState(MOCK_NEW_MATCHES);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // Responsive sizes
  const titleSize = useMemo(() => isLandscape ? clamp(hp(7), 20, 26) : clamp(moderateScale(26), 22, 30), [isLandscape, hp, moderateScale]);
  const searchHeight = useMemo(() => isLandscape ? clamp(hp(10), 36, 44) : clamp(moderateScale(44), 40, 52), [isLandscape, hp, moderateScale]);
  const fontSize = useMemo(() => isLandscape ? clamp(hp(3.5), 13, 16) : clamp(moderateScale(15), 14, 17), [isLandscape, hp, moderateScale]);
  const iconSize = useMemo(() => isLandscape ? clamp(hp(5), 18, 24) : clamp(moderateScale(22), 18, 26), [isLandscape, hp, moderateScale]);
  const sectionPadding = useMemo(() => isLandscape ? clamp(hp(2.5), 10, 16) : clamp(moderateScale(16), 12, 20), [isLandscape, hp, moderateScale]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const user = c.participants[0];
        const name = `${user.firstName} ${user.lastName || ''}`.toLowerCase();
        return name.includes(query) || c.lastMessage?.content?.toLowerCase().includes(query);
      });
    }
    return [...result].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations, searchQuery]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  }, [refreshConversations]);

  const handleConversationPress = useCallback((conversation: Conversation) => {
    if (isLandscape) {
      // In landscape, show chat inline
      setSelectedConversation(conversation);
    } else {
      // In portrait, navigate to chat screen
      const user = conversation.participants[0];
      (navigation as any).navigate('Chat', {
        conversationId: conversation.id,
        userName: `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`,
        userPhoto: user.profilePhoto,
        userId: user.id,
      });
    }
  }, [isLandscape, navigation]);

  const handleNewMatchPress = useCallback((match: { id: string; user: { id: string; firstName: string; profilePhoto?: string } }) => {
    (navigation as any).navigate('Chat', {
      conversationId: `new-${match.id}`,
      userName: match.user.firstName,
      userPhoto: match.user.profilePhoto || '',
      userId: match.user.id,
    });
  }, [navigation]);

  const handleSendMessage = useCallback((text: string) => {
    console.log('Message sent:', text);
  }, []);

  // Render conversation item (Messenger style)
  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => {
    const user = item.participants[0];
    const hasUnread = item.unreadCount > 0;
    const isSelected = isLandscape && selectedConversation?.id === item.id;
    const isSentByMe = item.lastMessage?.senderId === CURRENT_USER_ID;

    const formatTime = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      return `${Math.floor(diffMs / 86400000)}d`;
    };

    const avatarSize = isLandscape ? clamp(hp(12), 40, 52) : clamp(moderateScale(54), 48, 62);
    const nameSize = isLandscape ? clamp(hp(3.8), 13, 16) : clamp(moderateScale(16), 14, 18);
    const previewSize = isLandscape ? clamp(hp(3.2), 12, 14) : clamp(moderateScale(14), 12, 16);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleConversationPress(item)}
        style={[
          styles.conversationItem,
          { paddingVertical: sectionPadding * 0.7, paddingHorizontal: sectionPadding },
          isSelected && styles.conversationItemSelected,
        ]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
              <Text style={{ color: colors.white, fontWeight: '600', fontSize: avatarSize * 0.4 }}>{user.firstName.charAt(0)}</Text>
            </View>
          )}
          {user.isOnline && (
            <View style={[styles.onlineDot, { width: avatarSize * 0.25, height: avatarSize * 0.25, borderRadius: avatarSize * 0.125 }]} />
          )}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationRow}>
            <Text style={[styles.conversationName, { fontSize: nameSize }, hasUnread && styles.conversationNameUnread]} numberOfLines={1}>
              {user.firstName} {user.lastName || ''}
            </Text>
            <Text style={[styles.conversationTime, { fontSize: previewSize - 2 }]}>
              {item.lastMessage?.createdAt ? formatTime(new Date(item.lastMessage.createdAt)) : ''}
            </Text>
          </View>
          <View style={styles.conversationRow}>
            <Text style={[styles.conversationPreview, { fontSize: previewSize }, hasUnread && styles.conversationPreviewUnread]} numberOfLines={1}>
              {isSentByMe ? 'You: ' : ''}{item.lastMessage?.content || 'Say hello!'}
            </Text>
            {hasUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [isLandscape, selectedConversation?.id, hp, moderateScale, sectionPadding, handleConversationPress]);

  // List header
  const ListHeader = useCallback(() => (
    <>
      {newMatches.length > 0 && !searchQuery && (
        <NewMatchesList matches={newMatches} onMatchPress={handleNewMatchPress} />
      )}
    </>
  ), [newMatches, searchQuery, handleNewMatchPress]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.surface} />
      <IncomingCallModal call={incomingCall} onAccept={() => setIncomingCall(null)} onDecline={() => setIncomingCall(null)} />

      {isLandscape ? (
        // LANDSCAPE: Split view with inline chat
        <View style={styles.landscapeContainer}>
          {/* Left Panel - Conversations List */}
          <View style={[styles.leftPanel, { borderRightColor: colors.neutral.border }]}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: sectionPadding, paddingVertical: sectionPadding * 0.6 }]}>
              <Text style={[styles.title, { fontSize: titleSize }]}>Chats</Text>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { paddingHorizontal: sectionPadding, paddingBottom: sectionPadding * 0.5 }]}>
              <View style={[styles.searchBox, { height: searchHeight, borderRadius: searchHeight / 2 }]}>
                <SearchIcon size={iconSize * 0.8} color={colors.neutral.placeholder} />
                <TextInput
                  style={[styles.searchInput, { fontSize: fontSize - 1 }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search Messenger"
                  placeholderTextColor={colors.neutral.placeholder}
                />
              </View>
            </View>

            {/* Conversations */}
            <FlatList
              data={filteredConversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={ListHeader}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.romantic.pink]} tintColor={colors.romantic.pink} />
              }
            />
          </View>

          {/* Right Panel - Inline Chat */}
          <View style={styles.rightPanel}>
            <InlineChat conversation={selectedConversation} onSendMessage={handleSendMessage} bottomPadding={80} />
          </View>
        </View>
      ) : (
        // PORTRAIT: Full-width conversation list
        <View style={styles.portraitContainer}>
          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: sectionPadding, paddingVertical: sectionPadding * 0.8 }]}>
            <Text style={[styles.title, { fontSize: titleSize }]}>Chats</Text>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { paddingHorizontal: sectionPadding, paddingBottom: sectionPadding * 0.6 }]}>
            <View style={[styles.searchBox, { height: searchHeight, borderRadius: searchHeight / 2 }]}>
              <SearchIcon size={iconSize * 0.8} color={colors.neutral.placeholder} />
              <TextInput
                style={[styles.searchInput, { fontSize }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search Messenger"
                placeholderTextColor={colors.neutral.placeholder}
              />
            </View>
          </View>

          {/* Conversations */}
          <FlatList
            data={filteredConversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            ListHeaderComponent={ListHeader}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.romantic.pink]} tintColor={colors.romantic.pink} />
            }
          />
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
  },

  // Layout
  portraitContainer: {
    flex: 1,
  },
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: '35%',
    borderRightWidth: 1,
  },
  rightPanel: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: colors.neutral.surface,
  },
  title: {
    color: colors.neutral.textPrimary,
    fontWeight: '700',
  },

  // Search
  searchContainer: {
    backgroundColor: colors.neutral.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    paddingHorizontal: spacing.m,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.s,
    color: colors.neutral.textPrimary,
    padding: 0,
  },

  // Conversation Item (Messenger style)
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationItemSelected: {
    backgroundColor: colors.neutral.background,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: colors.neutral.border,
  },
  avatarPlaceholder: {
    backgroundColor: colors.teal.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.semantic.success,
    borderWidth: 2,
    borderColor: colors.neutral.surface,
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.m,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationName: {
    color: colors.neutral.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  conversationNameUnread: {
    fontWeight: '700',
  },
  conversationTime: {
    color: colors.neutral.textSecondary,
    marginLeft: spacing.xs,
  },
  conversationPreview: {
    color: colors.neutral.textSecondary,
    flex: 1,
    marginTop: 2,
  },
  conversationPreviewUnread: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.romantic.pink,
    marginLeft: spacing.xs,
  },

  // Inline Chat Panel
  chatPanel: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
  },
  emptyChatPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
  },
  emptyChatText: {
    color: colors.neutral.textSecondary,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  chatAvatar: {
    backgroundColor: colors.neutral.border,
  },
  chatAvatarPlaceholder: {
    backgroundColor: colors.teal.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: spacing.m,
  },
  chatHeaderName: {
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
  chatHeaderStatus: {
    color: colors.neutral.textSecondary,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  chatHeaderButton: {
    padding: spacing.xs,
  },

  // Messages
  messagesList: {
    padding: spacing.m,
    flexGrow: 1,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    alignItems: 'flex-end',
  },
  messageBubbleContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.xs,
  },
  messageBubble: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: 18,
  },
  messageBubbleOwn: {
    backgroundColor: colors.romantic.pink,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.neutral.background,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: colors.neutral.textPrimary,
  },
  messageTextOwn: {
    color: colors.white,
  },

  // Chat Input
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    backgroundColor: colors.neutral.surface,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.neutral.background,
    borderRadius: 20,
    paddingHorizontal: spacing.m,
    marginRight: spacing.s,
    color: colors.neutral.textPrimary,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConversationsScreen;
