import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllRestaurantsQuery } from '@/store/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Building2, Search, Eye, MapPin, Mail, Phone } from 'lucide-react';

const RestaurantsPage = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetAllRestaurantsQuery({
    page,
    limit: 10,
  });

  const filteredRestaurants = data?.restaurants?.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">Error loading restaurants</h3>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Restaurants</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {data?.pagination.total || 0} restaurants
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredRestaurants.map((restaurant) => (
          <Card key={restaurant.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{restaurant.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={restaurant.isActive ? 'default' : 'destructive'}
                      >
                        {restaurant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Since {new Date(restaurant.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{restaurant.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{restaurant.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {restaurant.address.city}, {restaurant.address.state}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
            disabled={page >= data.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage;