import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  ArrowLeftCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  useExtractMenuFromFileMutation,
  useBulkImportMenuMutation,
  type ExtractedMenu,
  type ExtractedCategory,
  type BulkImportResult,
} from '@/store/api/menuExtractionApi';
import { useNavigate } from 'react-router-dom';

export function PdfMenuExtractionTab() {
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedMenu, setExtractedMenu] = useState<ExtractedMenu | null>(
    null
  );
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const navigate = useNavigate();

  // RTK Query hooks
  const [extractMenuFromFile, { isLoading: isExtracting }] =
    useExtractMenuFromFileMutation();
  const [bulkImportMenu, { isLoading: isImporting }] =
    useBulkImportMenuMutation();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload a PDF file only',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'File size must be less than 10MB',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleExtractMenu = async () => {
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please upload a PDF file first',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await extractMenuFromFile(formData).unwrap();

      setExtractedMenu(result);
      setIsPreviewDialogOpen(true);

      toast({
        title: 'Success',
        description: 'Menu extracted successfully from PDF',
      });
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast({
        variant: 'destructive',
        title: 'Extraction Failed',
        description: error?.data?.message || 'Failed to extract menu from PDF',
      });
    }
  };

  const handleImportMenu = async () => {
    if (!extractedMenu) return;

    try {
      const result = await bulkImportMenu({
        categories: extractedMenu.categories,
        currency: extractedMenu.currency || 'INR',
      }).unwrap();

      // Build description with created/updated counts
      const parts: string[] = [];
      if (result.categoriesCreated > 0) {
        parts.push(`${result.categoriesCreated} categories created`);
      }
      if (result.categoriesUpdated > 0) {
        parts.push(`${result.categoriesUpdated} categories updated`);
      }
      if (result.itemsCreated > 0) {
        parts.push(`${result.itemsCreated} items created`);
      }
      if (result.itemsUpdated > 0) {
        parts.push(`${result.itemsUpdated} items updated`);
      }

      toast({
        title: 'Import Successful',
        description: parts.join(', ') || 'No changes made',
      });

      // Close dialog and reset
      setIsPreviewDialogOpen(false);
      setExtractedMenu(null);
      setSelectedFile(null);
      navigate('/menu');
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error?.data?.message || 'Failed to import menu',
      });
    }
  };

  const getTotalItemCount = (categories: ExtractedCategory[]) => {
    return categories.reduce((total, cat) => total + cat.items.length, 0);
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="cursor-default p-0"
              onClick={() => {
                navigate('/menu');
              }}
            >
              <ArrowLeftCircle className="h-8 w-8" />
              Go Back
            </Button>
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI-Powered PDF Menu Extraction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <FileText className="h-8 w-8" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-medium">Upload your PDF menu</p>
                    <p className="text-sm text-muted-foreground">
                      Our AI will automatically extract categories and items
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>PDF File</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleExtractMenu}
                  disabled={!selectedFile || isExtracting}
                  className="gap-2"
                >
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isExtracting ? 'Extracting...' : 'Extract Menu with AI'}
                </Button>

                {selectedFile && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatically extracts categories and menu items</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Detects prices and descriptions</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Supports Hindi and English menus</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Preview before importing to your menu</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Extracted Menu Preview
            </DialogTitle>
          </DialogHeader>

          {extractedMenu && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {extractedMenu.categories.length} Categories
                </Badge>
                <Badge variant="secondary">
                  {getTotalItemCount(extractedMenu.categories)} Items
                </Badge>
                {extractedMenu.currency && (
                  <Badge variant="outline">{extractedMenu.currency}</Badge>
                )}
                {extractedMenu.confidence && (
                  <Badge
                    variant={
                      extractedMenu.confidence === 'high'
                        ? 'default'
                        : extractedMenu.confidence === 'medium'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    Confidence: {extractedMenu.confidence}
                  </Badge>
                )}
              </div>

              {/* Notes */}
              {extractedMenu.notes && extractedMenu.notes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-center gap-2 text-yellow-800 font-medium mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Notes
                  </div>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    {extractedMenu.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Categories and Items */}
              <ScrollArea className="h-[400px] border rounded-md p-4">
                <Accordion type="multiple" className="w-full">
                  {extractedMenu.categories.map((category, catIdx) => (
                    <AccordionItem key={catIdx} value={`cat-${catIdx}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {category.items.length} items
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {category.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="flex items-start justify-between p-3 bg-muted/50 rounded-md"
                            >
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-green-600">
                                  ₹{item.price}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportMenu}
              disabled={isImporting || !extractedMenu}
              className="gap-2"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Import to Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
