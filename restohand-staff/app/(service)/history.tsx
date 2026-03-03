import React, { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useFindSessionsQuery,
  useGetSessionWithBillQuery,
  type CustomerSession,
  type SessionOrder,
} from '@/store/api/customerSessionsApi';
import {
  useGetDetailedSessionBillQuery,
  type DetailedBillCalculation,
} from '@/store/api/billingApi';
import { useGenerateSessionReceiptQrMutation } from '@/store/api/ordersApi';

// Modern color palette
const AppColors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    primary: '#3B82F6',
    primaryLight: '#DBEAFE',
    primaryDark: '#1D4ED8',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    gray: '#64748B',
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FilterState {
  search: string;
  tableNumber: string;
  dateFrom: string;
  dateTo: string;
  status: CustomerSession['status'] | 'all';
}

export default function SessionHistoryScreen() {
  const theme = AppColors.light;
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tableNumber: '',
    dateFrom: '',
    dateTo: '',
    status: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showReceiptQr, setShowReceiptQr] = useState(false);
  const [selectedSessionForQr, setSelectedSessionForQr] =
    useState<CustomerSession | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set()
  );

  const [
    generateSessionReceiptQr,
    { data: sessionReceiptQr, isLoading: isQrGenerating },
  ] = useGenerateSessionReceiptQrMutation();

  // Build query parameters for sessions
  const queryParams = useMemo(() => {
    const params: any = {
      restaurantId: restaurantId!,
      page,
      limit: 20,
    };

    if (filters.status && filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters.tableNumber.trim()) {
      params.tableNumber = filters.tableNumber.trim();
    }
    if (filters.dateFrom) {
      params.startDate = filters.dateFrom;
    }
    if (filters.dateTo) {
      params.endDate = filters.dateTo;
    }

    return params;
  }, [restaurantId, page, filters]);

  const {
    data: sessionHistory,
    isLoading,
    isFetching,
    refetch,
  } = useFindSessionsQuery(queryParams, {
    skip: !restaurantId,
  });

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const formatDateShort = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      tableNumber: '',
      dateFrom: '',
      dateTo: '',
      status: 'all',
    });
    setPage(1);
  }, []);

  const loadMoreData = useCallback(() => {
    if (
      sessionHistory &&
      sessionHistory.page <
        Math.ceil(sessionHistory.total / sessionHistory.limit) &&
      !isFetching
    ) {
      setPage((prev) => prev + 1);
    }
  }, [sessionHistory, isFetching]);

  const handleGenerateQr = useCallback(
    async (session: CustomerSession) => {
      if (!restaurantId || !session.sessionId) {
        Alert.alert(
          'Error',
          'Unable to generate receipt. Session information missing.'
        );
        return;
      }

      try {
        setSelectedSessionForQr(session);
        await generateSessionReceiptQr({
          restaurantId,
          customerSessionId: session.sessionId,
          tableNumber: session.tableNumber,
        }).unwrap();
        setShowReceiptQr(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to generate receipt QR code');
        console.error('QR generation error:', error);
      }
    },
    [restaurantId, generateSessionReceiptQr]
  );

  // Uses functional update only — no stale closure on expandedSessions
  const toggleSession = useCallback((sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }, []);

  const getStatusConfig = useCallback(
    (status: CustomerSession['status']) => {
      switch (status) {
        case 'active':
          return {
            icon: 'time' as const,
            label: 'Active',
            color: theme.warning,
            bgColor: theme.warningLight,
          };
        case 'closed':
          return {
            icon: 'checkmark-circle' as const,
            label: 'Closed',
            color: theme.success,
            bgColor: theme.successLight,
          };
        case 'abandoned':
          return {
            icon: 'alert-circle' as const,
            label: 'Abandoned',
            color: theme.gray,
            bgColor: '#F1F5F9',
          };
        default:
          return {
            icon: 'help-circle' as const,
            label: 'Unknown',
            color: theme.gray,
            bgColor: '#F1F5F9',
          };
      }
    },
    [theme]
  );

  const renderSessionItem = useCallback(
    ({ item }: { item: CustomerSession }) => {
      const isExpanded = expandedSessions.has(item.sessionId);
      const statusConfig = getStatusConfig(item.status);

      return (
        <View style={[styles.sessionCard, { backgroundColor: theme.surface }]}>
          {/* Compact Header */}
          <TouchableOpacity
            style={styles.sessionHeader}
            onPress={() => toggleSession(item.sessionId)}
            activeOpacity={0.7}
          >
            <View style={styles.sessionTopRow}>
              <View style={styles.sessionIdentifiers}>
                <View style={styles.sessionIdContainer}>
                  <Ionicons name="receipt" size={16} color={theme.primary} />
                  <Text style={[styles.sessionId, { color: '#0F172A' }]}>
                    #{item.sessionId.slice(-6).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.tableBadge}>
                  <Ionicons
                    name="restaurant"
                    size={12}
                    color={'#64748B'}
                  />
                  <Text
                    style={[
                      styles.tableBadgeText,
                      { color: '#64748B' },
                    ]}
                  >
                    {item.tableNumber}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.bgColor },
                ]}
              >
                <Ionicons
                  name={statusConfig.icon}
                  size={14}
                  color={statusConfig.color}
                />
                <Text
                  style={[styles.statusText, { color: statusConfig.color }]}
                >
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            <View style={styles.sessionMiddleRow}>
              <Text style={[styles.sessionAmount, { color: '#0F172A' }]}>
                {formatCurrency(item.totalAmount)}
              </Text>
              <Text style={[styles.orderCount, { color: '#94A3B8' }]}>
                {item.totalOrders} {item.totalOrders === 1 ? 'order' : 'orders'}
              </Text>
            </View>

            <View style={styles.sessionBottomRow}>
              <View style={styles.timeContainer}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={'#94A3B8'}
                />
                <Text style={[styles.timeText, { color: '#94A3B8' }]}>
                  {formatDateShort(item.startedAt)} •{' '}
                  {formatTime(item.startedAt)}
                </Text>
              </View>

              <View style={styles.expandIndicator}>
                <Text
                  style={[styles.expandText, { color: '#94A3B8' }]}
                >
                  {isExpanded ? 'Less' : 'Details'}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={'#94A3B8'}
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* Expanded Details */}
          {isExpanded && (
            <View
              style={[styles.expandedSection, { borderTopColor: theme.border }]}
            >
              {/* Payment Info */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={'#64748B'}
                  />
                  <Text
                    style={[
                      styles.detailLabelText,
                      { color: '#64748B' },
                    ]}
                  >
                    Payment Status
                  </Text>
                </View>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: item.allOrdersPaid ? theme.success : theme.warning,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {item.allOrdersPaid
                    ? 'Fully Paid'
                    : `₹${item.pendingAmount} Pending`}
                </Text>
              </View>

              {/* Duration */}
              {item.closedAt && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <Ionicons
                      name="hourglass-outline"
                      size={16}
                      color={'#64748B'}
                    />
                    <Text
                      style={[
                        styles.detailLabelText,
                        { color: '#64748B' },
                      ]}
                    >
                      Session Duration
                    </Text>
                  </View>
                  <Text
                    style={[styles.detailValue, { color: '#64748B' }]}
                  >
                    {formatDateShort(item.startedAt)} -{' '}
                    {formatDateShort(item.closedAt)}
                  </Text>
                </View>
              )}

              {/* Orders List */}
              <SessionOrders
                sessionId={item.sessionId}
                theme={theme}
              />

              {/* Actions */}
              {item.status === 'closed' && (
                <TouchableOpacity
                  style={[styles.qrButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleGenerateQr(item)}
                  disabled={isQrGenerating}
                >
                  <Ionicons name="qr-code" size={18} color="#FFFFFF" />
                  <Text style={styles.qrButtonText}>
                    {isQrGenerating &&
                    selectedSessionForQr?.sessionId === item.sessionId
                      ? 'Generating QR...'
                      : 'Generate Receipt QR'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    },
    [
      theme,
      formatCurrency,
      formatDateShort,
      formatTime,
      handleGenerateQr,
      isQrGenerating,
      selectedSessionForQr,
      expandedSessions,
      toggleSession,
      getStatusConfig,
    ]
  );

  // Component for rendering session details with comprehensive item breakdown
  const SessionOrders = ({
    sessionId,
    theme,
  }: {
    sessionId: string;
    theme: any;
  }) => {
    // Only use the detailed session bill query - no legacy API calls
    const { data: detailedBill, isLoading } = useGetDetailedSessionBillQuery(
      { sessionId, includeUnpaid: true },
      { skip: !sessionId }
    );

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: '#64748B' }]}>
            Loading session details...
          </Text>
        </View>
      );
    }

    if (!detailedBill) {
      return null;
    }

    return (
      <View style={styles.ordersSection}>
        {/* All Items Section - Item-level breakdown */}
        <View style={styles.allItemsSection}>
          <View style={styles.ordersSectionHeader}>
            <Ionicons name="receipt" size={16} color={'#64748B'} />
            <Text style={[styles.ordersSectionTitle, { color: '#64748B' }]}>
              All Items ({detailedBill.allItems.length})
            </Text>
          </View>

          <View style={styles.itemsList}>
            {detailedBill.allItems.map((item, index) => {
              const pricePerUnitWithTax = item.totalWithTax / item.quantity;
              return (
                <View key={index} style={[styles.itemCard, {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#e5e7eb'
                }]}>
                  <View style={styles.itemCardContent}>
                    <View style={styles.itemMainInfo}>
                      <Text style={[styles.itemCardName, { color: '#0F172A' }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemCalculation, { color: '#64748B' }]}>
                        {item.quantity} × {formatCurrency(pricePerUnitWithTax)} = {formatCurrency(item.totalWithTax)}
                      </Text>
                      {item.gstRate > 0 && (
                        <Text style={[styles.gstInfo, { color: '#94A3B8' }]}>
                          GST @ {item.gstRate}% • Tax: {formatCurrency(item.totalTaxAmount)}
                        </Text>
                      )}
                      {item.hsnCode && (
                        <Text style={[styles.hsnCode, { color: '#94A3B8' }]}>
                          HSN: {item.hsnCode}
                        </Text>
                      )}
                    </View>
                    <View style={styles.itemPriceInfo}>
                      <Text style={[styles.itemCardTotal, { color: '#0F172A' }]}>
                        {formatCurrency(item.totalWithTax)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Orders Breakdown Section */}
        <View style={styles.ordersBreakdownSection}>
          <View style={styles.ordersSectionHeader}>
            <Ionicons name="list" size={16} color={'#64748B'} />
            <Text style={[styles.ordersSectionTitle, { color: '#64748B' }]}>
              Orders ({detailedBill.orderBreakdown.length})
            </Text>
          </View>

          {detailedBill.orderBreakdown.map((order) => (
            <View key={order.orderId} style={[styles.orderBreakdownCard, { backgroundColor: '#FFFFFF' }]}>
              <View style={styles.orderBreakdownHeader}>
                <View style={styles.orderMainInfo}>
                  <Text style={[styles.orderBreakdownNumber, { color: '#0F172A' }]}>
                    #{order.orderNumber}
                  </Text>
                  <Text style={[styles.orderBreakdownDetails, { color: '#64748B' }]}>
                    Payment: {order.paymentStatus} • {order.itemCount} items
                  </Text>
                  <Text style={[styles.orderBreakdownDate, { color: '#94A3B8' }]}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN')} {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={[styles.orderBreakdownAmount, { color: '#0F172A' }]}>
                  {formatCurrency(order.totalAmount)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Detailed Bill Summary */}
        <View style={[styles.sessionTotalSection, { backgroundColor: '#eff6ff' }]}>
          <View style={styles.sessionTotalHeader}>
            <Text style={[styles.sessionTotalLabel, { color: '#0F172A' }]}>
              Session Total
            </Text>
            <Text style={[styles.sessionTotalAmount, { color: '#0F172A' }]}>
              {formatCurrency(detailedBill.totalAmount)}
            </Text>
          </View>

          <View style={styles.sessionTotalBreakdown}>
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#64748B' }]}>
                Subtotal
              </Text>
              <Text style={[styles.billValue, { color: '#0F172A' }]}>
                {formatCurrency(detailedBill.subTotalAmount)}
              </Text>
            </View>

            {detailedBill.cgstAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#64748B' }]}>
                  CGST
                </Text>
                <Text style={[styles.billValue, { color: '#0F172A' }]}>
                  {formatCurrency(detailedBill.cgstAmount)}
                </Text>
              </View>
            )}

            {detailedBill.sgstAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#64748B' }]}>
                  SGST
                </Text>
                <Text style={[styles.billValue, { color: '#0F172A' }]}>
                  {formatCurrency(detailedBill.sgstAmount)}
                </Text>
              </View>
            )}

            {detailedBill.igstAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#64748B' }]}>
                  IGST
                </Text>
                <Text style={[styles.billValue, { color: '#0F172A' }]}>
                  {formatCurrency(detailedBill.igstAmount)}
                </Text>
              </View>
            )}

            {detailedBill.taxAmount > 0 && (
              <View style={[styles.billRow, styles.billRowTotal]}>
                <Text style={[styles.billLabel, { color: '#0F172A', fontWeight: '600' }]}>
                  Total Tax
                </Text>
                <Text style={[styles.billValue, { color: '#0F172A', fontWeight: '600' }]}>
                  {formatCurrency(detailedBill.taxAmount)}
                </Text>
              </View>
            )}

            {detailedBill.discountAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#64748B' }]}>
                  Discount
                </Text>
                <Text style={[styles.billValue, { color: '#0F172A' }]}>
                  -{formatCurrency(detailedBill.discountAmount)}
                </Text>
              </View>
            )}

            {detailedBill.roundOffAmount !== 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#64748B' }]}>
                  Round Off
                </Text>
                <Text style={[styles.billValue, { color: '#0F172A' }]}>
                  {detailedBill.roundOffAmount >= 0 ? '+' : ''}{formatCurrency(detailedBill.roundOffAmount)}
                </Text>
              </View>
            )}

            {detailedBill.pendingAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#f59e0b', fontWeight: '600' }]}>
                  Pending
                </Text>
                <Text style={[styles.billValue, { color: '#f59e0b', fontWeight: '600' }]}>
                  {formatCurrency(detailedBill.pendingAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Tax Type */}
          {detailedBill.taxType && (
            <View style={[styles.taxTypeSection, { borderTopColor: '#bfdbfe' }]}>
              <Text style={[styles.taxTypeText, { color: '#64748B' }]}>
                Tax Type: {detailedBill.taxType === 'intra-state' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const ListHeader = useMemo(
    () => (
      <View style={styles.header}>
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={'#94A3B8'} />
          <TextInput
            style={[styles.searchInput, { color: '#0F172A' }]}
            placeholder="Search sessions or tables..."
            placeholderTextColor={'#94A3B8'}
            value={filters.search}
            onChangeText={(text) => handleFilterChange('search', text)}
          />
          {filters.search.length > 0 && (
            <TouchableOpacity onPress={() => handleFilterChange('search', '')}>
              <Ionicons
                name="close-circle"
                size={20}
                color={'#94A3B8'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChips}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: showFilters ? theme.primary : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options"
              size={16}
              color={showFilters ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: showFilters ? '#FFFFFF' : '#64748B' },
              ]}
            >
              Filters
            </Text>
          </TouchableOpacity>

          {filters.status !== 'all' && (
            <View
              style={[
                styles.activeFilterChip,
                { backgroundColor: theme.primaryLight },
              ]}
            >
              <Text style={[styles.activeFilterText, { color: theme.primary }]}>
                {filters.status.charAt(0).toUpperCase() +
                  filters.status.slice(1)}
              </Text>
              <TouchableOpacity
                onPress={() => handleFilterChange('status', 'all')}
              >
                <Ionicons name="close" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}

          {filters.tableNumber && (
            <View
              style={[
                styles.activeFilterChip,
                { backgroundColor: theme.primaryLight },
              ]}
            >
              <Text style={[styles.activeFilterText, { color: theme.primary }]}>
                Table: {filters.tableNumber}
              </Text>
              <TouchableOpacity
                onPress={() => handleFilterChange('tableNumber', '')}
              >
                <Ionicons name="close" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <View
            style={[styles.filtersPanel, { backgroundColor: theme.surface }]}
          >
            {/* Status Filter */}
            <View style={styles.filterGroup}>
              <Text
                style={[styles.filterLabel, { color: '#64748B' }]}
              >
                Status
              </Text>
              <View style={styles.statusButtons}>
                {['all', 'active', 'closed', 'abandoned'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      {
                        backgroundColor:
                          filters.status === status
                            ? theme.primary
                            : '#FFFFFF',
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleFilterChange('status', status)}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        {
                          color:
                            filters.status === status
                              ? '#FFFFFF'
                              : '#64748B',
                          fontWeight: filters.status === status ? '600' : '400',
                        },
                      ]}
                    >
                      {status === 'all'
                        ? 'All'
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Table Number */}
            <View style={styles.filterGroup}>
              <Text
                style={[styles.filterLabel, { color: '#64748B' }]}
              >
                Table Number
              </Text>
              <TextInput
                style={[
                  styles.filterInput,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: theme.border,
                    color: '#0F172A',
                  },
                ]}
                placeholder="e.g., T1, T2, T3..."
                placeholderTextColor={'#94A3B8'}
                value={filters.tableNumber}
                onChangeText={(text) => handleFilterChange('tableNumber', text)}
              />
            </View>

            {/* Date Range */}
            <View style={styles.filterGroup}>
              <Text
                style={[styles.filterLabel, { color: '#64748B' }]}
              >
                Date Range
              </Text>
              <View style={styles.dateRange}>
                <TextInput
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: '#FFFFFF',
                      borderColor: theme.border,
                      color: '#0F172A',
                    },
                  ]}
                  placeholder="From (YYYY-MM-DD)"
                  placeholderTextColor={'#94A3B8'}
                  value={filters.dateFrom}
                  onChangeText={(text) => handleFilterChange('dateFrom', text)}
                />
                <Text
                  style={[styles.dateSeparator, { color: '#94A3B8' }]}
                >
                  to
                </Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: '#FFFFFF',
                      borderColor: theme.border,
                      color: '#0F172A',
                    },
                  ]}
                  placeholder="To (YYYY-MM-DD)"
                  placeholderTextColor={'#94A3B8'}
                  value={filters.dateTo}
                  onChangeText={(text) => handleFilterChange('dateTo', text)}
                />
              </View>
            </View>

            {/* Clear Filters */}
            <TouchableOpacity
              style={[styles.clearFiltersButton, { borderColor: theme.border }]}
              onPress={clearFilters}
            >
              <Ionicons name="refresh" size={16} color={'#64748B'} />
              <Text
                style={[
                  styles.clearFiltersText,
                  { color: '#64748B' },
                ]}
              >
                Clear All Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results Summary */}
        {sessionHistory && sessionHistory.total > 0 && (
          <View style={styles.resultsSummary}>
            <Text style={[styles.resultsText, { color: '#64748B' }]}>
              Showing {sessionHistory.sessions.length} of {sessionHistory.total}{' '}
              sessions
            </Text>
          </View>
        )}
      </View>
    ),
    [
      theme,
      filters,
      showFilters,
      sessionHistory,
      handleFilterChange,
      clearFilters,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIconContainer,
            { backgroundColor: '#FFFFFF' },
          ]}
        >
          <Ionicons
            name="receipt-outline"
            size={48}
            color={'#94A3B8'}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: '#0F172A' }]}>
          No Sessions Found
        </Text>
        <Text style={[styles.emptySubtitle, { color: '#64748B' }]}>
          {filters.search || filters.status !== 'all' || filters.tableNumber
            ? 'Try adjusting your filters'
            : 'Customer sessions will appear here once created'}
        </Text>
        {(filters.search ||
          filters.status !== 'all' ||
          filters.tableNumber) && (
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={clearFilters}
          >
            <Text style={styles.emptyButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [ theme, filters, clearFilters]
  );

  if (!restaurantId) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: '#FFFFFF' }]}
      >
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: '#0F172A' }]}>
            No restaurant selected
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: '#FFFFFF' }]}
    >
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={'#FFFFFF'}
      />

      {/* Header */}
      <View
        style={[styles.navigationHeader, { backgroundColor: theme.surface }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color='#0F172A' />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: '#0F172A' }]}>
            Session History
          </Text>
          {sessionHistory && (
            <Text style={[styles.subtitle, { color: '#94A3B8' }]}>
              {sessionHistory.total} total sessions
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refetch}
          disabled={isFetching}
        >
          <Ionicons
            name="refresh"
            size={24}
            color={isFetching ? '#94A3B8' : '#0F172A'}
          />
        </TouchableOpacity>
      </View>

      {/* Session List */}
      <FlatList
        data={sessionHistory?.sessions || []}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.sessionId}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={!isLoading ? ListEmpty : null}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.3}
        ListFooterComponent={() =>
          isFetching && page > 1 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: '#94A3B8' }]}>
                Loading more sessions...
              </Text>
            </View>
          ) : null
        }
      />

      {/* Receipt QR Modal */}
      <Modal
        visible={showReceiptQr}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReceiptQr(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View
            style={[styles.qrModalContent, { backgroundColor: theme.surface }]}
          >
            <View
              style={[
                styles.qrModalHeader,
                { borderBottomColor: theme.border },
              ]}
            >
              <Text style={[styles.qrModalTitle, { color: '#0F172A' }]}>
                Receipt QR Code
              </Text>
              <TouchableOpacity
                style={styles.qrCloseButton}
                onPress={() => setShowReceiptQr(false)}
              >
                <Ionicons name="close" size={24} color={'#64748B'} />
              </TouchableOpacity>
            </View>

            {sessionReceiptQr ? (
              <View style={styles.qrContent}>
                <View
                  style={[
                    styles.qrImageContainer,
                    { backgroundColor: '#FFFFFF' },
                  ]}
                >
                  <Image
                    source={{ uri: sessionReceiptQr.qrCodeDataUrl }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.qrInfo}>
                  <Ionicons name="scan" size={24} color={theme.primary} />
                  <Text style={[styles.qrInstructions, { color: '#0F172A' }]}>
                    Customer can scan this code
                  </Text>
                  <Text
                    style={[styles.qrSubtext, { color: '#64748B' }]}
                  >
                    to download their receipt
                  </Text>
                </View>

                {selectedSessionForQr && (
                  <View
                    style={[
                      styles.qrSessionCard,
                      { backgroundColor: '#FFFFFF' },
                    ]}
                  >
                    <View style={styles.qrSessionRow}>
                      <Text
                        style={[styles.qrLabel, { color: '#94A3B8' }]}
                      >
                        Session
                      </Text>
                      <Text style={[styles.qrValue, { color: '#0F172A' }]}>
                        #
                        {selectedSessionForQr.sessionId.slice(-6).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.qrSessionRow}>
                      <Text
                        style={[styles.qrLabel, { color: '#94A3B8' }]}
                      >
                        Table
                      </Text>
                      <Text style={[styles.qrValue, { color: '#0F172A' }]}>
                        {selectedSessionForQr.tableNumber}
                      </Text>
                    </View>
                    <View style={styles.qrSessionRow}>
                      <Text
                        style={[styles.qrLabel, { color: '#94A3B8' }]}
                      >
                        Amount
                      </Text>
                      <Text style={[styles.qrValue, { color: theme.success }]}>
                        {formatCurrency(selectedSessionForQr.totalAmount)}
                      </Text>
                    </View>
                    <View style={styles.qrSessionRow}>
                      <Text
                        style={[styles.qrLabel, { color: '#94A3B8' }]}
                      >
                        Valid Until
                      </Text>
                      <Text
                        style={[styles.qrValue, { color: '#64748B' }]}
                      >
                        {new Date(
                          sessionReceiptQr.expiresAt
                        ).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.qrLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text
                  style={[styles.qrLoadingText, { color: '#64748B' }]}
                >
                  Generating QR code...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersPanel: {
    padding: 16,
    borderRadius: 12,
    gap: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 13,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dateSeparator: {
    fontSize: 13,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsSummary: {
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 13,
  },
  sessionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sessionHeader: {
    padding: 16,
    gap: 12,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionIdentifiers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionId: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tableBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sessionAmount: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  orderCount: {
    fontSize: 13,
  },
  sessionBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandedSection: {
    borderTopWidth: 1,
    padding: 16,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  ordersSection: {
    gap: 12,
  },
  ordersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ordersSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ordersList: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  orderInfo: {
    gap: 4,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderMeta: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  qrCloseButton: {
    padding: 4,
  },
  qrContent: {
    padding: 24,
    gap: 20,
    alignItems: 'center',
  },
  qrImageContainer: {
    padding: 20,
    borderRadius: 16,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  qrInfo: {
    alignItems: 'center',
    gap: 6,
  },
  qrInstructions: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  qrSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  qrSessionCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  qrSessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  qrValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  qrLoadingContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  qrLoadingText: {
    fontSize: 14,
  },
  // Bill Summary Styles
  billSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  billSummaryCard: {
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  billRowTotal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 4,
  },
  billRowGrandTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  billLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  taxTypeIndicator: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  taxTypeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Additional styles for enhanced UI
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  allItemsSection: {
    marginBottom: 16,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemCardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemCalculation: {
    fontSize: 13,
    marginTop: 4,
  },
  gstInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  hsnCode: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPriceInfo: {
    alignItems: 'flex-end',
  },
  itemCardTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  ordersBreakdownSection: {
    marginBottom: 16,
  },
  orderBreakdownCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderMainInfo: {
    flex: 1,
  },
  orderBreakdownNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderBreakdownDetails: {
    fontSize: 13,
    marginTop: 4,
  },
  orderBreakdownDate: {
    fontSize: 13,
    marginTop: 2,
  },
  orderBreakdownAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionTotalSection: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  sessionTotalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTotalLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  sessionTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  sessionTotalBreakdown: {
    gap: 4,
  },
  taxTypeSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
});
