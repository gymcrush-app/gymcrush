import { NewMatchAvatarRow } from "@/components/chat/NewMatchAvatarRow"
import { RequestRow } from "@/components/chat/RequestRow"
import { SwipeableConversationRow } from "@/components/chat/SwipeableConversationRow"
import { EmptyState } from "@/components/ui/EmptyState"
import { useUnmatch } from "@/lib/api/matches"
import type { Conversation, ConversationMatch, MessageRequest } from "@/lib/api/messages"
import { useConversations, useMessageRequests } from "@/lib/api/messages"
import { useBlockedUserIds } from "@/lib/api/safety"
import { useUserProfileModal } from "@/lib/contexts/UserProfileModalContext"
import { useAuthStore } from "@/lib/stores/authStore"
import { borderRadius, colors, fontSize, fontFamily, spacing } from "@/theme"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { FlashList } from "@shopify/flash-list"
import { useRouter } from "expo-router"
import React, { useCallback, useMemo, useState } from "react"
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type TabType = "messages" | "requests"

export default function ChatListScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const { openUserProfile } = useUserProfileModal()
  const [activeTab, setActiveTab] = useState<TabType>("messages")
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useConversations()
  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useMessageRequests()
  const unmatchMutation = useUnmatch()
  const { data: blockedUserIds = [] } = useBlockedUserIds()
  const blockedSet = useMemo(() => new Set(blockedUserIds), [blockedUserIds])

  // Split conversations into matches with messages and without messages
  const { matchesWithMessages, matchesWithoutMessages } = useMemo(() => {
    const withMessages: Conversation[] = []
    const withoutMessages: ConversationMatch[] = []

    conversations.filter((c) => c.kind === 'gem_inbox' || !blockedSet.has(c.otherUser.id)).forEach((conv) => {
      if (conv.kind === "gem_inbox") {
        withMessages.push(conv)
        return
      }
      if (conv.lastMessage) {
        withMessages.push(conv)
      } else {
        withoutMessages.push(conv)
      }
    })

    return {
      matchesWithMessages: withMessages,
      matchesWithoutMessages: withoutMessages,
    }
  }, [conversations])

  const onPressConversation = useCallback(
    (item: Conversation) => {
      if (item.kind === "gem_inbox") {
        openUserProfile(item.otherUser.id)
        return
      }
      router.push({ pathname: "/(tabs)/chat/[matchId]", params: { matchId: item.id } })
    },
    [router, openUserProfile],
  )

  const onPressMatch = useCallback(
    (matchId: string) => {
      router.push({ pathname: "/(tabs)/chat/[matchId]", params: { matchId } })
    },
    [router],
  )

  const onPressRequest = useCallback(
    (senderId: string) => {
      router.push({
        pathname: "/(tabs)/chat/request/[senderId]",
        params: { senderId },
      })
    },
    [router],
  )

  const onUnmatch = useCallback(
    async (matchId: string) => {
      try {
        await unmatchMutation.mutateAsync({ matchId })
      } catch {
        // Error already surfaced by mutation
      }
    },
    [unmatchMutation],
  )

  const renderAvatarItem = ({ item }: { item: ConversationMatch }) => (
    <NewMatchAvatarRow item={item} onPress={onPressMatch} />
  )

  const renderItem = ({ item }: { item: Conversation }) => (
    <SwipeableConversationRow
      item={item}
      currentUserId={user?.id}
      onPress={onPressConversation}
      onUnmatch={onUnmatch}
    />
  )

  const renderRequestItem = ({ item }: { item: MessageRequest }) => (
    <RequestRow item={item} onPress={onPressRequest} />
  )

  const currentError = activeTab === "messages" ? error : requestsError

  if (currentError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Error loading{" "}
            {activeTab === "messages" ? "conversations" : "requests"}
          </Text>
          {currentError instanceof Error && (
            <Text style={styles.errorDetail}>{currentError.message}</Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, spacing[4]) },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      {/* New Matches Section - Always visible at top */}
      {matchesWithoutMessages.length > 0 && (
        <View style={styles.newMatchesSection}>
          <Text style={styles.sectionTitle}>Gym Crushes</Text>
          <FlashList
            data={matchesWithoutMessages}
            renderItem={renderAvatarItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            ItemSeparatorComponent={() => (
              <View style={styles.horizontalSeparator} />
            )}
          />
        </View>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "messages" && styles.tabActive]}
          onPress={() => setActiveTab("messages")}
          accessibilityRole="tab"
          accessibilityLabel="Messages"
          accessibilityState={{ selected: activeTab === "messages" }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "messages" && styles.tabTextActive,
            ]}
          >
            Messages
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "requests" && styles.tabActive]}
          onPress={() => setActiveTab("requests")}
          accessibilityRole="tab"
          accessibilityLabel="Requests"
          accessibilityState={{ selected: activeTab === "requests" }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "requests" && styles.tabTextActive,
            ]}
          >
            Requests
          </Text>
          {requests.length > 0 && <View style={styles.tabBadge} />}
        </Pressable>
      </View>

      {activeTab === "messages" ? (
        <>
          {conversations.length === 0 && !isLoading ? (
            <EmptyState
              icon={
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={40}
                  color={colors.mutedForeground}
                />
              }
              title="No messages yet"
              description="Start swiping to find your gym crush!"
              iconSize="sm"
            />
          ) : (
            <>
              {/* Vertical list of matches with messages */}
              {matchesWithMessages.length > 0 && (
                <View style={styles.messagesSection}>
                  <FlashList
                    data={matchesWithMessages}
                    renderItem={renderItem}
                    keyExtractor={(item) =>
                      item.kind === "gem_inbox" ? item.rowId : item.id
                    }
                    refreshControl={
                      <RefreshControl
                        refreshing={isLoading}
                        onRefresh={refetch}
                        tintColor={colors.primary}
                      />
                    }
                  />
                </View>
              )}

              {/* Show empty state if no matches at all */}
              {matchesWithMessages.length === 0 &&
                matchesWithoutMessages.length === 0 &&
                !isLoading && (
                  <EmptyState
                    icon={
                      <MaterialCommunityIcons
                        name="message-text-outline"
                        size={40}
                        color={colors.mutedForeground}
                      />
                    }
                    title="No messages yet"
                    description="Start swiping to find your gym crush!"
                    iconSize="sm"
                  />
                )}
            </>
          )}
        </>
      ) : (
        <>
          {requests.length === 0 && !requestsLoading ? (
            <EmptyState
              icon={
                <MaterialCommunityIcons
                  name="inbox"
                  size={40}
                  color={colors.mutedForeground}
                />
              }
              title="No requests yet"
              description="Messages from users who swiped up on you will appear here"
              iconSize="sm"
            />
          ) : (
            <View style={styles.messagesSection}>
              <FlashList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.sender.id}
                refreshControl={
                  <RefreshControl
                    refreshing={requestsLoading}
                    onRefresh={refetchRequests}
                    tintColor={colors.primary}
                  />
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  headerTitle: {
    fontSize: fontSize["2xl"],
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[16],
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[4],
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.destructive,
    marginBottom: spacing[2],
  },
  errorDetail: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  newMatchesSection: {
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  horizontalListContent: {
    paddingHorizontal: spacing[4],
  },
  avatarItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarItemPressed: {
    opacity: 0.7,
  },
  horizontalSeparator: {
    width: spacing[3],
  },
  messagesSection: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing[2],
  },
  tabActive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  tabText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeMedium,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  tabBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 8,
    height: 8,
    position: "absolute",
    top: 8,
    right: 42,
  },
})
