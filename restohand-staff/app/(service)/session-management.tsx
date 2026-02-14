import { Colors } from '@/constants/theme';
import {
  useFindSessionsQuery,
  useCreateCustomerSessionMutation,
} from '@/store/api/customerSessionsApi';
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
} from '@/store/api/restaurantsApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';
import { skipToken } from '@reduxjs/toolkit/query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeDuration = (startTime: string) => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) {
    return `${diffMins}m`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }
};

export default function SessionManagementScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { tableId } = useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Get restaurant details
  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId }
  );

  // Get table information
  const { data: enhancedTables } = useListEnhancedTablesQuery(
    restaurantId ? { restaurantId } : skipToken,
    { skip: !restaurantId }
  );

  const selectedTable = useMemo(() => {
    return enhancedTables?.find((table) => table.id === tableId) ?? null;
  }, [enhancedTables, tableId]);

  // Get active sessions for this table
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useFindSessionsQuery(
    restaurantId && tableId
      ? {
          restaurantId,
          tableId: tableId as string,
          status: 'active',
          limit: 10,
        }
      : skipToken,
    { skip: !restaurantId || !tableId }
  );

  // Mutations
  const [createCustomerSession] = useCreateCustomerSessionMutation();

  const activeSessions = sessionsData?.sessions || [];

  const handleCreateNewSession = async () => {
    if (!restaurant || !selectedTable) {
      Alert.alert('Error', 'Missing restaurant or table data');
      return;
    }

    setIsCreatingSession(true);
    try {
      console.log('🔄 DEBUG: Creating session with payload:', {
        restaurantSlug: restaurant.slug,
        tableId: selectedTable.id,
        activeSessions: activeSessions.length,
        note: 'Backend will auto-calculate customerNumber'
      });

      const sessionResponse = await createCustomerSession({
        restaurantSlug: restaurant.slug,
        tableId: selectedTable.id,
      }).unwrap();

      // Navigate to menu with the new session
      router.push({
        pathname: '/(service)/menu',
        params: {
          sessionId: sessionResponse.sessionId,
          tableId: selectedTable.id,
          restaurant_slug: restaurant.slug,
          isNewSession: 'true', // Always new since we're creating it directly
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Session Creation Failed',
        error?.message || 'Failed to create session'
      );
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleResumeSession = (sessionId: string) => {
    if (!selectedTable || !restaurant) return;

    router.push({
      pathname: '/(service)/menu',
      params: {
        sessionId,
        tableId: selectedTable.id,
        restaurant_slug: restaurant.slug,
        isNewSession: 'false',
      },
    });
  };


  const handleRefresh = () => {
    refetchSessions();
  };

  const tableNumber =
    selectedTable?.displayName ||
    selectedTable?.tableNumber ||
    `Table ${tableId}`;

  if (sessionsLoading && !selectedTable) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.brand} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading table sessions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: isDark ? '#374151' : '#e5e7eb',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.text }]}>
            {tableNumber}
          </Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Manage Customer Sessions
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.iconButton,
            { backgroundColor: isDark ? '#374151' : '#f3f4f6' },
          ]}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* New Session Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.newSessionButton, { backgroundColor: theme.brand }]}
            onPress={handleCreateNewSession}
            disabled={isCreatingSession}
          >
            <View style={styles.newSessionContent}>
              <View style={styles.newSessionIconContainer}>
                {isCreatingSession ? (
                  <ActivityIndicator size={24} color="#ffffff" />
                ) : (
                  <Ionicons name="add-circle" size={24} color="#ffffff" />
                )}
              </View>
              <View style={styles.newSessionInfo}>
                <Text style={styles.newSessionTitle}>
                  {isCreatingSession ? 'Creating Session...' : 'Start New Order'}
                </Text>
                <Text style={styles.newSessionSubtitle}>
                  {isCreatingSession
                    ? 'Please wait...'
                    : 'Begin ordering for new customers'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Active Sessions ({activeSessions.length})
            </Text>
            {activeSessions.map((session, index) => (
              <View
                key={session.sessionId}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: theme.background,
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                  },
                ]}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionMainInfo}>
                    <Text style={[styles.sessionTitle, { color: theme.text }]}>
                      Customer Session #{index + 1}
                    </Text>
                    <View style={styles.sessionMeta}>
                      <View style={styles.sessionMetaItem}>
                        <Ionicons name="time" size={12} color={theme.brand} />
                        <Text style={[styles.sessionMetaText, { color: theme.brand }]}>
                          Started {formatTime(session.startedAt)}
                        </Text>
                      </View>
                      <View style={styles.sessionMetaItem}>
                        <Ionicons name="hourglass" size={12} color={theme.icon} />
                        <Text style={[styles.sessionMetaText, { color: theme.icon }]}>
                          {getTimeDuration(session.startedAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.sessionStatus,
                      { backgroundColor: isDark ? '#064E3B' : '#dcfce7' },
                    ]}
                  >
                    <Text style={styles.sessionStatusText}>Active</Text>
                  </View>
                </View>

                <View style={styles.sessionStats}>
                  <View style={styles.sessionStat}>
                    <Text style={[styles.sessionStatLabel, { color: theme.icon }]}>
                      Orders
                    </Text>
                    <Text style={[styles.sessionStatValue, { color: theme.text }]}>
                      {session.totalOrders}
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={[styles.sessionStatLabel, { color: theme.icon }]}>
                      Amount
                    </Text>
                    <Text style={[styles.sessionStatValue, { color: theme.text }]}>
                      {formatCurrency(session.totalAmount)}
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={[styles.sessionStatLabel, { color: theme.icon }]}>
                      Status
                    </Text>
                    <Text
                      style={[
                        styles.sessionStatValue,
                        {
                          color: session.allOrdersPaid ? '#16a34a' : '#dc2626',
                        },
                      ]}
                    >
                      {session.allOrdersPaid ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionActions}>
                  <TouchableOpacity
                    style={[
                      styles.sessionActionButton,
                      styles.continueButton,
                      { backgroundColor: theme.brand },
                    ]}
                    onPress={() => handleResumeSession(session.sessionId)}
                  >
                    <Ionicons name="restaurant" size={16} color="#ffffff" />
                    <Text style={styles.sessionActionText}>Continue Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {activeSessions.length === 0 && !sessionsLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Active Sessions
            </Text>
            <Text style={[styles.emptyText, { color: theme.icon }]}>
              This table has no ongoing customer sessions.
              {'\n'}Start a new order to begin serving customers.
            </Text>
          </View>
        )}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={[styles.helpText, { color: theme.icon }]}>
            💡 Each session represents a separate group of customers
          </Text>
          <Text style={[styles.helpText, { color: theme.icon }]}>
            Multiple sessions can run simultaneously at the same table
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 6,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  section: {
    margin: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  newSessionButton: {
    padding: 16,
    borderRadius: 12,
  },
  newSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newSessionIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  newSessionInfo: {
    flex: 1,
  },
  newSessionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  newSessionSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionMainInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingVertical: 8,
  },
  sessionStat: {
    alignItems: 'center',
  },
  sessionStatLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  sessionStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  continueButton: {},
  sessionActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  helpContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 4,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
  },
});