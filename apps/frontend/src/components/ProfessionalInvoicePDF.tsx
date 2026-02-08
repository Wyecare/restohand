import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

interface ProfessionalInvoiceProps {
  restaurant: {
    name: string;
    legalEntity?: string;
    address?: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
    };
    phone?: string;
    email?: string;
    gstin?: string;
    fssai?: string;
    pan?: string;
    cin?: string;
  };
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  };
  invoice: {
    number: string;
    date: string;
    orderId: string;
    orderNumber: string;
    tableNumber: string;
    paymentMethod: string;
  };
  bill: {
    orders: Array<{
      orderNumber: string;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        grossValue: number;
        discount: number;
        netValue: number;
        lineTotal: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
        activePriceTagId?: string;
        selectedModifiers?: Array<{
          modifierName: string;
          selectedOptions: Array<{
            optionName: string;
            priceAdjustment: number;
          }>;
        }>;
        notes?: string;
        hsnCode?: string;
      }>;
    }>;
    subtotal: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    discountAmount: number;
    roundOffAmount: number;
    totalAmount: number;
    amountInWords: string;
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 20,
    lineHeight: 1.2,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  invoiceInfoLeft: {
    flex: 1,
  },

  invoiceInfoRight: {
    flex: 1,
    textAlign: 'right',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottom: 1,
    borderBottomColor: '#000',
    paddingBottom: 2,
  },

  addressBlock: {
    marginBottom: 15,
  },

  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  addressColumn: {
    flex: 1,
    paddingRight: 20,
  },

  boldText: {
    fontWeight: 'bold',
  },

  table: {
    marginTop: 15,
    marginBottom: 15,
  },

  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 9,
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 9,
  },

  tableRowEven: {
    backgroundColor: '#fafafa',
  },

  tableCell: {
    flex: 1,
    paddingHorizontal: 2,
  },

  tableCellRight: {
    textAlign: 'right',
  },

  tableCellCenter: {
    textAlign: 'center',
  },

  totalRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 10,
  },

  summarySection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  summaryLeft: {
    flex: 1,
  },

  summaryRight: {
    flex: 1,
    paddingLeft: 20,
  },

  summaryTable: {
    borderWidth: 1,
    borderColor: '#000',
  },

  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },

  summaryLabel: {
    flex: 2,
    fontSize: 10,
  },

  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10,
  },

  grandTotalRow: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 12,
  },

  footer: {
    marginTop: 30,
    borderTop: 1,
    borderTopColor: '#000',
    paddingTop: 15,
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },

  serviceSection: {
    marginTop: 20,
    marginBottom: 15,
  },

  serviceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  serviceTable: {
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
  },

  modifierText: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 10,
  },

  specialPriceText: {
    fontSize: 8,
    color: '#008000',
    fontWeight: 'bold',
  },
});

const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-IN', options);
};

const ProfessionalInvoiceDocument: React.FC<ProfessionalInvoiceProps> = ({
  restaurant,
  customer,
  invoice,
  bill,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tax Invoice</Text>

        <View style={styles.invoiceInfo}>
          <View style={styles.invoiceInfoLeft}>
            <Text style={styles.boldText}>Order ID: {invoice.orderId}</Text>
            <Text>Invoice No: {invoice.number}</Text>
          </View>
          <View style={styles.invoiceInfoRight}>
            <Text style={styles.boldText}>Invoice Date: {formatDate(invoice.date)}</Text>
            <Text>Table: {invoice.tableNumber}</Text>
          </View>
        </View>
      </View>

      {/* Restaurant and Customer Details */}
      <View style={styles.addressRow}>
        <View style={styles.addressColumn}>
          <Text style={styles.sectionTitle}>Restaurant Details</Text>
          <View style={styles.addressBlock}>
            <Text style={styles.boldText}>{restaurant.name}</Text>
            {restaurant.legalEntity && (
              <Text style={styles.boldText}>{restaurant.legalEntity}</Text>
            )}
            {restaurant.address && (
              <>
                <Text>{restaurant.address.line1}</Text>
                <Text>{restaurant.address.city}, {restaurant.address.state}</Text>
                <Text>{restaurant.address.postalCode}</Text>
              </>
            )}
            {restaurant.gstin && <Text>GSTIN: {restaurant.gstin}</Text>}
            {restaurant.fssai && <Text>FSSAI: {restaurant.fssai}</Text>}
            {restaurant.pan && <Text>PAN: {restaurant.pan}</Text>}
            {restaurant.phone && <Text>Ph: {restaurant.phone}</Text>}
          </View>
        </View>

        <View style={styles.addressColumn}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={styles.addressBlock}>
            <Text style={styles.boldText}>{customer.name}</Text>
            {customer.address && <Text>{customer.address}</Text>}
            {customer.phone && <Text>Phone: {customer.phone}</Text>}
            {customer.email && <Text>Email: {customer.email}</Text>}
            <Text>GSTIN: {customer.gstin || 'UNREGISTERED'}</Text>
          </View>
        </View>
      </View>

      {/* Order Items Section */}
      <View style={styles.serviceSection}>
        <Text style={styles.serviceTitle}>Order Items</Text>
        <Text>HSN Code: 996331 | Service Description: Restaurant Service</Text>

        <View style={styles.serviceTable}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Item</Text>
            <Text style={[styles.tableCell, styles.tableCellCenter]}>Qty</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>Gross Value</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>Discount</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>Net Value</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>CGST</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>SGST</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>Total</Text>
          </View>

          {/* Table Rows */}
          {bill.orders.flatMap((order) =>
            order.items.map((item, index) => (
              <View key={`${order.orderNumber}-${index}`}>
                <View style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : {}]}>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text>{item.quantity} x {item.name}</Text>
                    {item.activePriceTagId && (
                      <Text style={styles.specialPriceText}>(SPECIAL PRICE)</Text>
                    )}
                    {item.selectedModifiers && item.selectedModifiers.map((modifier, modIndex) => (
                      <View key={modIndex}>
                        {modifier.selectedOptions.map((option, optIndex) => (
                          <Text key={optIndex} style={styles.modifierText}>
                            + {option.optionName} {option.priceAdjustment > 0 && `(+${formatCurrency(option.priceAdjustment)})`}
                          </Text>
                        ))}
                      </View>
                    ))}
                    {item.notes && (
                      <Text style={styles.modifierText}>Note: {item.notes}</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.tableCellCenter]}>{item.quantity}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>{formatCurrency(item.grossValue)}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>{formatCurrency(item.discount)}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>{formatCurrency(item.netValue)}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>{formatCurrency(item.cgstAmount)}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>{formatCurrency(item.sgstAmount)}</Text>
                  <Text style={[styles.tableCell, styles.tableCellRight]}>{formatCurrency(item.lineTotal)}</Text>
                </View>
              </View>
            ))
          )}

          {/* Items Total Row */}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.tableCell, { flex: 2 }, styles.boldText]}>Items Total</Text>
            <Text style={[styles.tableCell, styles.tableCellCenter, styles.boldText]}>-</Text>
            <Text style={[styles.tableCell, styles.tableCellRight, styles.boldText]}>{formatCurrency(bill.subtotal + bill.discountAmount)}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight, styles.boldText]}>{formatCurrency(bill.discountAmount)}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight, styles.boldText]}>{formatCurrency(bill.subtotal)}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight, styles.boldText]}>{formatCurrency(bill.cgstAmount)}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight, styles.boldText]}>{formatCurrency(bill.sgstAmount)}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight, styles.boldText]}>{formatCurrency(bill.subtotal + bill.taxAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Payment Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryLeft}>
          <Text style={styles.boldText}>Payment Method: {invoice.paymentMethod}</Text>
          <Text>Payment settled against Order ID {invoice.orderId}</Text>
          <Text>Reverse Charge: No</Text>

          {bill.amountInWords && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.boldText}>Amount in Words:</Text>
              <Text>{bill.amountInWords}</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryRight}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Food Items</Text>
              <Text style={styles.summaryValue}>{formatCurrency(bill.subtotal + bill.taxAmount)}</Text>
            </View>
            {bill.roundOffAmount !== 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Round Off</Text>
                <Text style={styles.summaryValue}>{formatCurrency(bill.roundOffAmount)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.grandTotalRow]}>
              <Text style={styles.summaryLabel}>Grand Total</Text>
              <Text style={styles.summaryValue}>{formatCurrency(bill.totalAmount)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>This is an original invoice for the recipient.</Text>
        <Text>For terms and conditions, please visit your restaurant's website</Text>
        <Text style={{ marginTop: 5, fontWeight: 'bold' }}>Powered by Restohand</Text>
      </View>
    </Page>
  </Document>
);

/* Export function */
export const generateProfessionalInvoicePDF = async (
  data: ProfessionalInvoiceProps
): Promise<Blob> => {
  const doc = <ProfessionalInvoiceDocument {...data} />;
  const asPdf = pdf(doc);
  return await asPdf.toBlob();
};

export default ProfessionalInvoiceDocument;