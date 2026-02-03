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

// 58mm = ~164.4pt. We use that as page width, and let height be auto via a tall fixed value.
const RECEIPT_WIDTH = 164.4;
const RECEIPT_HEIGHT = 700; // tall enough; content won't stretch it
const PAD = 8; // left/right padding in pts
const INNER = RECEIPT_WIDTH - PAD * 2; // usable content width

const styles = StyleSheet.create({
  page: {
    width: RECEIPT_WIDTH,
    minHeight: RECEIPT_HEIGHT,
    paddingHorizontal: PAD,
    paddingTop: 10,
    paddingBottom: 14,
    fontFamily: 'Courier',
    backgroundColor: '#fffef9',
  },

  // ── header ──
  headerBlock: {
    alignItems: 'center',
    marginBottom: 6,
  },
  restaurantName: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerSmall: {
    fontSize: 5.5,
    color: '#444',
    textAlign: 'center',
    lineHeight: 1.3,
  },

  // ── dashed / solid lines ──
  dashedLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: '#999',
    borderBottomStyle: 'dashed',
    marginVertical: 4,
  },
  solidLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: '#000',
    marginVertical: 2,
  },
  dottedLine: {
    borderBottomWidth: 0.6,
    borderBottomColor: '#aaa',
    borderBottomStyle: 'dotted',
    marginVertical: 3,
  },

  // ── bill info row ──
  billInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  billInfoText: {
    fontSize: 5.8,
    color: '#333',
  },

  // ── order label ──
  orderLabel: {
    fontSize: 5.5,
    color: '#666',
    textAlign: 'center',
    marginVertical: 3,
  },

  // ── item row ──
  itemRow: {
    marginBottom: 3,
  },
  itemNameLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  itemName: {
    fontSize: 6.2,
    fontWeight: 'bold',
    color: '#111',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  itemTotal: {
    fontSize: 6.2,
    fontWeight: 'bold',
    color: '#111',
    flexShrink: 0,
    marginLeft: 4,
  },
  itemDetail: {
    fontSize: 5.4,
    color: '#666',
    marginTop: 0.8,
  },

  // ── summary rows ──
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1.5,
  },
  summaryLabel: {
    fontSize: 5.8,
    color: '#444',
  },
  summaryValue: {
    fontSize: 5.8,
    color: '#444',
  },

  // ── grand total ──
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
    marginBottom: 2,
    paddingVertical: 2.5,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  grandTotalLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  grandTotalValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },

  // ── footer ──
  footer: {
    alignItems: 'center',
    marginTop: 6,
  },
  footerThank: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  footerPowered: {
    fontSize: 5,
    color: '#888',
    marginTop: 2,
  },

  // ── jagged edge hint (top/bottom) ──
  jagged: {
    fontSize: 5,
    color: '#ccc',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 1,
  },
});

/* ── helpers ── */
const fmt = (n: number) => `₹${n.toFixed(2)}`;

const formatDate = (date: string) => {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()}  ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/* ── dot-leader row: fills space between label and value with dots ── */
const DotRow = ({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) => {
  // Approximate char width at fontSize ~5.8 in Courier ≈ 3.2pt per char
  // Inner width = INNER ≈ 148.4pt → ~46 chars total
  const MAX_CHARS = 46;
  const dots = Math.max(2, MAX_CHARS - label.length - value.length);
  const dotString = '.'.repeat(dots);
  return (
    <Text
      style={{
        fontSize: 5.8,
        color: bold ? '#111' : '#444',
        marginBottom: 1.2,
      }}
    >
      {label}
      <Text style={{ color: '#aaa' }}>{dotString}</Text>
      <Text style={{ fontWeight: bold ? 'bold' : 'normal' }}>{value}</Text>
    </Text>
  );
};

/* ── item with dot leader between name and price ── */
const ItemLine = ({
  item,
}: {
  item: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  };
}) => {
  const MAX_CHARS = 46;
  const nameStr = item.name.toUpperCase();
  const priceStr = fmt(item.lineTotal);
  const dots = Math.max(2, MAX_CHARS - nameStr.length - priceStr.length);

  return (
    <View style={styles.itemRow}>
      <Text style={{ fontSize: 6.2, color: '#111' }}>
        <Text style={{ fontWeight: 'bold' }}>{nameStr}</Text>
        <Text style={{ color: '#bbb' }}>{'.'.repeat(dots)}</Text>
        <Text style={{ fontWeight: 'bold' }}>{priceStr}</Text>
      </Text>
      <Text style={styles.itemDetail}>
        {item.quantity} x {fmt(item.unitPrice)}
      </Text>
    </View>
  );
};

