import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

// Define styles for the PDF to match the thermal receipt look
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 1.4,
  },
  // Receipt-style sections with dashed borders
  section: {
    borderBottom: '1pt dashed #999999',
    paddingBottom: 12,
    marginBottom: 12,
  },
  sectionLast: {
    borderBottom: 'none',
    paddingBottom: 0,
    marginBottom: 16,
  },
  // Header section
  header: {
    textAlign: 'center',
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  restaurantInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  // Bill info section
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 11,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Items section
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemRow: {
    marginBottom: 8,
  },
  itemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 11,
  },
  itemQty: {
    width: 30,
    textAlign: 'center',
    fontSize: 11,
  },
  itemAmount: {
    width: 60,
    textAlign: 'right',
    fontSize: 11,
  },
  itemPriceRow: {
    fontSize: 9,
    color: '#666666',
    marginLeft: 8,
  },
  // Totals section
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 11,
  },
  totalValue: {
    fontSize: 11,
    textAlign: 'right',
  },
  discountValue: {
    fontSize: 11,
    textAlign: 'right',
    color: '#008000',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taxNote: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
  },
  // Payment section
  paymentStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  paymentStatusValue: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#008000', // Green for paid
  },
  // Footer section
  footer: {
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    marginBottom: 4,
  },
  footerBorder: {
    borderTop: '1pt dashed #999999',
    paddingTop: 12,
    marginTop: 12,
  },
});

interface ReceiptPDFProps {
  order?: any;
  orders?: any[];
  isCombinedReceipt?: boolean;
  restaurantInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
  };
}

const ReceiptPDFDocument: React.FC<ReceiptPDFProps> = ({
  order,
  orders,
  isCombinedReceipt,
  restaurantInfo,
}) => {
  const data = isCombinedReceipt ? orders?.[0] : order;

  if (!data) return null;

  // Helper function to format currency
  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  // Calculate totals
  const subtotal = data?.subTotalAmount ?? data?.subtotal ?? data?.totalAmount ?? 0;
  const cgst = data?.cgstAmount ?? 0;
  const sgst = data?.sgstAmount ?? 0;
  const igst = data?.igstAmount ?? 0;
  const discount = data?.discountAmount ?? 0;
  const roundOff = data?.roundOffAmount ?? 0;
  const totalAmount = data?.totalAmount ?? 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={[styles.section, styles.header]}>
          <Text style={styles.restaurantName}>
            {restaurantInfo?.name || 'Restaurant'}
          </Text>
          {restaurantInfo?.address && (
            <Text style={styles.restaurantInfo}>{restaurantInfo.address}</Text>
          )}
          <View style={styles.headerRow}>
            {restaurantInfo?.phone && (
              <Text style={styles.restaurantInfo}>Ph: {restaurantInfo.phone}</Text>
            )}
            {restaurantInfo?.email && (
              <Text style={styles.restaurantInfo}>{restaurantInfo.email}</Text>
            )}
          </View>
          {restaurantInfo?.gstNumber && (
            <Text style={styles.restaurantInfo}>GST: {restaurantInfo.gstNumber}</Text>
          )}
        </View>

        {/* Bill Info */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bill No:</Text>
            <Text style={styles.infoValue}>#{data.receiptNumber || data.orderNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>
              {new Date(data.createdAt || data.issuedAt || Date.now()).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time:</Text>
            <Text style={styles.infoValue}>
              {new Date(data.createdAt || data.issuedAt || Date.now()).toLocaleTimeString('en-IN')}
            </Text>
          </View>
          {data.tableNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Table:</Text>
              <Text style={styles.infoValue}>{data.tableNumber}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mode:</Text>
            <Text style={styles.infoValue}>{(data.paymentMethod || 'CASH').toUpperCase()}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.itemsHeader}>
            <Text>Item</Text>
            <Text>Qty</Text>
            <Text>Amount</Text>
          </View>

          {data.items?.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemMainRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>{item.quantity}</Text>
                <Text style={styles.itemAmount}>
                  {formatCurrency((item.pricing?.unitAmount || item.unitPrice || 0) * (item.quantity || 0))}
                </Text>
              </View>
              <Text style={styles.itemPriceRow}>
                @ {formatCurrency(item.pricing?.unitAmount || item.unitPrice || 0)} each
              </Text>
            </View>
          ))}
        </View>

        {/* Bill Summary */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>

          {cgst > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST (2.5%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(cgst)}</Text>
            </View>
          )}

          {sgst > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST (2.5%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(sgst)}</Text>
            </View>
          )}

          {igst > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IGST (5%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(igst)}</Text>
            </View>
          )}

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.discountValue}>-{formatCurrency(discount)}</Text>
            </View>
          )}

          {Math.abs(roundOff) > 0.004 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Round Off:</Text>
              <Text style={styles.totalValue}>{formatCurrency(roundOff)}</Text>
            </View>
          )}
        </View>

        {/* Total */}
        <View style={styles.section}>
          <View style={styles.grandTotal}>
            <Text>TOTAL:</Text>
            <Text>{formatCurrency(totalAmount)}</Text>
          </View>
          <Text style={styles.taxNote}>
            {data.taxType === 'inter-state' ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'} • Inclusive of all taxes
          </Text>
        </View>

        {/* Payment Status */}
        <View style={styles.section}>
          <View style={styles.paymentStatus}>
            <Text style={styles.totalLabel}>Payment Status:</Text>
            <Text style={styles.paymentStatusValue}>
              {(data.paymentStatus || 'PAID').toUpperCase()}
            </Text>
          </View>
          {data.paidAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paid At:</Text>
              <Text style={styles.infoValue}>
                {new Date(data.paidAt).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.sectionLast}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Thank you for dining with us!</Text>
            <Text style={styles.footerText}>Visit us again soon</Text>
            <View style={styles.footerBorder}>
              <Text style={styles.footerText}>Powered by Restohand</Text>
              <Text style={styles.footerText}>www.restohand.in</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Export function to generate PDF
export const generateReceiptPDF = async (props: ReceiptPDFProps): Promise<Blob> => {
  const doc = <ReceiptPDFDocument {...props} />;
  return await pdf(doc).toBlob();
};

export default ReceiptPDFDocument;