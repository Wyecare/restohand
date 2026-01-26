import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppSelector } from '@/store/hooks';
import { selectActiveRestaurantId } from '@/store/slices/authSlice';
import RestaurantSettingsPage from './RestaurantSettingsPage';
import SimpleGstSettingsPage from './SimpleGstSettingsPage';
import { Building2, Receipt } from 'lucide-react';

const SettingsPageNew = () => {
  const restaurantId = useAppSelector(selectActiveRestaurantId);
  const location = useLocation();
  const navigate = useNavigate();

  if (!restaurantId) {
    return <Navigate to="/onboarding" replace />;
  }

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/settings/gst')) return 'gst';
    return 'restaurant';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'restaurant') {
      navigate('/settings');
    } else {
      navigate(`/settings/${value}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your restaurant configuration and tax settings.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="restaurant" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Restaurant
          </TabsTrigger>
          <TabsTrigger value="gst" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            GST
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-0">
          <RestaurantSettingsPage />
        </TabsContent>

        <TabsContent value="gst" className="space-y-0">
          <SimpleGstSettingsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPageNew;
