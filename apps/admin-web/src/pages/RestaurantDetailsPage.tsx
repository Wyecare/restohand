import { useParams, useNavigate } from 'react-router-dom';
import { useGetRestaurantDetailsQuery } from '@/store/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Building2, ArrowLeft, Mail, Phone, MapPin, Calendar, DollarSign } from 'lucide-react';

const RestaurantDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: restaurant, isLoading, error } = useGetRestaurantDetailsQuery(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">Restaurant not found</h3>
          <p className="text-muted-foreground">The restaurant you're looking for doesn't exist</p>
          <Button onClick={() => navigate('/restaurants')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Restaurants
          </Button>
        </div>
      </div>
    );
  }

  const totalOrders = Object.values(restaurant.orderStats || {}).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/restaurants')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          </div>
        </div>
        <Badge
          variant={restaurant.isActive ? 'default' : 'destructive'}
        >
          {restaurant.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{restaurant.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{restaurant.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {new Date(restaurant.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p>{restaurant.address.street}</p>
                <p>
                  {restaurant.address.city}, {restaurant.address.state} {restaurant.address.postalCode}
                </p>
                <p>{restaurant.address.country}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                ₹{restaurant.revenue?.toLocaleString() || '0'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total revenue generated</p>
          </CardContent>
        </Card>

        {/* Order Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Order Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Orders</span>
                <span className="text-lg font-bold">{totalOrders}</span>
              </div>
              {restaurant.orderStats && Object.entries(restaurant.orderStats).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Management Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/settlements?restaurant=${restaurant.id}`)}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            View Settlements
          </Button>
          <Button variant="outline" disabled>
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantDetailsPage;