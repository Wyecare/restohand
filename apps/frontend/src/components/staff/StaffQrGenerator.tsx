import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, QrCode, Clock, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useGenerateStaffQrMutation } from '@/store/api/staffQrApi';
import { useStaffTranslation } from '@/hooks/use-translation';

interface StaffQrGeneratorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffQrGenerator({
  isOpen,
  onOpenChange,
}: StaffQrGeneratorProps) {
  const [role, setRole] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [validityHours, setValidityHours] = useState('24');
  const [qrResult, setQrResult] = useState<any>(null);
  const { toast } = useToast();
  const [generateQr, { isLoading }] = useGenerateStaffQrMutation();
  const { t: tStaff } = useStaffTranslation();

  const handleGenerate = async () => {
    if (!role) {
      toast({ title: tStaff('messages.selectRole'), variant: 'destructive' });
      return;
    }
    try {
      const result = await generateQr({
        role,
        displayName: displayName.trim() || undefined,
        validityHours: parseInt(validityHours) || 24,
      }).unwrap();
      setQrResult(result);
    } catch (error: any) {
      toast({
        title: tStaff('messages.failedToGenerate'),
        description: error.data?.message || tStaff('messages.tryAgainLater'),
        variant: 'destructive',
      });
    }
  };

  const handleCopyUrl = () => {
    if (!qrResult?.signupUrl) return;
    navigator.clipboard.writeText(qrResult.signupUrl);
    toast({ title: tStaff('messages.copiedLink'), description: tStaff('messages.signupUrlCopied') });
  };

  const handleDownloadQr = () => {
    if (!qrResult?.qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrResult.qrCodeUrl;
    link.download = `staff-qr-${role}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: tStaff('messages.qrDownloaded'), description: tStaff('messages.savedToDevice') });
  };

  const handleClose = () => {
    setQrResult(null);
    setRole('');
    setDisplayName('');
    setValidityHours('24');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {tStaff('qr.title')}
          </DialogTitle>
        </DialogHeader>

        {!qrResult ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{tStaff('qr.roleRequired')}</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={tStaff('qr.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chef">{tStaff('roles.chef')}</SelectItem>
                    <SelectItem value="waiter">{tStaff('roles.waiter')}</SelectItem>
                    <SelectItem value="cashier">{tStaff('roles.cashier')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{tStaff('qr.validity')}</Label>
                <Select value={validityHours} onValueChange={setValidityHours}>
                  <SelectTrigger>
                    <SelectValue placeholder={tStaff('qr.duration')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tStaff('qr.durations.1hr')}</SelectItem>
                    <SelectItem value="6">{tStaff('qr.durations.6hrs')}</SelectItem>
                    <SelectItem value="24">{tStaff('qr.durations.24hrs')}</SelectItem>
                    <SelectItem value="72">{tStaff('qr.durations.3days')}</SelectItem>
                    <SelectItem value="168">{tStaff('qr.durations.1week')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{tStaff('qr.displayName')}</Label>
              <Input
                placeholder={tStaff('qr.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !role}
              className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {tStaff('qr.generating')}
                </span>
              ) : (
                tStaff('qr.generate')
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-center">
              <img
                src={qrResult.qrCodeUrl}
                alt="Staff QR"
                className="rounded-lg border shadow-sm w-48 h-48"
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" /> {tStaff('qr.details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tStaff('table.role')}</span>
                  <Badge variant="secondary" className="capitalize">
                    {qrResult.role}
                  </Badge>
                </div>
                {qrResult.displayName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tStaff('table.name')}</span>
                    <span>{qrResult.displayName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> {tStaff('qr.expires')}
                  </span>
                  <span>{new Date(qrResult.expiresAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleCopyUrl}>
                <Copy className="mr-2 h-4 w-4" />
                {tStaff('qr.copyUrl')}
              </Button>
              <Button variant="outline" onClick={handleDownloadQr}>
                <Download className="mr-2 h-4 w-4" />
                {tStaff('qr.download')}
              </Button>
            </div>

            <Button
              onClick={handleClose}
              variant="secondary"
              className="w-full"
            >
              {tStaff('buttons.close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
