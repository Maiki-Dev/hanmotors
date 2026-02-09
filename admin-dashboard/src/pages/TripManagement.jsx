import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, MapPin, Plus, Car, Pencil, Trash2, MoreHorizontal, Type, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { CarIdle, CarMoving } from '../components/CarIcons';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Dynamic Car Icon Generator
const createDriverIcon = (heading = 0, isMoving = false) => {
  const IconComponent = isMoving ? CarMoving : CarIdle;
  const html = renderToStaticMarkup(
    <div style={{ 
      transform: `rotate(${heading}deg)`, 
      width: '50px', 
      height: '50px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      transition: 'transform 0.5s ease-in-out' // Smooth rotation
    }}>
      <IconComponent width={50} height={50} />
    </div>
  );
  
  return L.divIcon({
    className: 'custom-car-marker', // Add a class for potential CSS targeting
    html: html,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../components/ui/dropdown-menu";
import api, { socket } from '../services/api';
import { cn } from "../lib/utils";
import { useToast } from '../context/ToastContext';

const fetchAddress = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'mn'
        }
      });
      const data = await response.json();
      return data.display_name || `Map (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (error) {
      console.error('Error fetching address:', error);
      return `Map (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };

  const LocationPicker = ({ position, onLocationSelect }) => {
    const map = useMapEvents({
      click(e) {
        onLocationSelect(e.latlng);
      },
    });

    return position && position.lat ? <Marker position={position} /> : null;
  };

  const RouteVisualizer = ({ coordinates }) => {
    const map = useMap();
  
    useEffect(() => {
      if (coordinates && coordinates.length > 0) {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [coordinates, map]);
  
    return coordinates ? <Polyline positions={coordinates} color="#2563eb" weight={5} opacity={0.7} /> : null;
  };

const TripManagement = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeDrivers, setActiveDrivers] = useState({});
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [additionalServices, setAdditionalServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Socket Listeners
  useEffect(() => {
    socket.emit('adminJoin'); // Ensure we join admin room

    socket.on('allDriverLocations', (locations) => {
      setActiveDrivers(locations);
    });

    socket.on('driverLocationUpdated', ({ driverId, location }) => {
      setActiveDrivers(prev => ({
        ...prev,
        [driverId]: location
      }));
    });

    socket.on('newJobRequest', (newTrip) => {
      setTrips(prev => {
        if (prev.find(t => t._id === newTrip._id)) return prev;
        return [newTrip, ...prev];
      });
    });

    socket.on('tripUpdated', (updatedTrip) => {
      setTrips(prev => prev.map(t => t._id === updatedTrip._id ? updatedTrip : t));
    });

    socket.on('tripDeleted', ({ tripId }) => {
      setTrips(prev => prev.filter(t => t._id !== tripId));
    });
    
    // Additional listener for status updates that might come as different events
    socket.on('driverAccepted', ({ tripId, driverId }) => {
       // Ideally we should fetch or update local state if we don't get the full trip object
       // But we added tripUpdated emission in backend, so this might be redundant but safe
       fetchData();
    });

    return () => {
      socket.off('newJobRequest');
      socket.off('tripUpdated');
      socket.off('tripDeleted');
      socket.off('driverAccepted');
    };
  }, []);

  // Create Trip State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({
    pickupLocation: { address: '', lat: 47.9188, lng: 106.9176 },
    dropoffLocation: { address: '', lat: 47.90, lng: 106.90 },
    price: '',
    serviceType: 'Tow',
    vehicleModel: '',
    hasDamage: false,
    pickupMode: 'text',
    dropoffMode: 'text',
    customerName: '',
    customerPhone: '',
    distance: '',
    duration: '',
    additionalServices: []
  });

  // Edit Trip State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  // Assign Driver State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchRoutes = async (start, end) => {
    try {
      // Using OSRM for routing (Open Source Routing Machine) - Free and accurate for driving
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes) {
        const routes = data.routes.map(r => ({
          distance: (r.distance / 1000).toFixed(1), // meters to km
          duration: (r.duration / 60).toFixed(0), // seconds to minutes
          name: r.legs[0]?.summary || 'Route',
          coordinates: r.geometry.coordinates.map(coord => [coord[1], coord[0]]) // Swap [lng, lat] to [lat, lng]
        }));
        
        setRouteOptions(routes);
        setSelectedRouteIndex(0);
        
        // Auto select first route's distance
        if (routes.length > 0) {
          setNewTrip(prev => ({ ...prev, distance: routes[0].distance, duration: routes[0].duration }));
        }
      } else {
        // Fallback to Haversine
        const dist = getDistanceFromLatLonInKm(start.lat, start.lng, end.lat, end.lng);
        setRouteOptions([]);
        setNewTrip(prev => ({ ...prev, distance: dist.toFixed(1), duration: Math.round(dist * 2) }));
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
      // Fallback to Haversine
      const dist = getDistanceFromLatLonInKm(start.lat, start.lng, end.lat, end.lng);
      setRouteOptions([]);
      setNewTrip(prev => ({ ...prev, distance: dist.toFixed(1), duration: Math.round(dist * 2) }));
    }
  };

  // Auto-calculate distance when map locations change
  useEffect(() => {
    if (newTrip.pickupMode === 'map' && newTrip.dropoffMode === 'map' &&
        newTrip.pickupLocation.lat && newTrip.dropoffLocation.lat) {
      
      fetchRoutes(newTrip.pickupLocation, newTrip.dropoffLocation);
    }
  }, [newTrip.pickupLocation, newTrip.dropoffLocation, newTrip.pickupMode, newTrip.dropoffMode]);

  // Auto-calculate price based on vehicle type and distance
  useEffect(() => {
    if (newTrip.distance) {
      const dist = Number(newTrip.distance);
      let calculatedPrice = 0;
      
      const selectedRule = vehicleTypes.find(v => v.vehicleType === newTrip.vehicleModel);
      
      if (selectedRule) {
        calculatedPrice = selectedRule.basePrice;
        if (dist > 4) {
          calculatedPrice += (dist - 4) * selectedRule.pricePerKm;
        }
      } else if (newTrip.serviceType === 'Tow') {
        // Fallback to default logic
        calculatedPrice = 80000;
        if (dist > 4 && dist <= 20) {
          calculatedPrice += (dist - 4) * 10000;
        } else if (dist > 20) {
          calculatedPrice += (16 * 10000) + (dist - 20) * 5000;
        }
      }

      // Add additional services price
      if (newTrip.selectedServices && newTrip.selectedServices.length > 0) {
        newTrip.selectedServices.forEach(serviceId => {
          const service = additionalServices.find(s => s._id === serviceId);
          if (service) {
            calculatedPrice += service.price;
          }
        });
      }
      
      if (calculatedPrice > 0) {
        setNewTrip(prev => ({ ...prev, price: calculatedPrice.toString() }));
      }
    }
  }, [newTrip.distance, newTrip.serviceType, newTrip.vehicleModel, vehicleTypes, newTrip.selectedServices, additionalServices]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tripsRes, driversRes, pricingRes, servicesRes] = await Promise.all([
        api.get('/admin/trips'),
        api.get('/admin/drivers'),
        api.get('/admin/pricing'),
        api.get('/admin/additional-services')
      ]);
      setTrips(tripsRes.data);
      setDrivers(driversRes.data.filter(d => d.status === 'active')); // Only active drivers
      setVehicleTypes(pricingRes.data);
      setAdditionalServices(servicesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Алдаа",
        description: "Өгөгдөл татахад алдаа гарлаа",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    try {
      // Prepare additional services
      const selectedServiceObjects = (newTrip.selectedServices || []).map(id => {
        const service = additionalServices.find(s => s._id === id);
        return service ? { name: service.name, price: service.price } : null;
      }).filter(Boolean);

      const payload = {
        pickupLocation: newTrip.pickupLocation,
        dropoffLocation: newTrip.dropoffLocation,
        price: Number(newTrip.price),
        distance: Number(newTrip.distance),
        duration: Number(newTrip.duration),
        serviceType: newTrip.serviceType,
        vehicleModel: newTrip.vehicleModel,
        hasDamage: newTrip.hasDamage === 'true' || newTrip.hasDamage === true,
        customerName: newTrip.customerName,
        customerPhone: newTrip.customerPhone,
        additionalServices: selectedServiceObjects
      };
      
      await api.post('/trip/request', payload);
      setIsCreateOpen(false);
      fetchData(); // Refresh list
      // Reset form
      setNewTrip({
        pickupLocation: { address: '', lat: 47.9188, lng: 106.9176 },
        dropoffLocation: { address: '', lat: 47.90, lng: 106.90 },
        price: '',
        distance: '',
        serviceType: 'Tow',
        vehicleModel: '',
        selectedServices: [],
        hasDamage: false,
        pickupMode: 'text',
        dropoffMode: 'text',
        customerName: '',
        customerPhone: ''
      });
      toast({
        title: "Амжилттай",
        description: "Шинэ дуудлага бүртгэгдлээ",
        status: "success"
      });
    } catch (error) {
      console.error("Error creating trip:", error);
      toast({
        title: "Алдаа",
        description: "Дуудлага үүсгэхэд алдаа гарлаа: " + error.message,
        status: "error"
      });
    }
  };

  const handleEditTrip = async () => {
    if (!editingTrip) return;
    try {
      const payload = {
        pickupLocation: editingTrip.pickupLocation,
        dropoffLocation: editingTrip.dropoffLocation,
        price: Number(editingTrip.price),
        serviceType: editingTrip.serviceType,
        status: editingTrip.status, // Allow status updates
      };
      
      await api.put(`/trip/${editingTrip._id}`, payload);
      setIsEditOpen(false);
      setEditingTrip(null);
      fetchData();
      toast({
        title: "Амжилттай",
        description: "Дуудлага амжилттай хадгалагдлаа",
        status: "success"
      });
    } catch (error) {
      console.error("Error updating trip:", error);
      toast({
        title: "Алдаа",
        description: "Алдаа гарлаа: " + error.message,
        status: "error"
      });
    }
  };

  const handleStatusChange = async (tripId, newStatus) => {
    try {
      await api.put(`/trip/${tripId}`, { status: newStatus });
      fetchData();
      toast({
        title: "Амжилттай",
        description: `Дуудлагын төлөв ${newStatus} болж өөрчлөгдлөө`,
        status: "success"
      });
    } catch (error) {
      console.error("Error changing status:", error);
      toast({
        title: "Алдаа",
        description: "Төлөв өөрчлөхөд алдаа гарлаа: " + error.message,
        status: "error"
      });
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm("Та энэ дуудлагыг устгахдаа итгэлтэй байна уу? Жолоочийн жагсаалтаас мөн устах болно.")) return;
    
    try {
      await api.delete(`/trip/${tripId}`);
      fetchData();
      toast({
        title: "Амжилттай",
        description: "Дуудлага устгагдлаа",
        status: "success"
      });
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast({
        title: "Алдаа",
        description: "Алдаа гарлаа: " + error.message,
        status: "error"
      });
    }
  };

  const openEditDialog = (trip) => {
    setEditingTrip({
      ...trip,
      price: trip.price.toString() // Ensure string for input
    });
    setIsEditOpen(true);
  };

  const handleAssignDriver = async () => {
    if (!selectedTrip || !selectedDriverId) return;
    try {
      await api.post(`/trip/${selectedTrip._id}/assign`, { driverId: selectedDriverId });
      setIsAssignOpen(false);
      setSelectedTrip(null);
      setSelectedDriverId('');
      fetchData();
      toast({
        title: "Амжилттай",
        description: "Жолоочид хуваарилагдлаа",
        status: "success"
      });
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast({
        title: "Алдаа",
        description: "Алдаа гарлаа: " + error.message,
        status: "error"
      });
    }
  };

  const openAssignDialog = (trip) => {
    setSelectedTrip(trip);
    setIsAssignOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-600">Дууссан</Badge>;
      case 'active': 
      case 'in_progress': return <Badge className="bg-blue-600">Идэвхтэй</Badge>;
      case 'pending': return <Badge className="bg-yellow-600">Хүлээгдэж буй</Badge>;
      case 'accepted': return <Badge className="bg-indigo-600">Хүлээн авсан</Badge>;
      case 'cancelled': return <Badge variant="destructive">Цуцлагдсан</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTrips = trips.filter(trip => 
    activeTab === 'all' ? true : trip.status === activeTab || (activeTab === 'active' && (trip.status === 'in_progress' || trip.status === 'accepted'))
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Дуудлагын удирдлага</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Шинэ дуудлага
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Хүлээгдэж буй</TabsTrigger>
          <TabsTrigger value="active">Идэвхтэй</TabsTrigger>
          <TabsTrigger value="completed">Дууссан</TabsTrigger>
          <TabsTrigger value="cancelled">Цуцлагдсан</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Дуудлагын жагсаалт</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Байршил</TableHead>
                    <TableHead>Төрөл</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Хугацаа</TableHead>
                    <TableHead>Үнэ</TableHead>
                    <TableHead>Жолооч</TableHead>
                    <TableHead>Огноо</TableHead>
                    <TableHead>Төлөв</TableHead>
                    <TableHead className="w-[100px]">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                        Одоогоор энэ төлөвтэй дуудлага алга байна.
                      </TableCell>
                    </TableRow>
                  ) : filteredTrips.map((trip) => (
                    <TableRow key={trip._id}>
                      <TableCell className="font-medium">{trip._id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                            <span className="flex items-center text-muted-foreground"><MapPin className="h-3 w-3 mr-1"/> {trip.pickupLocation?.address || 'N/A'}</span>
                            <span className="flex items-center mt-1 text-muted-foreground"><MapPin className="h-3 w-3 mr-1 text-primary"/> {trip.dropoffLocation?.address || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{trip.serviceType}</TableCell>
                      <TableCell>{trip.traveledDistance ? trip.traveledDistance.toFixed(1) : trip.distance} км</TableCell>
                      <TableCell>{trip.duration ? `${trip.duration} мин` : '-'}</TableCell>
                      <TableCell>{(trip.price || 0).toLocaleString()}₮</TableCell>
                      <TableCell>{trip.driver ? (trip.driver.name || trip.driver.phone || 'Unknown') : '-'}</TableCell>
                      <TableCell>{new Date(trip.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(trip.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Цэс нээх</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Үйлдэл</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {trip.status === 'pending' && !trip.driver && (
                              <DropdownMenuItem onClick={() => openAssignDialog(trip)}>
                                Жолооч хуваарилах
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditDialog(trip)}>
                              Засах
                            </DropdownMenuItem>
                            
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Төлөв өөрчлөх</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleStatusChange(trip._id, 'pending')}>
                                  Хүлээгдэж буй
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(trip._id, 'accepted')}>
                                  Хүлээн авсан
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(trip._id, 'in_progress')}>
                                  Явж буй
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(trip._id, 'completed')}>
                                  Дууссан
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(trip._id, 'cancelled')}>
                                  Цуцлагдсан
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTrip(trip._id)}>
                              Устгах
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </Tabs>

      <div className="h-[400px] w-full rounded-md border overflow-hidden relative z-0 shadow-sm bg-white mb-6">
        <MapContainer 
          center={[47.9188, 106.9176]} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/intl/mn/help/terms_maps.html">Google Maps</a>'
            url="http://mt0.google.com/vt/lyrs=m&hl=mn&x={x}&y={y}&z={z}"
          />
          {Object.entries(activeDrivers).map(([driverId, location]) => (
            location && location.lat && (
              <Marker 
                key={driverId} 
                position={[location.lat, location.lng]} 
                icon={createDriverIcon(location.heading || 0, (location.speed && location.speed > 0.5))}
              >
                <Popup>
                  <div className="text-xs min-w-[120px]">
                    <div className="font-bold border-b pb-1 mb-1">Машин мэдээлэл</div>
                    <div className="grid grid-cols-[60px_1fr] gap-1">
                      <span className="text-gray-500">Дугаар:</span>
                      <span className="font-medium">{location.plateNumber || '-'}</span>
                      
                      <span className="text-gray-500">Загвар:</span>
                      <span className="font-medium">{location.vehicleModel || '-'}</span>
                      
                      <span className="text-gray-500">Өнгө:</span>
                      <span className="font-medium">{location.vehicleColor || '-'}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
        <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded shadow-md border text-xs">
          <div className="font-semibold mb-1">Тайлбар</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm"></div>
            <span>Жолооч ({Object.keys(activeDrivers).length})</span>
          </div>
        </div>
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Шинэ дуудлага бүртгэх</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Customer & Pickup Section */}
            <div className="rounded-lg border p-4 bg-muted/20 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <MapPin className="h-4 w-4" /> Үйлчлүүлэгчийн авах цэг
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                   <Label htmlFor="customerName" className="text-xs">Нэр</Label>
                   <Input 
                      id="customerName" 
                      placeholder="Нэр" 
                      value={newTrip.customerName}
                      onChange={(e) => setNewTrip({...newTrip, customerName: e.target.value})}
                      className="h-8"
                   />
                 </div>
                 <div className="grid gap-2">
                   <Label htmlFor="customerPhone" className="text-xs">Утас</Label>
                   <Input 
                      id="customerPhone" 
                      placeholder="Утас" 
                      value={newTrip.customerPhone}
                      onChange={(e) => setNewTrip({...newTrip, customerPhone: e.target.value})}
                      className="h-8"
                   />
                 </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pickup" className="text-xs">Хаяг байршил</Label>
                  <div className="flex items-center rounded-lg border bg-muted p-1 h-7">
                    <button 
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-0.5 text-[10px] font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        newTrip.pickupMode === 'text' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                      )}
                      onClick={() => setNewTrip({...newTrip, pickupMode: 'text'})}
                    >
                      <Type className="h-3 w-3" /> Бичих
                    </button>
                    <button 
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-0.5 text-[10px] font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        newTrip.pickupMode === 'map' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                      )}
                      onClick={() => setNewTrip({...newTrip, pickupMode: 'map'})}
                    >
                      <MapIcon className="h-3 w-3" /> Газрын зураг
                    </button>
                  </div>
                </div>
                {newTrip.pickupMode === 'text' ? (
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="pickup"
                      value={newTrip.pickupLocation.address}
                      onChange={(e) => setNewTrip({...newTrip, pickupLocation: {...newTrip.pickupLocation, address: e.target.value}})}
                      placeholder="Сүхбаатар талбай"
                      className="pl-9"
                    />
                  </div>
                ) : (
                  <div className="h-64 w-full rounded-md border overflow-hidden relative z-0">
                    <MapContainer 
                      center={[newTrip.pickupLocation.lat || 47.9188, newTrip.pickupLocation.lng || 106.9176]} 
                      zoom={13} 
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.google.com/intl/mn/help/terms_maps.html">Google Maps</a>'
                        url="http://mt0.google.com/vt/lyrs=m&hl=mn&x={x}&y={y}&z={z}"
                      />
                      <RouteVisualizer coordinates={routeOptions[selectedRouteIndex]?.coordinates} />
                      <LocationPicker 
                        position={newTrip.pickupLocation} 
                        onLocationSelect={async (latlng) => {
                          setNewTrip(prev => ({
                            ...prev, 
                            pickupLocation: {
                              ...prev.pickupLocation,
                              lat: latlng.lat,
                              lng: latlng.lng,
                              address: "Хаяг уншиж байна..."
                            }
                          }));
                          const address = await fetchAddress(latlng.lat, latlng.lng);
                          setNewTrip(prev => ({
                            ...prev, 
                            pickupLocation: {
                              ...prev.pickupLocation,
                              lat: latlng.lat,
                              lng: latlng.lng,
                              address: address
                            }
                          }));
                        }} 
                      />
                    </MapContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dropoff">Хүргэх хаяг</Label>
                <div className="flex items-center rounded-lg border bg-muted p-1 h-8">
                  <button 
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      newTrip.dropoffMode === 'text' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                    onClick={() => setNewTrip({...newTrip, dropoffMode: 'text'})}
                  >
                    <Type className="h-3 w-3" /> Бичих
                  </button>
                  <button 
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      newTrip.dropoffMode === 'map' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                    onClick={() => setNewTrip({...newTrip, dropoffMode: 'map'})}
                  >
                    <MapIcon className="h-3 w-3" /> Газрын зураг
                  </button>
                </div>
              </div>
              {newTrip.dropoffMode === 'text' ? (
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="dropoff"
                    value={newTrip.dropoffLocation.address}
                    onChange={(e) => setNewTrip({...newTrip, dropoffLocation: {...newTrip.dropoffLocation, address: e.target.value}})}
                    placeholder="Зайсан"
                    className="pl-9"
                  />
                </div>
              ) : (
                <div className="h-64 w-full rounded-md border overflow-hidden relative z-0">
                  <MapContainer 
                    center={[newTrip.dropoffLocation.lat || 47.90, newTrip.dropoffLocation.lng || 106.90]} 
                    zoom={13} 
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.google.com/intl/mn/help/terms_maps.html">Google Maps</a>'
                      url="http://mt0.google.com/vt/lyrs=m&hl=mn&x={x}&y={y}&z={z}"
                    />
                    <RouteVisualizer coordinates={routeOptions[selectedRouteIndex]?.coordinates} />
                    <LocationPicker 
                      position={newTrip.dropoffLocation} 
                      onLocationSelect={async (latlng) => {
                        setNewTrip(prev => ({
                          ...prev, 
                          dropoffLocation: {
                            ...prev.dropoffLocation,
                            lat: latlng.lat,
                            lng: latlng.lng,
                            address: "Хаяг уншиж байна..."
                          }
                        }));
                        const address = await fetchAddress(latlng.lat, latlng.lng);
                        setNewTrip(prev => ({
                          ...prev, 
                          dropoffLocation: {
                            ...prev.dropoffLocation,
                            lat: latlng.lat,
                            lng: latlng.lng,
                            address: address
                          }
                        }));
                      }} 
                    />
                  </MapContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {routeOptions.length > 0 && (
                <div className="col-span-2 mb-2">
                  <Label className="mb-2 block">Зам сонгох (Driving Route)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {routeOptions.map((route, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "border rounded-lg p-3 cursor-pointer transition-all flex flex-col items-center min-w-[100px]",
                          selectedRouteIndex === index ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : "hover:bg-muted"
                        )}
                        onClick={() => {
                          setSelectedRouteIndex(index);
                          setNewTrip(prev => ({...prev, distance: route.distance}));
                        }}
                      >
                        <span className="font-bold text-lg">{route.distance} км</span>
                        <span className="text-xs text-muted-foreground">{route.duration} мин</span>
                        {route.name && <span className="text-[10px] text-muted-foreground mt-1 max-w-[100px] truncate">{route.name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="distance">Зай (км)</Label>
                <Input 
                  id="distance"
                  type="number"
                  value={newTrip.distance}
                  onChange={(e) => setNewTrip({...newTrip, distance: e.target.value})}
                  placeholder="5.5"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Үнэ (₮)</Label>
                <Input 
                  id="price"
                  type="number"
                  value={newTrip.price}
                  onChange={(e) => setNewTrip({...newTrip, price: e.target.value})}
                  placeholder="15000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="serviceType">Үйлчилгээний төрөл</Label>
                <select
                  id="serviceType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newTrip.serviceType}
                  onChange={(e) => setNewTrip({...newTrip, serviceType: e.target.value})}
                >
                  <option value="Tow">Tow (Ачилт)</option>
                  <option value="taxi">Taxi (Такси)</option>
                  <option value="delivery">Delivery (Хүргэлт)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicle">Машины төрөл</Label>
                <div className="relative">
                  <Car className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <select
                    id="vehicle"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newTrip.vehicleModel}
                    onChange={(e) => setNewTrip({...newTrip, vehicleModel: e.target.value})}
                    disabled={newTrip.serviceType !== 'Tow'}
                  >
                    <option value="">Сонгоно уу</option>
                    {vehicleTypes.map((v) => (
                      <option key={v._id} value={v.vehicleType}>
                        {v.vehicleType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
               <Label className="mb-2">Нэмэлт үйлчилгээ</Label>
               <div className="grid grid-cols-2 gap-4">
                 {additionalServices.map((service) => (
                   <div key={service._id} className="flex items-center space-x-2">
                     <Checkbox 
                       id={`service-${service._id}`}
                       checked={newTrip.selectedServices?.includes(service._id) || false}
                       onCheckedChange={(checked) => {
                          setNewTrip(prev => ({
                            ...prev,
                            selectedServices: checked 
                              ? [...(prev.selectedServices || []), service._id]
                              : (prev.selectedServices || []).filter(id => id !== service._id)
                          }));
                       }}
                     />
                     <Label htmlFor={`service-${service._id}`}>{service.name}</Label>
                   </div>
                 ))}
               </div>
            </div>

            <div className="grid gap-2">
               <Label htmlFor="damage">Эвдрэл гэмтэл байгаа эсэх</Label>
               <select 
                 id="damage"
                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 value={newTrip.hasDamage ? "true" : "false"}
                 onChange={(e) => setNewTrip({...newTrip, hasDamage: e.target.value === 'true'})}
               >
                 <option value="false">Үгүй</option>
                 <option value="true">Тийм</option>
               </select>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Болих</Button>
            <Button onClick={handleCreateTrip}>Бүртгэх</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Дуудлага засах</DialogTitle>
          </DialogHeader>
          {editingTrip && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-pickup">Авах хаяг</Label>
                <div className="relative">
                   <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                    id="edit-pickup"
                    value={editingTrip.pickupLocation.address}
                    onChange={(e) => setEditingTrip({...editingTrip, pickupLocation: {...editingTrip.pickupLocation, address: e.target.value}})}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-dropoff">Хүргэх хаяг</Label>
                <div className="relative">
                   <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                    id="edit-dropoff"
                    value={editingTrip.dropoffLocation.address}
                    onChange={(e) => setEditingTrip({...editingTrip, dropoffLocation: {...editingTrip.dropoffLocation, address: e.target.value}})}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Үнэ (₮)</Label>
                <Input 
                  id="edit-price"
                  type="number"
                  value={editingTrip.price}
                  onChange={(e) => setEditingTrip({...editingTrip, price: e.target.value})}
                />
              </div>
              {/* Could add Service Type and Status editing here if needed */}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Болих</Button>
            <Button onClick={handleEditTrip}>Хадгалах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Driver Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Жолооч хуваарилах</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="assign-driver">Жолооч сонгох</Label>
              <div className="relative">
                 <Car className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <select 
                    id="assign-driver"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                  >
                    <option value="">Жолооч сонгоно уу</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>
                        {d.name || d.phone} ({d.isOnline ? 'Online' : 'Offline'}) - {d.vehicle?.plateNumber}
                      </option>
                    ))}
                  </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Болих</Button>
            <Button onClick={handleAssignDriver} disabled={!selectedDriverId}>Хуваарилах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripManagement;
