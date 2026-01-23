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
import { useGetRestaurantQrCodeQuery } from '@/store/api/restaurantsApi';
import { useCustomerTranslation } from '@/hooks/use-translation';

interface QrCodeDisplayProps {
  title: string;
  description: string;
  qrCode: any;
  isLoading: boolean;
  onCopyLink: () => void;
  onDownload: () => void;
  icon?: React.ReactNode;
  t: (key: string, params?: any) => string;
}

const QrCodeDisplay = ({
  title,
  description,
  qrCode,
  isLoading,
  onCopyLink,
  onDownload,
  icon,
  t,
}: QrCodeDisplayProps) => (
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
              {qrCode.table
                ? t('qr.mainAccess.tableLabel', {
                    number: qrCode.table,
                  })
                : t('qr.mainAccess.generalAccess')}
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
              {t('qr.actions.copy')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="text-xs"
            >
              <Download className="mr-1 h-3 w-3" />
              {t('qr.actions.download')}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <QrCode className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('qr.actions.noQrCode')}
            </p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const CustomerQrPage = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const { toast } = useToast();
  const { t: tCustomer } = useCustomerTranslation();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  // Main restaurant QR (no table specified)
  const { data: mainQrCode, isFetching: isGeneratingMainQr } =
    useGetRestaurantQrCodeQuery(
      restaurantId ? { restaurantId, table: undefined } : skipToken
    );

  const handleCopyLink = (qrCode: any) => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode.url);
      toast({ title: tCustomer('qr.messages.linkCopied') });
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
      toast({ title: tCustomer('qr.messages.qrDownloaded') });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{tCustomer('qr.title')}</h1>
        <p className="text-muted-foreground">{tCustomer('qr.subtitle')}</p>
      </div>

      {/* Main Restaurant QR Code */}
      <div className="space-y-4">
        <div className="max-w-md">
          <QrCodeDisplay
            title={tCustomer('qr.mainAccess.title')}
            description={tCustomer('qr.mainAccess.description')}
            qrCode={mainQrCode}
            isLoading={isGeneratingMainQr}
            onCopyLink={() => handleCopyLink(mainQrCode)}
            onDownload={() => handleDownloadQr(mainQrCode)}
            icon={<Store className="h-5 w-5" />}
            t={tCustomer}
          />
        </div>
      </div>

      {/* How QR Codes Work - Explanatory Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <QrCode className="h-5 w-5" />
            {tCustomer('qr.usage.title')}
          </CardTitle>
          <CardDescription className="text-blue-700">
            {tCustomer('qr.usage.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm mb-3 text-blue-900">
                {tCustomer('qr.usage.howItWorks')}
              </h4>
              <ul className="space-y-2 text-sm ">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </span>
                  {tCustomer('qr.usage.steps.scan')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </span>
                  {tCustomer('qr.usage.steps.browse')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </span>
                  {tCustomer('qr.usage.steps.order')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                    4
                  </span>
                  {tCustomer('qr.usage.steps.notify')}
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-3 text-blue-900">
                {tCustomer('qr.usage.benefits.title')}:
              </h4>
              <ul className="space-y-2 text-sm ">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  {tCustomer('qr.usage.benefits.contactless')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  {tCustomer('qr.usage.benefits.efficient')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  {tCustomer('qr.usage.benefits.accurate')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  {tCustomer('qr.usage.benefits.convenient')}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table QR Codes Reference */}
      <Card>
        <CardHeader>
          <CardTitle>{tCustomer('qr.tableQr.title')}</CardTitle>
          <CardDescription>{tCustomer('qr.tableQr.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {tCustomer('qr.tableQr.description')}
          </p>
          <Button variant="outline" asChild>
            <Link to="/tables">
              <ExternalLink className="mr-2 h-4 w-4" />
              {tCustomer('qr.tableQr.configureButton')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerQrPage;
