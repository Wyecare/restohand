import React from 'react';
import { formatCurrency } from '@/lib/billing';
import type { Order } from '@/store/api/types';

interface ReceiptProps {
  order: Order;
  restaurantInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
  };
}

export function Receipt({ order, restaurantInfo }: ReceiptProps) {
  const subtotal = order?.subTotalAmount ?? order?.totalAmount ?? 0;
  const cgst = order?.cgstAmount ?? 0;
  const sgst = order?.sgstAmount ?? 0;
  const igst = order?.igstAmount ?? 0;
  const discount = order?.discountAmount ?? 0;
  const roundOff = order?.roundOffAmount ?? 0;

  return (
    <div className="max-w-sm mx-auto bg-white text-black font-mono text-sm leading-relaxed p-6">
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-4 mb-4">
        <h1 className="text-lg font-bold uppercase">
          {restaurantInfo?.name || 'Restaurant'}
        </h1>
        {restaurantInfo?.address && (
          <p className="text-xs mt-1">{restaurantInfo.address}</p>
        )}
        <div className="flex justify-between text-xs mt-2">
          {restaurantInfo?.phone && (
            <span>Ph: {restaurantInfo.phone}</span>
          )}
          {restaurantInfo?.email && (
            <span>{restaurantInfo.email}</span>
          )}
        </div>
        {restaurantInfo?.gstNumber && (
          <p className="text-xs mt-1">GST: {restaurantInfo.gstNumber}</p>
        )}
      </div>

      {/* Order Info */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        <div className="flex justify-between">
          <span>Bill No:</span>
          <span className="font-bold">#{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span>Time:</span>
          <span>{new Date(order.createdAt).toLocaleTimeString('en-IN')}</span>
        </div>
        {order.tableNumber && (
          <div className="flex justify-between">
            <span>Table:</span>
            <span>{order.tableNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Mode:</span>
          <span className="uppercase">{order.paymentMethod}</span>
        </div>
      </div>

      {/* Items */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        <div className="flex justify-between font-bold mb-2">
          <span>Item</span>
          <span>Qty</span>
          <span>Amount</span>
        </div>
        {order.items.map((item, index) => (
          <div key={index} className="mb-2">
            <div className="flex justify-between">
              <span className="truncate flex-1 mr-2">{item.name}</span>
              <span className="w-8 text-center">{item.quantity}</span>
              <span className="w-16 text-right">
                {formatCurrency(item.pricing.unitAmount * item.quantity)}
              </span>
            </div>
            <div className="text-xs text-gray-600 ml-2">
              @ {formatCurrency(item.pricing.unitAmount)} each
            </div>
          </div>
        ))}
      </div>

      {/* Bill Summary */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {cgst > 0 && (
          <div className="flex justify-between">
            <span>CGST (2.5%):</span>
            <span>{formatCurrency(cgst)}</span>
          </div>
        )}

        {sgst > 0 && (
          <div className="flex justify-between">
            <span>SGST (2.5%):</span>
            <span>{formatCurrency(sgst)}</span>
          </div>
        )}

        {igst > 0 && (
          <div className="flex justify-between">
            <span>IGST (5%):</span>
            <span>{formatCurrency(igst)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}

        {Math.abs(roundOff) > 0.004 && (
          <div className="flex justify-between">
            <span>Round Off:</span>
            <span>{formatCurrency(roundOff)}</span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-4">
        <div className="flex justify-between text-lg font-bold">
          <span>TOTAL:</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="text-xs text-center mt-2">
          {order.taxType === 'inter-state' ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'}
          {' '}• Inclusive of all taxes
        </div>
      </div>

      {/* Payment Status */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-4">
        <div className="flex justify-between">
          <span>Payment Status:</span>
          <span className={`font-bold uppercase ${
            order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'
          }`}>
            {order.paymentStatus}
          </span>
        </div>
        {order.paidAt && (
          <div className="flex justify-between text-xs">
            <span>Paid At:</span>
            <span>{new Date(order.paidAt).toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs">
        <p className="mb-2">Thank you for dining with us!</p>
        <p className="mb-1">Visit us again soon</p>
        <div className="border-t border-dashed border-gray-400 pt-2 mt-3">
          <p>Powered by Restohand</p>
          <p>www.restohand.in</p>
        </div>
      </div>
    </div>
  );
}

// Component for printing receipt
export function PrintableReceipt({ order, restaurantInfo }: ReceiptProps) {
  return (
    <div className="print:block hidden">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-receipt, .print-receipt * {
              visibility: visible;
            }
            .print-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: 80mm auto;
              margin: 5mm;
            }
          }
        `}
      </style>
      <div className="print-receipt">
        <Receipt order={order} restaurantInfo={restaurantInfo} />
      </div>
    </div>
  );
}