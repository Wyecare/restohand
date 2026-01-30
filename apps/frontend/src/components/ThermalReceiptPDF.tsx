import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

interface ThermalReceiptProps {
  restaurant: {
    name: string;
    address?: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
    };
    phone?: string;
    email?: string;
    gstin?: string;
  };
  bill: {
    tableNumber: string;
    orders: Array<{
      orderNumber: string;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }>;
      orderTotal: number;
    }>;
    subtotal: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    roundOffAmount: number;
    totalAmount: number;
    billGeneratedAt: string;
  };
}

// Thermal Receipt Styles (58mm width - small POS printer)
const styles = StyleSheet.create({
  page: {
    width: '58mm',
    padding: '1.5mm',
    fontFamily: 'Courier',
    fontSize: 7,
    lineHeight: 1.1,
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1pt dashed black',
  },
  restaurantName: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  restaurantDetails: {
    fontSize: 6,
    lineHeight: 1.0,
  },
  billInfo: {
    textAlign: 'center',
    marginBottom: 4,
    fontSize: 6,
  },
  sectionDivider: {
    borderBottom: '1pt dashed black',
    marginVertical: 4,
  },
  items: {
    marginBottom: 6,
  },
  item: {
    marginBottom: 3,
  },
  itemName: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 7,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6,
    marginTop: 1,
  },
  qtyRate: {
    color: '#666',
  },
  amount: {
    fontWeight: 'bold',
  },
  orderSeparator: {
    textAlign: 'center',
    marginVertical: 6,
    fontSize: 6,
    color: '#666',
    borderTop: '1pt dotted #666',
    borderBottom: '1pt dotted #666',
    paddingVertical: 2,
  },
  totals: {
    borderTop: '1pt dashed black',
    paddingTop: 4,
    marginTop: 6,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  grandTotal: {
    fontWeight: 'bold',
    fontSize: 8,
    borderTop: '1pt solid black',
    borderBottom: '1pt solid black',
    paddingVertical: 2,
    marginTop: 3,
  },
  footer: {
    textAlign: 'center',
    marginTop: 6,
    borderTop: '1pt dashed black',
    paddingTop: 3,
    fontSize: 5,
  },
  thankYou: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
});

const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
const formatDate = (date: string) => new Date(date).toLocaleString('en-IN');

const ThermalReceiptDocument: React.FC<ThermalReceiptProps> = ({ restaurant, bill }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <View style={styles.restaurantDetails}>
          {restaurant.address && (
            <>
              <Text>{restaurant.address.line1}</Text>
              <Text>{restaurant.address.city}, {restaurant.address.state}</Text>
            </>
          )}
          {restaurant.phone && <Text>Ph: {restaurant.phone}</Text>}
          {restaurant.gstin && <Text>GSTIN: {restaurant.gstin}</Text>}
        </View>
      </View>

      {/* Bill Info */}
      <View style={styles.billInfo}>
        <Text>TABLE: {bill.tableNumber}</Text>
        <Text>{formatDate(bill.billGeneratedAt)}</Text>
      </View>

      <View style={styles.sectionDivider} />

      {/* Items */}
      <View style={styles.items}>
        {bill.orders.map((order, orderIndex) => (
          <View key={orderIndex}>
            {orderIndex > 0 && (
              <View style={styles.orderSeparator}>
                <Text>ORDER #{order.orderNumber}</Text>
              </View>
            )}
            {order.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.item}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.qtyRate}>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </Text>
                  <Text style={styles.amount}>{formatCurrency(item.lineTotal)}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalLine}>
          <Text>Subtotal:</Text>
          <Text>{formatCurrency(bill.subtotal)}</Text>
        </View>

        {bill.cgstAmount > 0 && (
          <View style={styles.totalLine}>
            <Text>CGST:</Text>
            <Text>{formatCurrency(bill.cgstAmount)}</Text>
          </View>
        )}

        {bill.sgstAmount > 0 && (
          <View style={styles.totalLine}>
            <Text>SGST:</Text>
            <Text>{formatCurrency(bill.sgstAmount)}</Text>
          </View>
        )}

        {bill.igstAmount > 0 && (
          <View style={styles.totalLine}>
            <Text>IGST:</Text>
            <Text>{formatCurrency(bill.igstAmount)}</Text>
          </View>
        )}

        {bill.taxAmount > 0 && (
          <View style={styles.totalLine}>
            <Text>Total Tax:</Text>
            <Text>{formatCurrency(bill.taxAmount)}</Text>
          </View>
        )}

        {bill.roundOffAmount !== 0 && (
          <View style={styles.totalLine}>
            <Text>Round Off:</Text>
            <Text>{formatCurrency(bill.roundOffAmount)}</Text>
          </View>
        )}

        <View style={[styles.totalLine, styles.grandTotal]}>
          <Text>TOTAL:</Text>
          <Text>{formatCurrency(bill.totalAmount)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.thankYou}>THANK YOU FOR VISITING!</Text>
        <Text>Powered by RestoHand</Text>
      </View>
    </Page>
  </Document>
);

export const generateThermalReceiptPDF = async (data: ThermalReceiptProps): Promise<Blob> => {
  const doc = <ThermalReceiptDocument {...data} />;
  const asPdf = pdf(doc);
  return await asPdf.toBlob();
};

export default ThermalReceiptDocument;