import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useListKitchenStationsQuery,
  useGetStationAssignmentsQuery,
  useUpdateAssignmentStatusMutation,
} from '@/store/api/kitchenApi';
import type { StationType, AssignmentStatus } from '@/store/api/types';

const getStationIcon = (type: StationType) => {
  switch (type) {
    case 'grill':
      return '🔥';
    case 'fryer':
      return '🍟';
    case 'salad':
      return '🥗';
    case 'beverage':
      return '☕';
    case 'dessert':
      return '🍰';
    case 'preparation':
      return '👨‍🍳';
    default:
      return '⚙️';
  }
};

const getStationColor = (type: StationType) => {
  switch (type) {
    case 'grill':
      return '#dc2626';
    case 'fryer':
      return '#ea580c';
    case 'salad':
      return '#16a34a';
    case 'beverage':
      return '#2563eb';
    case 'dessert':
      return '#9333ea';
    case 'preparation':
      return '#ca8a04';
    default:
      return '#6b7280';
  }
};

export default function KitchenStationsScreen() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [refreshing, setRefreshing] = useState(false);

  const { data: stationsData, isLoading, refetch } = useListKitchenStationsQuery(
    restaurantId ? { restaurantId } : { restaurantId: '' },
    { skip: !restaurantId }
  );

  const { data: stationAssignments, refetch: refetchAssignments } = useGetStationAssignmentsQuery(
    restaurantId ? { restaurantId } : { restaurantId: '' },
    { skip: !restaurantId }
  );

  const [updateAssignmentStatus] = useUpdateAssignmentStatusMutation();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchAssignments()]);
    setRefreshing(false);
  };

  const handleAssignmentUpdate = async (assignmentId: string, status: AssignmentStatus) => {
    if (!restaurantId) return;

    try {
      await updateAssignmentStatus({ restaurantId, assignmentId, status }).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to update assignment status');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!stationsData || stationsData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Kitchen Stations</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏪</Text>
          <Text style={styles.emptyTitle}>No Kitchen Stations</Text>
          <Text style={styles.emptySubtitle}>
            Set up kitchen stations to manage order workflow
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kitchen Stations</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.stationsGrid}>
          {stationsData.map((station) => {
            const assignments = stationAssignments?.filter(a => a.stationId === station.id) || [];
            const activeAssignments = assignments.filter(a =>
              a.status === 'assigned' || a.status === 'in_progress'
            );
            const utilizationRate = station.capacity > 0
              ? (activeAssignments.length / station.capacity) * 100
              : 0;
            const stationColor = getStationColor(station.type);

            return (
              <View key={station.id} style={styles.stationCard}>
                <View style={styles.stationHeader}>
                  <View style={styles.stationInfo}>
                    <View style={[styles.stationIcon, { backgroundColor: `${stationColor}20` }]}>
                      <Text style={styles.stationIconText}>
                        {getStationIcon(station.type)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.stationName}>{station.name}</Text>
                      <Text style={[styles.stationType, { color: stationColor }]}>
                        {station.type.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: station.isActive ? '#16a34a' : '#6b7280' }
                  ]}>
                    <Text style={styles.statusText}>
                      {station.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <View style={styles.stationStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {activeAssignments.length}/{station.capacity}
                    </Text>
                    <Text style={styles.statLabel}>Capacity</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Math.round(utilizationRate)}%</Text>
                    <Text style={styles.statLabel}>Utilization</Text>
                  </View>
                </View>

                <View style={styles.stationMetrics}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Avg Prep Time</Text>
                    <Text style={styles.metricValue}>{station.avgPrepTime}min</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Today's Orders</Text>
                    <Text style={styles.metricValue}>{station.todayOrdersCount}</Text>
                  </View>
                </View>

                {activeAssignments.length > 0 && (
                  <View style={styles.assignmentsSection}>
                    <Text style={styles.assignmentsTitle}>Active Orders</Text>
                    {activeAssignments.slice(0, 2).map((assignment) => (
                      <View key={assignment.id} style={styles.assignmentItem}>
                        <Text style={styles.assignmentOrder}>{assignment.orderNumber}</Text>
                        <TouchableOpacity
                          style={[
                            styles.assignmentButton,
                            assignment.status === 'assigned' ? styles.startButton : styles.completeButton
                          ]}
                          onPress={() => handleAssignmentUpdate(
                            assignment.id,
                            assignment.status === 'assigned' ? 'in_progress' : 'completed'
                          )}
                        >
                          <Ionicons
                            name={assignment.status === 'assigned' ? 'play' : 'checkmark'}
                            size={14}
                            color="#ffffff"
                          />
                          <Text style={styles.assignmentButtonText}>
                            {assignment.status === 'assigned' ? 'Start' : 'Done'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {activeAssignments.length > 2 && (
                      <Text style={styles.moreAssignments}>
                        +{activeAssignments.length - 2} more
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  stationsGrid: {
    padding: 16,
    gap: 16,
  },
  stationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stationIconText: {
    fontSize: 20,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  stationType: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  stationStats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  stationMetrics: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  assignmentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  assignmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  assignmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    marginBottom: 8,
  },
  assignmentOrder: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  assignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  startButton: {
    backgroundColor: '#2563eb',
  },
  completeButton: {
    backgroundColor: '#16a34a',
  },
  assignmentButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  moreAssignments: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});