/* ── main document ── */
const ThermalReceiptDocument: React.FC<ThermalReceiptProps> = ({
  restaurant,
  bill,
}) => (
  <Document>
    <Page size={[RECEIPT_WIDTH, RECEIPT_HEIGHT]} style={styles.page}>
      {/* top jagged edge illusion */}
      <Text style={styles.jagged}>{'~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~'}</Text>

      {/* Restaurant header */}
      <View style={styles.headerBlock}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <View style={{ marginTop: 3 }}>
          {restaurant.address && (
            <>
              <Text style={styles.headerSmall}>{restaurant.address.line1}</Text>
              <Text style={styles.headerSmall}>
                {restaurant.address.city}, {restaurant.address.state}{' '}
                {restaurant.address.postalCode}
              </Text>
            </>
          )}
          {restaurant.phone && (
            <Text style={styles.headerSmall}>Ph: {restaurant.phone}</Text>
          )}
          {restaurant.gstin && (
            <Text style={styles.headerSmall}>GSTIN: {restaurant.gstin}</Text>
          )}
        </View>
      </View>

      <View style={styles.dashedLine} />

      {/* Bill info */}
      <View style={styles.billInfoRow}>
        <Text style={styles.billInfoText}>Table: {bill.tableNumber}</Text>
        <Text style={styles.billInfoText}>
          {formatDate(bill.billGeneratedAt)}
        </Text>
      </View>

      <View style={styles.dashedLine} />

      {/* Orders + items */}
      {bill.orders.map((order, orderIndex) => (
        <View key={orderIndex}>
          {/* Order label — show for every order */}
          <Text style={styles.orderLabel}>
            --- Order #{order.orderNumber} ---
          </Text>

          {order.items.map((item, itemIndex) => (
            <ItemLine key={itemIndex} item={item} />
          ))}
        </View>
      ))}

      <View style={styles.dashedLine} />

      {/* Summary */}
      <DotRow label="Subtotal" value={fmt(bill.subtotal)} />

      {bill.cgstAmount > 0 && (
        <DotRow label="CGST" value={fmt(bill.cgstAmount)} />
      )}
      {bill.sgstAmount > 0 && (
        <DotRow label="SGST" value={fmt(bill.sgstAmount)} />
      )}
      {bill.igstAmount > 0 && (
        <DotRow label="IGST" value={fmt(bill.igstAmount)} />
      )}
      {bill.taxAmount > 0 && (
        <DotRow label="Tax Total" value={fmt(bill.taxAmount)} />
      )}
      {bill.roundOffAmount !== 0 && (
        <DotRow label="Round Off" value={fmt(bill.roundOffAmount)} />
      )}

      {/* Grand total */}
      <View style={styles.grandTotalRow}>
        <Text style={styles.grandTotalLabel}>TOTAL</Text>
        <Text style={styles.grandTotalValue}>{fmt(bill.totalAmount)}</Text>
      </View>

      <View style={styles.dashedLine} />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerThank}>Thank you for visiting!</Text>
        <Text style={styles.footerPowered}>Powered by Restohand</Text>
      </View>

      {/* bottom jagged edge illusion */}
      <Text style={[styles.jagged, { marginTop: 8 }]}>
        {'~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~'}
      </Text>
    </Page>
  </Document>
);

/* ── export ── */
export const generateThermalReceiptPDF = async (
  data: ThermalReceiptProps
): Promise<Blob> => {
  const doc = <ThermalReceiptDocument {...data} />;
  const asPdf = pdf(doc);
  return await asPdf.toBlob();
};

export default ThermalReceiptDocument;
