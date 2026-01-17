import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, List, Plus, FileText } from 'lucide-react';
import { CategoriesTab } from './tabs/CategoriesTab';
import { PdfMenuExtractionTab } from './tabs/PdfMenuExtractionTab';

export function MenuManagementPage() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
          <ChefHat className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant's menu categories, items, and pricing
          </p>
        </div>
      </div>


      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Categories & Items
          </TabsTrigger>
          <TabsTrigger value="pdf-extraction" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF Extraction
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="pdf-extraction" className="space-y-4">
          <PdfMenuExtractionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}