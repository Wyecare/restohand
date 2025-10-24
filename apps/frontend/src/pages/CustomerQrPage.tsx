import { skipToken } from '@reduxjs/toolkit/query';
import { Navigate, Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { QrCode, Download, Copy, Store, ExternalLink } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import {
  useGetRestaurantQrCodeQuery,
} from '@/store/api/restaurantsApi';

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

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  // Main restaurant QR (no table specified)
  const { data: mainQrCode, isFetching: isGeneratingMainQr } = useGetRestaurantQrCodeQuery(
    restaurantId ? { restaurantId, table: undefined } : skipToken
  );

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


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer QR Code</h1>
        <p className="text-muted-foreground">
          Your main QR code for customers to access the digital menu and place orders.
        </p>
      </div>

      {/* Main Restaurant QR Code */}
      <div className="space-y-4">
        <div className="max-w-md">
          <QrCodeDisplay
            title="Restaurant Menu Access"
            description="Customers can select their table after scanning"
            qrCode={mainQrCode}
            isLoading={isGeneratingMainQr}
            onCopyLink={() => handleCopyLink(mainQrCode)}
            onDownload={() => handleDownloadQr(mainQrCode)}
            icon={<Store className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Table QR Codes Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Table QR Codes</CardTitle>
          <CardDescription>
            Need individual QR codes for each table?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Table-specific QR codes can be configured and generated from the Tables page.
            These QR codes pre-fill table information for a smoother customer experience.
          </p>
          <Button variant="outline" asChild>
            <Link to="/tables">
              <ExternalLink className="mr-2 h-4 w-4" />
              Configure Table QR Codes
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerQrPage;