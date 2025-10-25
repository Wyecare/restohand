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

  const handleGenerate = async () => {
    if (!role) {
      toast({ title: 'Select a role', variant: 'destructive' });
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
        title: 'Failed to generate',
        description: error.data?.message || 'Try again later',
        variant: 'destructive',
      });
    }
  };

  const handleCopyUrl = () => {
    if (!qrResult?.signupUrl) return;
    navigator.clipboard.writeText(qrResult.signupUrl);
    toast({ title: 'Copied link', description: 'Signup URL copied' });
  };

  const handleDownloadQr = () => {
    if (!qrResult?.qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrResult.qrCodeUrl;
    link.download = `staff-qr-${role}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'QR downloaded', description: 'Saved to device' });
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
            Staff QR Code
          </DialogTitle>
        </DialogHeader>

        {!qrResult ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Role *</Label>
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
              <div className="space-y-1.5">
                <Label>Validity</Label>
                <Select value={validityHours} onValueChange={setValidityHours}>
                  <SelectTrigger>
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hr</SelectItem>
                    <SelectItem value="6">6 hrs</SelectItem>
                    <SelectItem value="24">24 hrs</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                placeholder="Optional label (e.g., Front Desk)"
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
                  Generating...
                </span>
              ) : (
                'Generate'
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
                  <User className="h-4 w-4" /> Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant="secondary" className="capitalize">
                    {qrResult.role}
                  </Badge>
                </div>
                {qrResult.displayName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span>{qrResult.displayName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> Expires
                  </span>
                  <span>{new Date(qrResult.expiresAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleCopyUrl}>
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
              <Button variant="outline" onClick={handleDownloadQr}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <Button
              onClick={handleClose}
              variant="secondary"
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
