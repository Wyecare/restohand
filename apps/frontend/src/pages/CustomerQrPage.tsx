import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { QrCode, Download, Copy, Utensils, Hash, RefreshCw, Store } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQuery,
  useGetRestaurantQrCodeQuery,
  useListRestaurantTablesQuery,
  useGenerateRestaurantTableQrMutation,
} from '@/store/api/restaurantsApi';
import type { RestaurantTable } from '@/store/api/types';

interface QrCodeDisplayProps {
  title: string;
  description: string;
  qrCode: any;
  isLoading: boolean;
  onCopyLink: () => void;
  onDownload: () => void;
  icon?: React.ReactNode;
}

const QrCodeDisplay = ({ title, description, qrCode, isLoading, onCopyLink, onDownload, icon }: QrCodeDisplayProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col items-center gap-4">
      {isLoading ? (
        <div className="flex h-32 w-32 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : qrCode ? (
        <>
          <img
            src={qrCode.dataUrl}
            alt={`QR Code for ${title}`}
            className="h-32 w-32 rounded-lg border bg-white p-2 shadow-sm"
          />
          <div className="text-center">
            <p className="font-medium text-sm">{qrCode.restaurant.name}</p>
            <p className="text-xs text-muted-foreground">
              {qrCode.table ? `Table ${qrCode.table}` : 'General Access'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyLink}
              className="text-xs"
            >
              <Copy className="mr-1 h-3 w-3" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="text-xs"
            >
              <Download className="mr-1 h-3 w-3" />
              Download
            </Button>
          </div>
        </>
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <QrCode className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">No QR code</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const CustomerQrPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const [generatingTableQrs, setGeneratingTableQrs] = useState<Set<string>>(new Set());

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  const { data: restaurant } = useGetRestaurantQuery(restaurantId ?? skipToken);
  const { data: tables, isLoading: isLoadingTables } = useListRestaurantTablesQuery(restaurantId ?? skipToken);

  // Main restaurant QR (no table specified)
  const { data: mainQrCode, isFetching: isGeneratingMainQr } = useGetRestaurantQrCodeQuery(
    restaurantId ? { restaurantId, table: undefined } : skipToken
  );

  const [generateTableQr] = useGenerateRestaurantTableQrMutation();

  const handleCopyLink = (qrCode: any) => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode.url);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  const handleDownloadQr = (qrCode: any) => {
    if (qrCode) {
      const link = document.createElement('a');
      link.href = qrCode.dataUrl;
      link.download = `restohand-${qrCode.restaurant.slug}${
        qrCode.table ? `-table-${qrCode.table}` : '-main'
      }.png`;
      link.click();
      toast({ title: 'QR code downloaded!' });
    }
  };

  const handleGenerateTableQr = async (table: RestaurantTable) => {
    if (!restaurantId) return;

    setGeneratingTableQrs(prev => new Set([...prev, table.id]));

    try {
      await generateTableQr({
        restaurantId,
        tableId: table.id,
      }).unwrap();
      toast({ title: `QR code generated for ${table.displayName}` });
    } catch (error) {
      toast({
        title: 'Failed to generate QR code',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setGeneratingTableQrs(prev => {
        const newSet = new Set(prev);
        newSet.delete(table.id);
        return newSet;
      });
    }
  };

  const activeTables = tables?.data?.filter(table => !table.archivedAt) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer QR Codes</h1>
        <p className="text-muted-foreground">
          Generate and manage QR codes for your customers to access the digital menu and place orders.
        </p>
      </div>

      {/* Main Restaurant QR Code */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Main Restaurant QR Code</h2>
          <p className="text-sm text-muted-foreground">
            General QR code for customers to access your menu. Ideal for entrance displays and takeaway orders.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 max-w-md">
          <QrCodeDisplay
            title="Main Menu Access"
            description="Customers can select their table after scanning"
            qrCode={mainQrCode}
            isLoading={isGeneratingMainQr}
            onCopyLink={() => handleCopyLink(mainQrCode)}
            onDownload={() => handleDownloadQr(mainQrCode)}
            icon={<Store className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Table-Specific QR Codes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Table QR Codes</h2>
            <p className="text-sm text-muted-foreground">
              Individual QR codes for each table. These pre-fill the table information for customers.
            </p>
          </div>
          {isLoadingTables && <LoadingSpinner size="sm" />}
        </div>

        {isLoadingTables ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : activeTables.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Utensils className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                No active tables found. Create tables first to generate table-specific QR codes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeTables.map((table) => {
              const isGenerating = generatingTableQrs.has(table.id);
              const hasQrCode = table.qrCode;

              return (
                <Card key={table.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        {table.displayName}
                      </CardTitle>
                      <Badge variant={table.status === 'available' ? 'default' : 'secondary'}>
                        {table.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Capacity: {table.capacity} • Zone: {table.zone || 'Default'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {hasQrCode ? (
                      <QrCodeDisplay
                        title={table.displayName}
                        description={`Table ${table.tableNumber}`}
                        qrCode={table.qrCode}
                        isLoading={false}
                        onCopyLink={() => handleCopyLink(table.qrCode)}
                        onDownload={() => handleDownloadQr(table.qrCode)}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed">
                          <QrCode className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateTableQr(table)}
                          disabled={isGenerating}
                          className="w-full"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <QrCode className="mr-2 h-3 w-3" />
                              Generate QR
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>QR Code Usage Guide</CardTitle>
          <CardDescription>
            Best practices for implementing QR codes in your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium">Main Restaurant QR</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground pl-6">
                <li>• Display at restaurant entrance</li>
                <li>• Use for takeaway/delivery orders</li>
                <li>• Customers select their table after scanning</li>
                <li>• Good for counter service areas</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-green-600" />
                <h4 className="font-medium">Table-Specific QR Codes</h4>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground pl-6">
                <li>• Place on each table for dine-in</li>
                <li>• Pre-fills table information</li>
                <li>• Streamlines the ordering process</li>
                <li>• Helps with order tracking and service</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Print QR codes on durable material and consider laminating them for longer life.
              You can also create table tents or stands to make them more visible to customers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerQrPage;