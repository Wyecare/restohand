import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, QrCode, Clock, User, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useGenerateStaffQrMutation } from '@/store/api/staffQrApi';

interface StaffQrGeneratorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffQrGenerator({ isOpen, onOpenChange }: StaffQrGeneratorProps) {
  const [role, setRole] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [validityHours, setValidityHours] = useState('24');
  const [qrResult, setQrResult] = useState<any>(null);
  const { toast } = useToast();

  const [generateQr, { isLoading }] = useGenerateStaffQrMutation();

  const handleGenerate = async () => {
    if (!role) {
      toast({
        title: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await generateQr({
        role,
        displayName: displayName.trim() || undefined,
        validityHours: parseInt(validityHours) || 24,
      }).unwrap();

      setQrResult(result);

      toast({
        title: 'QR Code Generated',
        description: 'Staff can now scan this QR code to join your restaurant',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to generate QR code',
        description: error.data?.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleCopyUrl = () => {
    if (qrResult?.signupUrl) {
      navigator.clipboard.writeText(qrResult.signupUrl);
      toast({
        title: 'URL copied',
        description: 'Signup URL has been copied to clipboard',
      });
    }
  };

  const handleDownloadQr = () => {
    if (qrResult?.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrResult.qrCodeUrl;
      link.download = `staff-qr-${role}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'QR Code downloaded',
        description: 'You can now print or share the QR code',
      });
    }
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Generate Staff QR Code
          </DialogTitle>
          <DialogDescription>
            Create a QR code for staff to scan and join your restaurant instantly
          </DialogDescription>
        </DialogHeader>

        {!qrResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Staff Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity">Validity (hours)</Label>
                <Select value={validityHours} onValueChange={setValidityHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                placeholder="e.g., Kitchen Chef, Front Desk Cashier"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>No SMS costs!</strong> This QR code uses Firebase's free phone authentication.
                Staff will only receive verification codes directly from Firebase.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !role}
              className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Generating QR Code...
                </span>
              ) : (
                'Generate QR Code'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <img
                src={qrResult.qrCodeUrl}
                alt="Staff QR Code"
                className="mx-auto border rounded-lg shadow-sm"
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  QR Code Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Badge variant="secondary" className="capitalize">{qrResult.role}</Badge>
                </div>

                {qrResult.displayName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Display Name:</span>
                    <span className="text-sm font-medium">{qrResult.displayName}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires:
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(qrResult.expiresAt).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleCopyUrl} className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copy URL
              </Button>
              <Button variant="outline" onClick={handleDownloadQr} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download QR
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-center">
                <strong>Instructions:</strong> Staff should scan this QR code with their phone camera or any QR scanner app.
                They'll be redirected to complete registration with their phone number.
              </AlertDescription>
            </Alert>

            <Button onClick={handleClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}