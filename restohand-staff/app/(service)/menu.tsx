import { useGetPublicMenuQuery } from "@/store/api/menuApi";
import { useCreateOrderMutation, useUpdateOrderStatusMutation } from "@/store/api/ordersApi";
import {
  useGetRestaurantQuery,
  useListEnhancedTablesQuery,
} from "@/store/api/restaurantsApi";
import { useAppSelector } from "@/store/hooks";
import { selectActiveRestaurantId } from "@/store/slices/authSlice";
import { Ionicons } from "@expo/vector-icons";
import { skipToken } from "@reduxjs/toolkit/query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface CartEntry {
  id: string;
  name: string;
  pricing: {
    amount: number;
    currency?: string;
  };
  quantity: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function ServiceMenuScreen() {
  const { tableId, restaurant_slug } = useLocalSearchParams();
  const restaurantId = useAppSelector(selectActiveRestaurantId);

  // Get restaurant details
  const { data: restaurant } = useGetRestaurantQuery(
    restaurantId ?? skipToken,
    { skip: !restaurantId },
  );

  // Get public menu using the correct endpoint
  const { data, isLoading, isError, refetch: refetchMenu } = useGetPublicMenuQuery(
    { slug: restaurant?.slug ?? "" },
    { skip: !restaurant?.slug },
  );

  // Get table information
  const { data: enhancedTables, refetch: refetchTables } = useListEnhancedTablesQuery(
    restaurantId ? { restaurantId } : skipToken,
    { skip: !restaurantId },
  );

  const selectedTable = useMemo(() => {
    return enhancedTables?.find((table) => table.id === tableId) ?? null;
  }, [enhancedTables, tableId]);

  // RTK mutation for creating orders and updating status
  const [createOrder] = useCreateOrderMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  // Component state
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState<string | null>(null);

  // Check for existing active orders (multiple orders per table)
  const activeExistingOrders = useMemo(() => {
    const existingOrders = selectedTable?.activeOrders || [];
    return existingOrders.filter(order =>
      order.paymentStatus !== "paid" &&
      !["completed", "cancelled"].includes(order.status)
    );
  }, [selectedTable?.activeOrders]);

  // For backward compatibility, keep the first order
  const activeExistingOrder = useMemo(() => {
    return activeExistingOrders.length > 0 ? activeExistingOrders[0] : null;
  }, [activeExistingOrders]);

  // Calculate total bill for all active orders
  const totalBillAmount = useMemo(() => {
    return selectedTable?.totalBillAmount ||
           activeExistingOrders.reduce((total, order) => total + order.totalAmount, 0);
  }, [selectedTable?.totalBillAmount, activeExistingOrders]);

  // Process menu data
  const categories = data?.menu.categories ?? [];
  const uncategorised = data?.menu.uncategorised ?? [];

  // Create enhanced menu items with computed properties
  const allProducts = useMemo(() => {
    const grouped = categories.flatMap((c) =>
      c.items.map((i) => ({
        ...i,
        _categoryId: c.id,
        _categoryName: c.name,
        _isVegetarian:
          i.tags?.includes("vegetarian") || i.tags?.includes("veg"),
        _isSpicy: i.tags?.includes("spicy") || i.tags?.includes("hot"),
        _isPopular:
          i.tags?.includes("popular") || i.tags?.includes("bestseller"),
        _isQuick: i.tags?.includes("quick") || i.tags?.includes("fast"),
      })),
    );
    return [
      ...grouped,
      ...uncategorised.map((i) => ({
        ...i,
        _categoryId: "uncategorised",
        _categoryName: "Others",
        _isVegetarian:
          i.tags?.includes("vegetarian") || i.tags?.includes("veg"),
        _isSpicy: i.tags?.includes("spicy") || i.tags?.includes("hot"),
        _isPopular:
          i.tags?.includes("popular") || i.tags?.includes("bestseller"),
        _isQuick: i.tags?.includes("quick") || i.tags?.includes("fast"),
      })),
    ];
  }, [categories, uncategorised]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item._categoryName.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [allProducts, searchQuery]);

  // Get items for current category
  const displayItems = useMemo(() => {
    if (activeCategory === "all") {
      return filteredProducts;
    }
    return filteredProducts.filter((p) => p._categoryId === activeCategory);
  }, [filteredProducts, activeCategory]);

  // Get available categories with items
  const availableCategories = useMemo(() => {
    const categoriesWithItems = categories.filter((c) =>
      filteredProducts.some((item) => item._categoryId === c.id),
    );

    const hasUncategorised = filteredProducts.some(
      (item) => item._categoryId === "uncategorised",
    );

    return [
      { id: "all", name: "All", icon: "🍽️" },
      ...categoriesWithItems.map((c) => ({
        ...c,
        icon: c.icon || "🍴",
      })),
      ...(hasUncategorised
        ? [{ id: "uncategorised", name: "Others", icon: "✨" }]
        : []),
    ];
  }, [categories, filteredProducts]);

  // Cart calculations
  const totalItems = Object.values(cart).reduce(
    (sum, e) => sum + e.quantity,
    0,
  );
  const totalAmount = Object.values(cart).reduce(
    (sum, e) => sum + e.quantity * e.pricing.amount,
    0,
  );

  // Cart management functions
  const handleAdd = (id: string, name: string, pricing: any) => {
    setCart((prev) => ({
      ...prev,
      [id]: { id, name, pricing, quantity: (prev[id]?.quantity ?? 0) + 1 },
    }));
  };

  const handleRemove = (id: string) => {
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      if (current.quantity === 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...current, quantity: current.quantity - 1 } };
    });
  };

  // Place order function
  const handlePlaceOrder = async () => {
    if (!restaurant) return;

    if (Object.keys(cart).length === 0) {
      Alert.alert("Cart is empty", "Add items to place an order");
      return;
    }

    const payload = {
      restaurantId: restaurant.id,
      tableId: selectedTable?.id,
      paymentMethod: "cash" as const,
      items: Object.values(cart).map((entry) => ({
        menuItemId: entry.id,
        name: entry.name,
        quantity: entry.quantity,
        pricing: {
          unitAmount: entry.pricing.amount,
          currency: entry.pricing.currency ?? "INR",
        },
      })),
    };

    setIsPlacingOrder(true);
    try {
      const order = await createOrder(payload).unwrap();
      setCart({});

      // Refetch table data to show the new order immediately
      await refetchTables();

      Alert.alert(
        "Order placed! 🎉",
        `Order #${order.orderNumber} sent to kitchen`,
        [
          {
            text: "Go to Payment",
            onPress: () => {
              router.push({
                pathname: "/(service)/payment",
                params: {
                  orderId: order.id,
                  tableId: selectedTable?.id,
                  orderData: JSON.stringify(order),
                },
              });
            },
          },
          {
            text: "Back to Tables",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert("Failed to place order", err?.message || "Unexpected error");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentAction = () => {
    if (activeExistingOrders.length > 0) {
      // Pass all active orders for combined payment
      router.push({
        pathname: "/(service)/payment",
        params: {
          orderId: activeExistingOrders[0].id, // Primary order ID for compatibility
          tableId: selectedTable?.id,
          orderData: JSON.stringify(activeExistingOrders[0]), // Primary order data for compatibility
          allOrdersData: JSON.stringify(activeExistingOrders), // All orders for combined payment
          totalBillAmount: totalBillAmount.toString(), // Total amount to pay
        },
      });
    }
  };

  const handleUpdateStatusAction = (order: any) => {
    setSelectedOrderForStatus(order);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (status: string, progress?: number) => {
    if (!restaurant || !selectedOrderForStatus) return;

    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus({
        restaurantId: restaurant.id,
        orderId: selectedOrderForStatus.id,
        status: status as any,
        progress,
      }).unwrap();

      setShowStatusModal(false);
      setSelectedOrderForStatus(null);

      // Refetch table data to show updated status
      await refetchTables();

      Alert.alert("Status Updated!", `Order #${selectedOrderForStatus.orderNumber} is now ${status.replace('_', ' ')}`);
    } catch (error) {
      Alert.alert("Error", "Failed to update order status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async (order: any) => {
    if (!restaurant) return;

    Alert.alert(
      "Cancel Order",
      `Are you sure you want to cancel Order #${order.orderNumber}?`,
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setIsCancellingOrder(order.id);
            try {
              await updateOrderStatus({
                restaurantId: restaurant.id,
                orderId: order.id,
                status: 'cancelled' as any,
                statusNote: 'Cancelled by waiter'
              }).unwrap();

              // Refetch table data to show updated status
              await refetchTables();

              Alert.alert("Order Cancelled", `Order #${order.orderNumber} has been cancelled`);
            } catch (error) {
              Alert.alert("Error", "Failed to cancel order");
            } finally {
              setIsCancellingOrder(null);
            }
          }
        }
      ]
    );
  };

  const getStatusUpdateOptions = (currentStatus: string) => {
    const statusOptions = [
      {
        status: 'accepted',
        label: 'Accept Order',
        icon: 'checkmark-circle',
        color: '#3B82F6',
        progress: 20,
        description: 'Mark order as accepted'
      },
      {
        status: 'in_progress',
        label: 'Start Cooking',
        icon: 'flame',
        color: '#F59E0B',
        progress: 40,
        description: 'Begin preparation'
      },
      {
        status: 'in_progress',
        label: 'Almost Ready',
        icon: 'hourglass',
        color: '#10B981',
        progress: 80,
        description: 'Order is almost done'
      },
      {
        status: 'ready',
        label: 'Order Ready',
        icon: 'restaurant',
        color: '#059669',
        progress: 100,
        description: 'Ready for pickup/serving'
      }
    ];

    // Filter based on current status
    switch (currentStatus) {
      case 'pending':
        return statusOptions.filter(opt =>
          (opt.status === 'accepted') ||
          (opt.status === 'in_progress' && opt.progress === 40)
        );
      case 'accepted':
        return statusOptions.filter(opt =>
          (opt.status === 'in_progress' && opt.progress === 40)
        );
      case 'in_progress':
        return statusOptions.filter(opt =>
          (opt.status === 'in_progress' && opt.progress === 80) ||
          (opt.status === 'ready')
        );
      default:
        return [];
    }
  };

  // Refresh function to update menu and table data
  const handleRefresh = async () => {
    await Promise.all([refetchMenu(), refetchTables()]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Loading Menu...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Menu Not Available</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>
            Unable to load the menu. Please try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const tableNumber =
    selectedTable?.displayName ||
    selectedTable?.tableNumber ||
    `Table ${tableId}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{tableNumber}</Text>
          <View style={styles.tableInfo}>
            {selectedTable?.capacity && (
              <View style={styles.tableCapacityInfo}>
                <Ionicons name="people" size={12} color="#6b7280" />
                <Text style={styles.tableCapacityText}>
                  {selectedTable.capacity} seats
                </Text>
              </View>
            )}
            {selectedTable?.zone && (
              <Text style={styles.tableZoneText}>• {selectedTable.zone}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh" size={20} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons
              name={showSearch ? "close" : "search"}
              size={20}
              color="#1f2937"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Existing Orders Alert - Show multiple orders */}
      {activeExistingOrders.length > 0 && (
        <View style={styles.existingOrderAlert}>
          <View style={styles.existingOrderContent}>
            <View style={styles.orderHeaderContainer}>
              <Text style={styles.existingOrderTitle}>
                {activeExistingOrders.length === 1
                  ? `Active Order #${activeExistingOrders[0].orderNumber}`
                  : `${activeExistingOrders.length} Active Orders`
                }
              </Text>
              <Text style={styles.totalBillAmount}>
                Total: ₹{totalBillAmount.toFixed(0)}
              </Text>
            </View>

            {/* Show all orders */}
            <View style={styles.ordersContainer}>
              {activeExistingOrders.map((order, index) => (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <View style={styles.existingOrderMeta}>
                      <Ionicons name="time" size={10} color="#1d4ed8" />
                      <Text style={styles.existingOrderStatus}>
                        {order.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderActions}>
                    <Text style={styles.orderAmount}>
                      ₹{order.totalAmount.toFixed(0)}
                    </Text>
                    <View style={styles.orderButtonsContainer}>
                      {/* Cancel button - only show for pending/accepted orders */}
                      {['pending', 'accepted'].includes(order.status) && (
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => handleCancelOrder(order)}
                          disabled={isCancellingOrder === order.id}
                        >
                          {isCancellingOrder === order.id ? (
                            <ActivityIndicator size={12} color="#ffffff" />
                          ) : (
                            <Ionicons name="close" size={12} color="#ffffff" />
                          )}
                        </TouchableOpacity>
                      )}
                      {/* Status update button - only show for non-ready orders */}
                      {!['ready', 'completed', 'cancelled'].includes(order.status) && (
                        <TouchableOpacity
                          style={styles.individualStatusButton}
                          onPress={() => handleUpdateStatusAction(order)}
                        >
                          <Ionicons name="refresh" size={12} color="#ffffff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Show payment button if any order is ready */}
            {activeExistingOrders.some(order => order.status === "ready") ? (
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={handlePaymentAction}
              >
                <Ionicons name="card" size={16} color="#ffffff" />
                <Text style={styles.paymentButtonText}>
                  Pay Total Bill (₹{totalBillAmount.toFixed(0)})
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={16}
              color="#6b7280"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close" size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryContent}
        >
          {availableCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                activeCategory === category.id && styles.activeCategoryPill,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {displayItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptyText}>Try adjusting your search</Text>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
            >
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsGrid}>
            {displayItems.map((item, index) => {
              const entry = cart[item.id];
              return (
                <View key={item.id} style={styles.menuItemCard}>
                  {/* Item Image */}
                  <View style={styles.itemImageContainer}>
                    {item.imageUrls?.[0] ? (
                      <Image
                        source={{ uri: item.imageUrls[0] }}
                        style={styles.itemImage}
                        onError={() => {
                          /* Handle image error */
                        }}
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderIcon}>🍽️</Text>
                      </View>
                    )}

                    {/* Veg/Non-veg indicator */}
                    <View style={styles.vegIndicatorContainer}>
                      <View
                        style={[
                          styles.vegIndicator,
                          item._isVegetarian
                            ? styles.vegIndicatorVeg
                            : styles.vegIndicatorNonVeg,
                        ]}
                      >
                        <View
                          style={[
                            styles.vegDot,
                            item._isVegetarian
                              ? styles.vegDotVeg
                              : styles.vegDotNonVeg,
                          ]}
                        />
                      </View>
                    </View>

                    {/* Popular badge */}
                    {item._isPopular && (
                      <View style={styles.popularBadge}>
                        <Ionicons name="star" size={12} color="#ffffff" />
                      </View>
                    )}

                    {/* Tags */}
                    {(item._isSpicy || item._isQuick) && (
                      <View style={styles.tagsContainer}>
                        {item._isSpicy && (
                          <Text style={styles.tagIcon}>🌶️</Text>
                        )}
                        {item._isQuick && (
                          <Text style={styles.tagIcon}>⚡</Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Item Details */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.pricing.amount)}
                    </Text>

                    {/* Add/Remove Controls */}
                    {entry ? (
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleRemove(item.id)}
                        >
                          <Ionicons name="remove" size={14} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>
                          {entry.quantity}
                        </Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            handleAdd(item.id, item.name, item.pricing)
                          }
                        >
                          <Ionicons name="add" size={14} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() =>
                          handleAdd(item.id, item.name, item.pricing)
                        }
                      >
                        <Text style={styles.addButtonText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <View style={styles.floatingCart}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={handlePlaceOrder}
            disabled={isPlacingOrder}
          >
            <View style={styles.cartButtonContent}>
              <View style={styles.cartInfo}>
                <View style={styles.cartIconContainer}>
                  <Ionicons name="bag" size={24} color="#ffffff" />
                </View>
                <View style={styles.cartDetails}>
                  <Text style={styles.cartItems}>{totalItems} items</Text>
                  <Text style={styles.cartTotal}>
                    {formatCurrency(totalAmount)}
                  </Text>
                </View>
              </View>
              <View style={styles.placeOrderContainer}>
                <Text style={styles.placeOrderText}>
                  {isPlacingOrder ? "Placing..." : "Place Order"}
                </Text>
                {!isPlacingOrder && (
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Update Status - #{selectedOrderForStatus?.orderNumber}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStatusModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.currentStatusText}>
              Current Status: <Text style={styles.currentStatusValue}>
                {selectedOrderForStatus?.status?.replace('_', ' ')}
              </Text>
            </Text>

            <View style={styles.statusOptionsContainer}>
              {selectedOrderForStatus &&
                getStatusUpdateOptions(selectedOrderForStatus.status).map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.statusOptionButton, { borderColor: option.color }]}
                  onPress={() => handleStatusUpdate(option.status, option.progress)}
                  disabled={isUpdatingStatus}
                >
                  <View style={[styles.statusOptionIcon, { backgroundColor: option.color }]}>
                    <Ionicons name={option.icon as any} size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.statusOptionContent}>
                    <Text style={styles.statusOptionLabel}>{option.label}</Text>
                    <Text style={styles.statusOptionDescription}>{option.description}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={option.color} />
                </TouchableOpacity>
              ))}
            </View>

            {isUpdatingStatus && (
              <View style={styles.updatingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.updatingText}>Updating status...</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  tableInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  tableCapacityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tableCapacityText: {
    fontSize: 12,
    color: "#6b7280",
  },
  tableZoneText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  searchButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  existingOrderAlert: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
    borderWidth: 1,
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  existingOrderContent: {
    flexDirection: "column",
    gap: 12,
  },
  orderHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  existingOrderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  totalBillAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  ordersContainer: {
    gap: 8,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
  },
  orderActions: {
    alignItems: "flex-end",
    gap: 6,
  },
  orderAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  orderButtonsContainer: {
    flexDirection: "row",
    gap: 4,
  },
  cancelButton: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  individualStatusButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  existingOrderMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  existingOrderStatus: {
    fontSize: 12,
    color: "#1d4ed8",
    textTransform: "capitalize",
  },
  existingOrderAmount: {
    fontSize: 12,
    color: "#1d4ed8",
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  paymentButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  clearSearchButton: {
    padding: 4,
  },
  categoryContainer: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  categoryScrollView: {
    paddingVertical: 12,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  activeCategoryPill: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  activeCategoryText: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: "#374151",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 12,
  },
  menuItemCard: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: "#f3f4f6",
  },
  itemImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.3,
  },
  vegIndicatorContainer: {
    position: "absolute",
    top: 6,
    left: 6,
  },
  vegIndicator: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 2,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  vegIndicatorVeg: {
    borderColor: "#16a34a",
  },
  vegIndicatorNonVeg: {
    borderColor: "#dc2626",
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vegDotVeg: {
    backgroundColor: "#16a34a",
  },
  vegDotNonVeg: {
    backgroundColor: "#dc2626",
  },
  popularBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#eab308",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tagsContainer: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    gap: 4,
  },
  tagIcon: {
    fontSize: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  itemDetails: {
    paddingHorizontal: 4,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 6,
    lineHeight: 16,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: "space-between",
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
    minWidth: 20,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    paddingVertical: 6,
    alignItems: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  floatingCart: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
  },
  cartButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cartButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cartIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    padding: 8,
  },
  cartDetails: {
    alignItems: "flex-start",
  },
  cartItems: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  cartTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  placeOrderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  placeOrderText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  updateStatusButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6B7280",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  updateStatusButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  currentStatusText: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
  },
  currentStatusValue: {
    fontWeight: "600",
    color: "#1f2937",
    textTransform: "capitalize",
  },
  statusOptionsContainer: {
    gap: 12,
  },
  statusOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statusOptionContent: {
    flex: 1,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  statusOptionDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  updatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  updatingText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "500",
  },
});

