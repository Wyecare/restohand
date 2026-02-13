import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface ModifierOption {
  id: string;
  name: string;
  description?: string;
  priceAdjustment: number;
  isAvailable: boolean;
}

interface MenuModifier {
  id: string;
  name: string;
  description?: string;
  selectionType: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

interface OptionSelection {
  optionId: string;
  optionName: string;
  priceAdjustment: number;
  quantity: number;
}

interface ModifierSelection {
  modifierId: string;
  modifierName: string;
  selectedOptions: OptionSelection[];
}

interface ModifierSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  menuItemId: string;
  menuItemName: string;
  basePrice: number;
  modifiers: MenuModifier[];
  onConfirm: (
    selections: ModifierSelection[],
    totalPrice: number,
    notes?: string
  ) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 3,
  }).format(amount);

export const ModifierSelectionModal: React.FC<ModifierSelectionModalProps> = ({
  visible,
  onClose,
  menuItemId,
  menuItemName,
  basePrice,
  modifiers,
  onConfirm,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [selections, setSelections] = useState<
    Record<string, OptionSelection[]>
  >({});
  const [notes, setNotes] = useState<string>('');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelections({});
      setNotes('');
    }
  }, [visible]);

  const handleOptionSelect = (
    modifierId: string,
    option: ModifierOption,
    modifier: MenuModifier
  ) => {
    setSelections((prev) => {
      const currentSelections = prev[modifierId] || [];

      if (modifier.selectionType === 'single') {
        return {
          ...prev,
          [modifierId]: [
            {
              optionId: option.id,
              optionName: option.name,
              priceAdjustment: option.priceAdjustment,
              quantity: 1,
            },
          ],
        };
      } else {
        const existingIndex = currentSelections.findIndex(
          (sel) => sel.optionId === option.id
        );

        if (existingIndex >= 0) {
          // Remove option if already selected
          return {
            ...prev,
            [modifierId]: currentSelections.filter(
              (_, index) => index !== existingIndex
            ),
          };
        } else {
          // Add option if within max selections
          if (currentSelections.length < modifier.maxSelections) {
            return {
              ...prev,
              [modifierId]: [
                ...currentSelections,
                {
                  optionId: option.id,
                  optionName: option.name,
                  priceAdjustment: option.priceAdjustment,
                  quantity: 1,
                },
              ],
            };
          }
        }
      }
      return prev;
    });
  };

  const handleQuantityChange = (
    modifierId: string,
    optionId: string,
    newQuantity: number
  ) => {
    if (newQuantity <= 0) {
      setSelections((prev) => ({
        ...prev,
        [modifierId]:
          prev[modifierId]?.filter((sel) => sel.optionId !== optionId) || [],
      }));
    } else {
      setSelections((prev) => ({
        ...prev,
        [modifierId]:
          prev[modifierId]?.map((sel) =>
            sel.optionId === optionId ? { ...sel, quantity: newQuantity } : sel
          ) || [],
      }));
    }
  };

  const isOptionSelected = (modifierId: string, optionId: string) => {
    return (
      selections[modifierId]?.some((sel) => sel.optionId === optionId) || false
    );
  };

  const getOptionQuantity = (modifierId: string, optionId: string) => {
    const option = selections[modifierId]?.find(
      (sel) => sel.optionId === optionId
    );
    return option?.quantity || 0;
  };

  const validateSelections = () => {
    for (const modifier of modifiers) {
      const selectedOptions = selections[modifier.id] || [];

      if (
        modifier.isRequired &&
        selectedOptions.length < modifier.minSelections
      ) {
        return false;
      }

      if (selectedOptions.length > modifier.maxSelections) {
        return false;
      }
    }
    return true;
  };

  const calculateTotalPrice = () => {
    let total = basePrice;

    Object.values(selections).forEach((modifierSelections) => {
      modifierSelections.forEach((selection) => {
        total += selection.priceAdjustment * selection.quantity;
      });
    });

    return total;
  };

  const handleConfirm = () => {
    if (!validateSelections()) {
      return;
    }

    const finalSelections: ModifierSelection[] = Object.entries(selections)
      .filter(([_, options]) => options.length > 0)
      .map(([modifierId, options]) => {
        const modifier = modifiers.find((m) => m.id === modifierId)!;
        return {
          modifierId,
          modifierName: modifier.name,
          selectedOptions: options,
        };
      });

    const totalPrice = calculateTotalPrice();
    onConfirm(finalSelections, totalPrice, notes.trim() || undefined);
    onClose();
  };

  const handleCancel = () => {
    setSelections({});
    setNotes('');
    onClose();
  };

  const totalPrice = calculateTotalPrice();
  const isValid = validateSelections();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      minHeight: '50%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
      marginRight: 16,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    modifierSection: {
      marginBottom: 24,
    },
    modifierHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    modifierTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    modifierDescription: {
      fontSize: 12,
      color: theme.icon,
      marginTop: 2,
    },
    modifierInfo: {
      alignItems: 'flex-end',
    },
    requiredBadge: {
      backgroundColor: '#ef4444',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    requiredText: {
      color: 'white',
      fontSize: 10,
      fontWeight: '600',
    },
    selectionInfo: {
      fontSize: 10,
      color: theme.icon,
    },
    optionsList: {
      gap: 8,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
    },
    optionSelected: {
      backgroundColor: isDark ? '#1e40af20' : '#3b82f620',
      borderColor: theme.brand,
    },
    optionUnselected: {
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderColor: isDark ? '#4b5563' : '#e5e7eb',
    },
    optionRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionRadioSelected: {
      borderColor: theme.brand,
      backgroundColor: theme.brand,
    },
    optionRadioUnselected: {
      borderColor: isDark ? '#6b7280' : '#9ca3af',
      backgroundColor: 'transparent',
    },
    optionInfo: {
      flex: 1,
    },
    optionName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    optionDescText: {
      fontSize: 12,
      color: theme.icon,
      marginTop: 2,
    },
    optionPrice: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
      marginRight: 12,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
    },
    quantityButton: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quantityText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      minWidth: 20,
      textAlign: 'center',
    },
    notesSection: {
      marginTop: 8,
    },
    notesLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.background,
      textAlignVertical: 'top',
    },
    notesCounter: {
      fontSize: 10,
      color: theme.icon,
      textAlign: 'right',
      marginTop: 4,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#e5e7eb',
      backgroundColor: theme.background,
    },
    priceBreakdown: {
      marginBottom: 16,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    priceLabel: {
      fontSize: 12,
      color: theme.icon,
    },
    priceValue: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.text,
    },
    addOnPrice: {
      color: theme.brand,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#e5e7eb',
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: theme.brand,
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmButtonDisabled: {
      opacity: 0.5,
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={handleCancel} />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                Customize {menuItemName}
              </Text>
              <Text style={[styles.modifierDescription, { marginTop: 0 }]}>
                Select your preferences
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
              <Ionicons name="close" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.scrollContent}>
              {modifiers.map((modifier) => (
                <View key={modifier.id} style={styles.modifierSection}>
                  {/* Modifier Header */}
                  <View style={styles.modifierHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modifierTitle}>{modifier.name}</Text>
                      {modifier.description && (
                        <Text style={styles.modifierDescription}>
                          {modifier.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.modifierInfo}>
                      {modifier.isRequired && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredText}>Required</Text>
                        </View>
                      )}
                      <Text style={styles.selectionInfo}>
                        {modifier.selectionType === 'single'
                          ? 'Choose 1'
                          : `Choose ${modifier.minSelections}-${modifier.maxSelections}`}
                      </Text>
                    </View>
                  </View>

                  {/* Options List */}
                  <View style={styles.optionsList}>
                    {modifier.options
                      .filter((option) => option.isAvailable)
                      .map((option) => {
                        const isSelected = isOptionSelected(
                          modifier.id,
                          option.id
                        );
                        const quantity = getOptionQuantity(
                          modifier.id,
                          option.id
                        );

                        return (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.optionItem,
                              isSelected
                                ? styles.optionSelected
                                : styles.optionUnselected,
                            ]}
                            onPress={() =>
                              handleOptionSelect(modifier.id, option, modifier)
                            }
                          >
                            {/* Radio/Checkbox */}
                            <View
                              style={[
                                styles.optionRadio,
                                isSelected
                                  ? styles.optionRadioSelected
                                  : styles.optionRadioUnselected,
                              ]}
                            >
                              {isSelected && (
                                <Ionicons
                                  name="checkmark"
                                  size={12}
                                  color="white"
                                />
                              )}
                            </View>

                            {/* Option Details */}
                            <View style={styles.optionInfo}>
                              <Text style={styles.optionName}>
                                {option.name}
                              </Text>
                              {option.description && (
                                <Text style={styles.optionDescText}>
                                  {option.description}
                                </Text>
                              )}
                            </View>

                            {/* Price */}
                            <Text style={styles.optionPrice}>
                              {option.priceAdjustment === 0
                                ? 'Free'
                                : `+${formatCurrency(option.priceAdjustment)}`}
                            </Text>

                            {/* Quantity Controls for Multiple Selection */}
                            {isSelected &&
                              modifier.selectionType === 'multiple' && (
                                <View style={styles.quantityControls}>
                                  <TouchableOpacity
                                    style={styles.quantityButton}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleQuantityChange(
                                        modifier.id,
                                        option.id,
                                        quantity - 1
                                      );
                                    }}
                                  >
                                    <Ionicons
                                      name="remove"
                                      size={14}
                                      color={theme.text}
                                    />
                                  </TouchableOpacity>
                                  <Text style={styles.quantityText}>
                                    {quantity}
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.quantityButton}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleQuantityChange(
                                        modifier.id,
                                        option.id,
                                        quantity + 1
                                      );
                                    }}
                                  >
                                    <Ionicons
                                      name="add"
                                      size={14}
                                      color={theme.text}
                                    />
                                  </TouchableOpacity>
                                </View>
                              )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              ))}

              {/* Special Notes */}
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Special Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any special requests..."
                  placeholderTextColor={theme.icon}
                  multiline
                  maxLength={200}
                  numberOfLines={3}
                />
                <Text style={styles.notesCounter}>
                  {notes.length}/200 characters
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Price Breakdown */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Base price</Text>
                <Text style={styles.priceValue}>
                  {formatCurrency(basePrice)}
                </Text>
              </View>
              {totalPrice > basePrice && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Add-ons</Text>
                  <Text style={[styles.priceValue, styles.addOnPrice]}>
                    +{formatCurrency(totalPrice - basePrice)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(totalPrice)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !isValid && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!isValid}
              >
                <Text style={styles.confirmButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
