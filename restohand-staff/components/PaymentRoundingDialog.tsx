import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaymentRoundingDialogProps {
  visible: boolean;
  exactAmount: number;
  onClose: () => void;
  onConfirm: (finalAmount: number, roundOffAmount: number) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export function PaymentRoundingDialog({
  visible,
  exactAmount,
  onClose,
  onConfirm,
}: PaymentRoundingDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  // Calculate rounding options
  const roundedDown = Math.floor(exactAmount);
  const roundedUp = Math.ceil(exactAmount);
  const roundOffDown = roundedDown - exactAmount;
  const roundOffUp = roundedUp - exactAmount;
  const roundOffExact = 0;

  const options = [
    {
      id: 'down',
      amount: roundedDown,
      roundOff: roundOffDown,
      label: `₹${roundedDown}`,
      sublabel: `Round down (${formatCurrency(roundOffDown)} discount)`,
      icon: 'arrow-down-circle',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      disabled: roundOffDown === 0, // Don't show if no rounding needed
    },
    {
      id: 'exact',
      amount: exactAmount,
      roundOff: roundOffExact,
      label: formatCurrency(exactAmount),
      sublabel: 'Exact amount (no rounding)',
      icon: 'checkmark-circle',
      color: '#2563eb',
      bgColor: '#eff6ff',
      disabled: false,
    },
    {
      id: 'up',
      amount: roundedUp,
      roundOff: roundOffUp,
      label: `₹${roundedUp}`,
      sublabel: `Round up (+${formatCurrency(roundOffUp)})`,
      icon: 'arrow-up-circle',
      color: '#dc2626',
      bgColor: '#fef2f2',
      disabled: roundOffUp === 0, // Don't show if no rounding needed
    },
  ].filter(option => !option.disabled);

  const handleConfirm = () => {
    if (selectedAmount !== null) {
      const option = options.find(opt => opt.amount === selectedAmount);
      if (option) {
        onConfirm(option.amount, option.roundOff);
      }
    }
  };

  const resetAndClose = () => {
    setSelectedAmount(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Payment Amount</Text>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Order Total */}
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Order Total:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(exactAmount)}</Text>
          </View>

          {/* Rounding Options */}
          <View style={styles.optionsSection}>
            <Text style={styles.optionsTitle}>Choose Collection Amount:</Text>

            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  selectedAmount === option.amount && styles.selectedOption,
                  { backgroundColor: option.bgColor },
                ]}
                onPress={() => setSelectedAmount(option.amount)}
              >
                <View style={styles.optionContent}>
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={option.color}
                  />
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: option.color },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionSublabel}>{option.sublabel}</Text>
                  </View>
                  {selectedAmount === option.amount && (
                    <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetAndClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedAmount === null && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={selectedAmount === null}
            >
              <Ionicons name="cash" size={20} color="#ffffff" />
              <Text style={styles.confirmButtonText}>
                Confirm Payment
              </Text>
            </TouchableOpacity>
          </View>

          {/* Helper Text */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              💡 For cash payments, choose the amount that's convenient to collect
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: Math.min(width - 40, 400),
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  totalSection: {
    backgroundColor: '#f9fafb',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  optionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
    overflow: 'hidden',
  },
  selectedOption: {
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  optionSublabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  helpSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  helpText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});