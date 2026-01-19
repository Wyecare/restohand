import React, { useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Line } from 'react-konva';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import type { EnhancedRestaurantTable, TableStatus } from '@/store/api/types';

interface TimelineViewProps {
  tables: EnhancedRestaurantTable[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onTableSlotClick?: (table: EnhancedRestaurantTable, timeSlot: Date) => void;
}

const TIMELINE_CONFIG = {
  rowHeight: 60,
  headerHeight: 80,
  timeSlotWidth: 80,
  tableNameWidth: 120,
  hourInterval: 30, // minutes
  startHour: 10, // 10:00 AM
  endHour: 23, // 11:00 PM
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  tables,
  selectedDate,
  onDateChange,
  onTableSlotClick,
}) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const slots = [];
    const startTime = new Date(selectedDate);
    startTime.setHours(TIMELINE_CONFIG.startHour, 0, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(TIMELINE_CONFIG.endHour, 0, 0, 0);

    const current = new Date(startTime);
    while (current <= endTime) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + TIMELINE_CONFIG.hourInterval);
    }
    return slots;
  }, [selectedDate]);

  const timeSlotToIndex = (time: Date) => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(TIMELINE_CONFIG.startHour, 0, 0, 0);
    const diffMs = time.getTime() - dayStart.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return Math.floor(diffMinutes / TIMELINE_CONFIG.hourInterval);
  };

  const indexToTimeSlot = (index: number) => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(TIMELINE_CONFIG.startHour, 0, 0, 0);
    const timeSlot = new Date(dayStart);
    timeSlot.setMinutes(dayStart.getMinutes() + index * TIMELINE_CONFIG.hourInterval);
    return timeSlot;
  };

  const getCurrentTimeIndex = () => {
    const now = new Date();
    if (now.toDateString() !== selectedDate.toDateString()) return -1;
    return timeSlotToIndex(now);
  };

  const getOccupancyBlocks = (table: EnhancedRestaurantTable) => {
    const blocks = [];
    const status = table.currentStatus;

    if (!status || status.status === 'available') return blocks;

    let startTime: Date;
    let endTime: Date;

    if (status.status === 'reserved' && status.reservedFrom && status.reservedUntil) {
      // Use exact reservation times for reserved tables
      startTime = new Date(status.reservedFrom);
      endTime = new Date(status.reservedUntil);
    } else if (status.status === 'occupied' && status.occupiedSince) {
      // For occupied tables, use occupiedSince and estimate based on reservation duration or default
      startTime = new Date(status.occupiedSince);
      const durationMs = (status.reservationEstimatedDuration || 90) * 60 * 1000; // Default 1.5 hours
      endTime = new Date(startTime.getTime() + durationMs);
    } else {
      return blocks;
    }

    // Only show blocks for the selected date
    if (startTime.toDateString() === selectedDate.toDateString() ||
        endTime.toDateString() === selectedDate.toDateString()) {

      const startIndex = timeSlotToIndex(startTime);
      const endIndex = timeSlotToIndex(endTime);

      if (startIndex >= 0 || endIndex >= 0) {
        blocks.push({
          startIndex: Math.max(0, startIndex),
          endIndex: Math.min(timeSlots.length - 1, Math.max(endIndex, startIndex + 1)),
          status: status.status,
          partySize: status.currentPartySize || 0,
          customerName: status.reservationCustomerName || '',
          billAmount: status.currentBillAmount || 0,
          specialRequests: status.reservationSpecialRequests || '',
          reservationNotes: status.reservationNotes || '',
        });
      }
    }

    return blocks;
  };

  const getBlockColor = (status: string, isDarkMode: boolean) => {
    const colors = {
      occupied: isDarkMode ? '#f97316' : '#fb923c', // orange
      reserved: isDarkMode ? '#3b82f6' : '#60a5fa', // blue
      cleaning: isDarkMode ? '#6b7280' : '#9ca3af', // gray
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const canvasWidth = TIMELINE_CONFIG.tableNameWidth + (timeSlots.length * TIMELINE_CONFIG.timeSlotWidth);
  const canvasHeight = TIMELINE_CONFIG.headerHeight + (tables.length * TIMELINE_CONFIG.rowHeight);
  const currentTimeIndex = getCurrentTimeIndex();

  const textFill = isDarkMode ? '#FFFFFF' : '#000000';
  const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
  const currentTimeColor = '#ef4444'; // red

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline View
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const yesterday = new Date(selectedDate);
                yesterday.setDate(yesterday.getDate() - 1);
                onDateChange(yesterday);
              }}
            >
              ← Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tomorrow = new Date(selectedDate);
                tomorrow.setDate(tomorrow.getDate() + 1);
                onDateChange(tomorrow);
              }}
            >
              Next →
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-auto">
          <Stage width={Math.min(canvasWidth, 1200)} height={Math.min(canvasHeight, 600)}>
            <Layer>
              {/* Time slot headers */}
              {timeSlots.map((slot, index) => (
                <React.Fragment key={`header-${index}`}>
                  {/* Grid lines */}
                  <Line
                    points={[
                      TIMELINE_CONFIG.tableNameWidth + index * TIMELINE_CONFIG.timeSlotWidth,
                      0,
                      TIMELINE_CONFIG.tableNameWidth + index * TIMELINE_CONFIG.timeSlotWidth,
                      canvasHeight
                    ]}
                    stroke={gridColor}
                    strokeWidth={1}
                  />

                  {/* Time labels */}
                  <Text
                    text={slot.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                    x={TIMELINE_CONFIG.tableNameWidth + index * TIMELINE_CONFIG.timeSlotWidth}
                    y={10}
                    width={TIMELINE_CONFIG.timeSlotWidth}
                    fontSize={11}
                    fontFamily="Inter, system-ui, sans-serif"
                    fill={textFill}
                    align="center"
                  />
                </React.Fragment>
              ))}

              {/* Current time indicator */}
              {currentTimeIndex >= 0 && (
                <>
                  <Line
                    points={[
                      TIMELINE_CONFIG.tableNameWidth + currentTimeIndex * TIMELINE_CONFIG.timeSlotWidth,
                      0,
                      TIMELINE_CONFIG.tableNameWidth + currentTimeIndex * TIMELINE_CONFIG.timeSlotWidth,
                      canvasHeight
                    ]}
                    stroke={currentTimeColor}
                    strokeWidth={2}
                  />
                  <Text
                    text="NOW"
                    x={TIMELINE_CONFIG.tableNameWidth + currentTimeIndex * TIMELINE_CONFIG.timeSlotWidth - 15}
                    y={TIMELINE_CONFIG.headerHeight - 20}
                    fontSize={10}
                    fontFamily="Inter, system-ui, sans-serif"
                    fill={currentTimeColor}
                    fontStyle="bold"
                  />
                </>
              )}

              {/* Table rows */}
              {tables.map((table, tableIndex) => {
                const rowY = TIMELINE_CONFIG.headerHeight + tableIndex * TIMELINE_CONFIG.rowHeight;
                const occupancyBlocks = getOccupancyBlocks(table);

                return (
                  <React.Fragment key={`table-${table.id}`}>
                    {/* Row background */}
                    <Rect
                      x={0}
                      y={rowY}
                      width={canvasWidth}
                      height={TIMELINE_CONFIG.rowHeight}
                      fill={tableIndex % 2 === 0 ? (isDarkMode ? '#1f2937' : '#f9fafb') : 'transparent'}
                    />

                    {/* Horizontal grid line */}
                    <Line
                      points={[0, rowY, canvasWidth, rowY]}
                      stroke={gridColor}
                      strokeWidth={1}
                    />

                    {/* Table name */}
                    <Rect
                      x={0}
                      y={rowY}
                      width={TIMELINE_CONFIG.tableNameWidth}
                      height={TIMELINE_CONFIG.rowHeight}
                      fill={isDarkMode ? '#374151' : '#f3f4f6'}
                      stroke={gridColor}
                      strokeWidth={1}
                    />
                    <Text
                      text={`Table ${table.tableNumber}`}
                      x={10}
                      y={rowY + 15}
                      fontSize={14}
                      fontFamily="Inter, system-ui, sans-serif"
                      fill={textFill}
                      fontStyle="bold"
                    />
                    <Text
                      text={`${table.capacity} seats • ${table.zone || 'No zone'}`}
                      x={10}
                      y={rowY + 35}
                      fontSize={10}
                      fontFamily="Inter, system-ui, sans-serif"
                      fill={textFill}
                      opacity={0.7}
                    />

                    {/* Occupancy blocks */}
                    {occupancyBlocks.map((block, blockIndex) => {
                      const blockWidth = (block.endIndex - block.startIndex + 1) * TIMELINE_CONFIG.timeSlotWidth;
                      const blockX = TIMELINE_CONFIG.tableNameWidth + block.startIndex * TIMELINE_CONFIG.timeSlotWidth;

                      return (
                        <React.Fragment key={`block-${blockIndex}`}>
                          <Rect
                            x={blockX}
                            y={rowY + 5}
                            width={blockWidth}
                            height={TIMELINE_CONFIG.rowHeight - 10}
                            fill={getBlockColor(block.status, isDarkMode)}
                            cornerRadius={4}
                            opacity={0.8}
                            onClick={() => {
                              if (onTableSlotClick) {
                                const timeSlot = indexToTimeSlot(block.startIndex);
                                onTableSlotClick(table, timeSlot);
                              }
                            }}
                          />
                          {/* Block details */}
                          <Text
                            text={block.status.toUpperCase()}
                            x={blockX + 5}
                            y={rowY + 15}
                            fontSize={10}
                            fontFamily="Inter, system-ui, sans-serif"
                            fill="white"
                            fontStyle="bold"
                          />
                          {block.customerName && (
                            <Text
                              text={block.customerName}
                              x={blockX + 5}
                              y={rowY + 30}
                              fontSize={9}
                              fontFamily="Inter, system-ui, sans-serif"
                              fill="white"
                            />
                          )}
                          {block.partySize > 0 && (
                            <Text
                              text={`${block.partySize} guests`}
                              x={blockX + 5}
                              y={rowY + 42}
                              fontSize={8}
                              fontFamily="Inter, system-ui, sans-serif"
                              fill="white"
                              opacity={0.9}
                            />
                          )}
                          {block.specialRequests && (
                            <Text
                              text={`★ ${block.specialRequests.slice(0, 20)}${block.specialRequests.length > 20 ? '...' : ''}`}
                              x={blockX + 5}
                              y={rowY + 52}
                              fontSize={7}
                              fontFamily="Inter, system-ui, sans-serif"
                              fill="white"
                              opacity={0.8}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Time slot click areas for reservations */}
                    {timeSlots.map((slot, slotIndex) => {
                      // Skip if this slot is already occupied
                      const isOccupied = occupancyBlocks.some(block =>
                        slotIndex >= block.startIndex && slotIndex <= block.endIndex
                      );

                      if (isOccupied) return null;

                      return (
                        <Rect
                          key={`slot-${slotIndex}`}
                          x={TIMELINE_CONFIG.tableNameWidth + slotIndex * TIMELINE_CONFIG.timeSlotWidth}
                          y={rowY}
                          width={TIMELINE_CONFIG.timeSlotWidth}
                          height={TIMELINE_CONFIG.rowHeight}
                          fill="transparent"
                          onClick={() => {
                            if (onTableSlotClick) {
                              onTableSlotClick(table, slot);
                            }
                          }}
                          onMouseEnter={(e) => {
                            const stage = e.target.getStage();
                            if (stage) {
                              stage.container().style.cursor = 'pointer';
                            }
                          }}
                          onMouseLeave={(e) => {
                            const stage = e.target.getStage();
                            if (stage) {
                              stage.container().style.cursor = 'default';
                            }
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </Layer>
          </Stage>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span>Cleaning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-red-500"></div>
            <span>Current Time</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};