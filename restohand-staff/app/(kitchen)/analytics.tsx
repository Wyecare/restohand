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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import { useGetStationMetricsQuery } from '@/store/api/kitchenApi';
import type { StationType } from '@/store/api/types';

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

export default function KitchenAnalyticsScreen() {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const [refreshing, setRefreshing] = useState(false);

  const { data: stationMetrics, isLoading, refetch } = useGetStationMetricsQuery(
    restaurantId ? { restaurantId } : { restaurantId: '' },
    { skip: !restaurantId }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!stationMetrics || stationMetrics.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Kitchen Analytics</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Analytics Available</Text>
          <Text style={styles.emptySubtitle}>
            Kitchen station analytics will appear here once you start using stations
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate overall metrics
  const totalCompleted = stationMetrics.reduce((sum, station) => sum + station.completedToday, 0);
  const avgUtilization = stationMetrics.reduce((sum, station) => sum + station.utilizationRate, 0) / stationMetrics.length;
  const avgPrepTime = stationMetrics.reduce((sum, station) => sum + station.todayAvgPrepTime, 0) / stationMetrics.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kitchen Analytics</Text>
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
        {/* Overall Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              </View>
              <Text style={styles.metricValue}>{totalCompleted}</Text>
              <Text style={styles.metricLabel}>Orders Completed</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="trending-up" size={24} color="#2563eb" />
              </View>
              <Text style={styles.metricValue}>{Math.round(avgUtilization)}%</Text>
              <Text style={styles.metricLabel}>Avg Utilization</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons name="time" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.metricValue}>{Math.round(avgPrepTime)}min</Text>
              <Text style={styles.metricLabel}>Avg Prep Time</Text>
            </View>
          </View>
        </View>

        {/* Station Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Station Performance</Text>
          <View style={styles.stationsContainer}>
            {stationMetrics.map((station) => (
              <View key={station.id} style={styles.stationAnalyticsCard}>
                <View style={styles.stationHeader}>
                  <Text style={styles.stationIcon}>
                    {getStationIcon(station.type)}
                  </Text>
                  <Text style={styles.stationName}>{station.name}</Text>
                </View>

                <View style={styles.stationStatsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{station.completedToday}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Math.round(station.utilizationRate)}%</Text>
                    <Text style={styles.statLabel}>Efficiency</Text>
                  </View>
                </View>

                <View style={styles.stationDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Avg Time</Text>
                    <Text style={styles.detailValue}>{station.todayAvgPrepTime}min</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Current Load</Text>
                    <Text style={styles.detailValue}>
                      {station.currentLoad}/{station.capacity}
                    </Text>
                  </View>
                </View>

                {/* Utilization Progress Bar */}
                <View style={styles.progressContainer}>
                  <Text style={styles.progressLabel}>Utilization</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(station.utilizationRate, 100)}%`,
                          backgroundColor:
                            station.utilizationRate > 80
                              ? '#dc2626'
                              : station.utilizationRate > 60
                                ? '#f59e0b'
                                : '#16a34a',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  stationsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  stationAnalyticsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  stationStatsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  stationDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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