import { ConversationRow } from "@/components/chat/ConversationRow"
import { NewMatchAvatarRow } from "@/components/chat/NewMatchAvatarRow"
import { RequestRow } from "@/components/chat/RequestRow"
import type { Conversation, MessageRequest } from "@/lib/api/messages"
import { useConversations, useMessageRequests } from "@/lib/api/messages"
import { useAuthStore } from "@/lib/stores/authStore"
import { borderRadius, colors, fontSize, fontWeight, spacing } from "@/theme"
import { FlashList } from "@shopify/flash-list"
import { useRouter } from "expo-router"
import React, { useCallback, useMemo, useState } from "react"
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type TabType = "messages" | "requests"

export default function ChatListScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user);
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

  // Split conversations into matches with messages and without messages
  const { matchesWithMessages, matchesWithoutMessages } = useMemo(() => {
    const withMessages: Conversation[] = []
    const withoutMessages: Conversation[] = []

    conversations.forEach((conv) => {
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

  const onPressMatch = useCallback(
    (matchId: string) => {
      router.push({ pathname: '/(tabs)/chat/[matchId]', params: { matchId } })
    },
    [router]
  )

  const onPressRequest = useCallback(
    (senderId: string) => {
      router.push({ pathname: '/(tabs)/chat/request/[senderId]', params: { senderId } })
    },
    [router]
  )

  const renderAvatarItem = ({ item }: { item: Conversation }) => (
    <NewMatchAvatarRow item={item} onPress={onPressMatch} />
  )

  const renderItem = ({ item }: { item: Conversation }) => (
    <ConversationRow
      item={item}
      currentUserId={user?.id}
      onPress={onPressMatch}
    />
  )

  const renderRequestItem = ({ item }: { item: MessageRequest }) => (
    <RequestRow item={item} onPress={onPressRequest} />
  )

  const currentError = activeTab === "messages" ? error : requestsError
  const currentLoading = activeTab === "messages" ? isLoading : requestsLoading
  const currentRefetch = activeTab === "messages" ? refetch : refetchRequests

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
          <Text style={styles.sectionTitle}>New Matches</Text>
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
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Start swiping to find your gym crush!
              </Text>
            </View>
          ) : (
            <>
              {/* Vertical list of matches with messages */}
              {matchesWithMessages.length > 0 && (
                <View style={styles.messagesSection}>
                  <FlashList
                    data={matchesWithMessages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                      <RefreshControl
                        refreshing={isLoading}
                        onRefresh={refetch}
                        tintColor={colors.primary}
                      />
                    }
                    ItemSeparatorComponent={() => (
                      <View style={styles.separator} />
                    )}
                  />
                </View>
              )}

              {/* Show empty state if no matches at all */}
              {matchesWithMessages.length === 0 &&
                matchesWithoutMessages.length === 0 &&
                !isLoading && (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                      <Text style={styles.emptyIconText}>💬</Text>
                    </View>
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Start swiping to find your gym crush!
                    </Text>
                  </View>
                )}
            </>
          )}
        </>
      ) : (
        <>
          {requests.length === 0 && !requestsLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>📩</Text>
              </View>
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptySubtitle}>
                Messages from users who swiped up on you will appear here
              </Text>
            </View>
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
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing[16],
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: "center",
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
    fontWeight: fontWeight.semibold,
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
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    fontWeight: fontWeight.semibold,
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
