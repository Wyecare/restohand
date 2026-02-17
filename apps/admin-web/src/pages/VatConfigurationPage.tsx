import { useState, useEffect } from 'react';
import {
  useGetActiveVatConfigurationQuery,
  useCreateVatConfigurationMutation,
  useUpdateVatConfigurationMutation,
  useActivateVatConfigurationMutation,
} from '@/store/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { Settings, Save, MapPin, Percent } from 'lucide-react';
import { StateVatConfiguration } from '@/store/api/types';

// Import states from backend enum
enum IndianState {
  ANDHRA_PRADESH = 'Andhra Pradesh',
  ARUNACHAL_PRADESH = 'Arunachal Pradesh',
  ASSAM = 'Assam',
  BIHAR = 'Bihar',
  CHHATTISGARH = 'Chhattisgarh',
  GOA = 'Goa',
  GUJARAT = 'Gujarat',
  HARYANA = 'Haryana',
  HIMACHAL_PRADESH = 'Himachal Pradesh',
  JHARKHAND = 'Jharkhand',
  KARNATAKA = 'Karnataka',
  KERALA = 'Kerala',
  MADHYA_PRADESH = 'Madhya Pradesh',
  MAHARASHTRA = 'Maharashtra',
  MANIPUR = 'Manipur',
  MEGHALAYA = 'Meghalaya',
  MIZORAM = 'Mizoram',
  NAGALAND = 'Nagaland',
  ODISHA = 'Odisha',
  PUNJAB = 'Punjab',
  RAJASTHAN = 'Rajasthan',
  SIKKIM = 'Sikkim',
  TAMIL_NADU = 'Tamil Nadu',
  TELANGANA = 'Telangana',
  TRIPURA = 'Tripura',
  UTTAR_PRADESH = 'Uttar Pradesh',
  UTTARAKHAND = 'Uttarakhand',
  WEST_BENGAL = 'West Bengal',
  DELHI = 'Delhi',
  JAMMU_AND_KASHMIR = 'Jammu and Kashmir',
  LADAKH = 'Ladakh',
  LAKSHADWEEP = 'Lakshadweep',
  PUDUCHERRY = 'Puducherry',
  ANDAMAN_AND_NICOBAR_ISLANDS = 'Andaman and Nicobar Islands',
  CHANDIGARH = 'Chandigarh',
  DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU = 'Dadra and Nagar Haveli and Daman and Diu'
}

// Default hardcoded VAT rates using enum values
const defaultStateVatRates: Record<IndianState, number> = {
  [IndianState.KARNATAKA]: 20,
  [IndianState.MAHARASHTRA]: 25,
  [IndianState.TAMIL_NADU]: 20,
  [IndianState.KERALA]: 25,
  [IndianState.DELHI]: 20,
  [IndianState.GOA]: 20,
  [IndianState.GUJARAT]: 25,
  [IndianState.RAJASTHAN]: 25,
  [IndianState.PUNJAB]: 20,
  [IndianState.HARYANA]: 25,
  [IndianState.UTTAR_PRADESH]: 20,
  [IndianState.WEST_BENGAL]: 20,
  [IndianState.ANDHRA_PRADESH]: 22,
  [IndianState.TELANGANA]: 22,
  [IndianState.MADHYA_PRADESH]: 20,
  [IndianState.CHHATTISGARH]: 20,
  [IndianState.ODISHA]: 18,
  [IndianState.BIHAR]: 18,
  [IndianState.ASSAM]: 18,
  [IndianState.JHARKHAND]: 20,
  [IndianState.HIMACHAL_PRADESH]: 18,
  [IndianState.UTTARAKHAND]: 18,
  [IndianState.JAMMU_AND_KASHMIR]: 20,
  [IndianState.ARUNACHAL_PRADESH]: 18,
  [IndianState.NAGALAND]: 18,
  [IndianState.MANIPUR]: 18,
  [IndianState.MIZORAM]: 18,
  [IndianState.TRIPURA]: 18,
  [IndianState.MEGHALAYA]: 18,
  [IndianState.SIKKIM]: 18,
  [IndianState.LADAKH]: 20,
  [IndianState.LAKSHADWEEP]: 20,
  [IndianState.PUDUCHERRY]: 20,
  [IndianState.ANDAMAN_AND_NICOBAR_ISLANDS]: 20,
  [IndianState.CHANDIGARH]: 20,
  [IndianState.DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU]: 20
};

const stateCodeMap: Record<IndianState, string> = {
  [IndianState.KARNATAKA]: 'KA',
  [IndianState.MAHARASHTRA]: 'MH',
  [IndianState.TAMIL_NADU]: 'TN',
  [IndianState.KERALA]: 'KL',
  [IndianState.DELHI]: 'DL',
  [IndianState.GOA]: 'GA',
  [IndianState.GUJARAT]: 'GJ',
  [IndianState.RAJASTHAN]: 'RJ',
  [IndianState.PUNJAB]: 'PB',
  [IndianState.HARYANA]: 'HR',
  [IndianState.UTTAR_PRADESH]: 'UP',
  [IndianState.WEST_BENGAL]: 'WB',
  [IndianState.ANDHRA_PRADESH]: 'AP',
  [IndianState.TELANGANA]: 'TG',
  [IndianState.MADHYA_PRADESH]: 'MP',
  [IndianState.CHHATTISGARH]: 'CG',
  [IndianState.ODISHA]: 'OR',
  [IndianState.BIHAR]: 'BR',
  [IndianState.ASSAM]: 'AS',
  [IndianState.JHARKHAND]: 'JH',
  [IndianState.HIMACHAL_PRADESH]: 'HP',
  [IndianState.UTTARAKHAND]: 'UK',
  [IndianState.JAMMU_AND_KASHMIR]: 'JK',
  [IndianState.ARUNACHAL_PRADESH]: 'AR',
  [IndianState.NAGALAND]: 'NL',
  [IndianState.MANIPUR]: 'MN',
  [IndianState.MIZORAM]: 'MZ',
  [IndianState.TRIPURA]: 'TR',
  [IndianState.MEGHALAYA]: 'ML',
  [IndianState.SIKKIM]: 'SK',
  [IndianState.LADAKH]: 'LA',
  [IndianState.LAKSHADWEEP]: 'LD',
  [IndianState.PUDUCHERRY]: 'PY',
  [IndianState.ANDAMAN_AND_NICOBAR_ISLANDS]: 'AN',
  [IndianState.CHANDIGARH]: 'CH',
  [IndianState.DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU]: 'DN'
};

const VatConfigurationPage = () => {
  const [stateRates, setStateRates] = useState<Record<string, number>>(defaultStateVatRates);
  const [hasChanges, setHasChanges] = useState(false);
  const [globalDefault, setGlobalDefault] = useState(20);

  const { data: activeConfig, isLoading } = useGetActiveVatConfigurationQuery();
  const [createVatConfiguration, { isLoading: creating }] = useCreateVatConfigurationMutation();
  const [updateVatConfiguration, { isLoading: updating }] = useUpdateVatConfigurationMutation();
  const [activateVatConfiguration, { isLoading: activating }] = useActivateVatConfigurationMutation();

  const { toast } = useToast();

  // Load existing configuration or defaults
  useEffect(() => {
    if (activeConfig) {
      const configRates: Record<string, number> = {};

      // Populate from existing configuration
      activeConfig.stateConfigurations.forEach(state => {
        configRates[state.stateName] = state.defaultVatRate;
      });

      // Fill missing states with defaults
      Object.keys(defaultStateVatRates).forEach(state => {
        if (!configRates[state]) {
          configRates[state] = defaultStateVatRates[state];
        }
      });

      setStateRates(configRates);
      setGlobalDefault(activeConfig.globalDefaultVatRate);
    } else {
      setStateRates(defaultStateVatRates);
    }
  }, [activeConfig]);

  const handleStateRateChange = (stateName: string, rate: number) => {
    setStateRates(prev => ({
      ...prev,
      [stateName]: rate
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const stateConfigurations: StateVatConfiguration[] = Object.entries(stateRates).map(([stateName, rate]) => ({
        stateName,
        stateCode: stateCodeMap[stateName] || stateName.substring(0, 2).toUpperCase(),
        defaultVatRate: rate,
        alcoholVatRates: [],
        isActive: true,
      }));

      const configData = {
        configurationName: 'India State VAT Configuration',
        globalDefaultVatRate: globalDefault,
        stateConfigurations,
        description: 'State-wise VAT rates for alcoholic beverages across India'
      };

      if (activeConfig) {
        // Update existing configuration
        await updateVatConfiguration({ id: activeConfig.id, data: configData }).unwrap();
        toast({
          title: 'VAT Configuration Updated',
          description: 'State VAT rates have been updated successfully',
        });
      } else {
        // Create new configuration
        const newConfig = await createVatConfiguration(configData).unwrap();
        // Activate it immediately
        await activateVatConfiguration(newConfig.id).unwrap();
        toast({
          title: 'VAT Configuration Created',
          description: 'State VAT rates have been configured and activated',
        });
      }

      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.data?.message || 'Failed to save VAT configuration',
        variant: 'destructive',
      });
    }
  };

  const resetToDefaults = () => {
    setStateRates(defaultStateVatRates);
    setGlobalDefault(20);
    setHasChanges(true);
    toast({
      title: 'Reset to Defaults',
      description: 'All state VAT rates have been reset to default values',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">State VAT Configuration</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || creating || updating || activating}
          >
            <Save className="h-4 w-4 mr-2" />
            {creating || updating || activating ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {/* Global Default */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Global Default VAT Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="globalDefault">Default rate for unconfigured states:</Label>
            <Input
              id="globalDefault"
              type="number"
              min="0"
              max="100"
              value={globalDefault}
              onChange={(e) => {
                setGlobalDefault(Number(e.target.value));
                setHasChanges(true);
              }}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </CardContent>
      </Card>

      {/* State VAT Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            State-wise Alcohol VAT Rates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure VAT rates for alcoholic beverages for each Indian state. These rates will be used in billing calculations based on the restaurant's state.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stateRates).map(([stateName, rate]) => (
              <div key={stateName} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">{stateName}</div>
                  <div className="text-xs text-muted-foreground">({stateCodeMap[stateName] || 'N/A'})</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={rate}
                    onChange={(e) => handleStateRateChange(stateName, Number(e.target.value))}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {activeConfig && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                Active Configuration: {activeConfig.configurationName}
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Last updated: {new Date(activeConfig.updatedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• When calculating alcohol VAT, the system uses the restaurant's business state</p>
          <p>• If a state-specific rate is configured, that rate is used</p>
          <p>• If no state-specific rate exists, the global default rate is used</p>
          <p>• These rates apply to all alcoholic beverages (beer, wine, spirits)</p>
          <p>• Changes take effect immediately after saving</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VatConfigurationPage;