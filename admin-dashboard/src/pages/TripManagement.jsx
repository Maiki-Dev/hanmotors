import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, MapPin, Plus, Car, Pencil, Trash2, MoreHorizontal, Type, Map as MapIcon } from 'lucide-react';
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

const TripManagement = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Socket Listeners
  useEffect(() => {
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
    customerPhone: ''
  });

  // Edit Trip State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  // Assign Driver State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

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
      
      if (calculatedPrice > 0) {
        setNewTrip(prev => ({ ...prev, price: calculatedPrice.toString() }));
      }
    }
  }, [newTrip.distance, newTrip.serviceType, newTrip.vehicleModel, vehicleTypes]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tripsRes, driversRes, pricingRes] = await Promise.all([
        api.get('/admin/trips'),
        api.get('/admin/drivers'),
        api.get('/admin/pricing')
      ]);
      setTrips(tripsRes.data);
      setDrivers(driversRes.data.filter(d => d.status === 'active')); // Only active drivers
      setVehicleTypes(pricingRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    try {
      const payload = {
        pickupLocation: newTrip.pickupLocation,
        dropoffLocation: newTrip.dropoffLocation,
        price: Number(newTrip.price),
        distance: Number(newTrip.distance),
        serviceType: newTrip.serviceType,
        vehicleModel: newTrip.vehicleModel,
        hasDamage: newTrip.hasDamage === 'true' || newTrip.hasDamage === true,
        // You might want to add customer info to Trip model if needed, 
        // currently using simplified model
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
        hasDamage: false,
        pickupMode: 'text',
        dropoffMode: 'text',
        customerName: '',
        customerPhone: ''
      });
    } catch (error) {
      console.error("Error creating trip:", error);
      alert("Алдаа гарлаа: " + error.message);
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
      alert("Амжилттай хадгалагдлаа!");
    } catch (error) {
      console.error("Error updating trip:", error);
      alert("Алдаа гарлаа: " + error.message);
    }
  };

  const handleStatusChange = async (tripId, newStatus) => {
    try {
      await api.put(`/trip/${tripId}`, { status: newStatus });
      fetchData();
      // No alert needed for quick status change unless error
    } catch (error) {
      console.error("Error changing status:", error);
      alert("Төлөв өөрчлөхөд алдаа гарлаа: " + error.message);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm("Та энэ дуудлагыг устгахдаа итгэлтэй байна уу? Жолоочийн жагсаалтаас мөн устах болно.")) return;
    
    try {
      await api.delete(`/trip/${tripId}`);
      fetchData();
      alert("Дуудлага устгагдлаа!");
    } catch (error) {
      console.error("Error deleting trip:", error);
      alert("Алдаа гарлаа: " + error.message);
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
      alert("Жолоочид хуваарилагдлаа!");
    } catch (error) {
      console.error("Error assigning driver:", error);
      alert("Алдаа гарлаа: " + error.message);
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

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger isActive={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>Хүлээгдэж буй</TabsTrigger>
          <TabsTrigger isActive={activeTab === 'active'} onClick={() => setActiveTab('active')}>Идэвхтэй</TabsTrigger>
          <TabsTrigger isActive={activeTab === 'completed'} onClick={() => setActiveTab('completed')}>Дууссан</TabsTrigger>
          <TabsTrigger isActive={activeTab === 'cancelled'} onClick={() => setActiveTab('cancelled')}>Цуцлагдсан</TabsTrigger>
        </TabsList>

        <TabsContent isActive={true} className="mt-4">
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
                    <TableHead>Жолооч</TableHead>
                    <TableHead>Огноо</TableHead>
                    <TableHead>Төлөв</TableHead>
                    <TableHead className="w-[100px]">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
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
        </TabsContent>
      </Tabs>

      {/* Create Trip Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Шинэ дуудлага бүртгэх</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pickup">Авах хаяг</Label>
                <div className="flex items-center rounded-lg border bg-muted p-1 h-8">
                  <button 
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      newTrip.pickupMode === 'text' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                    onClick={() => setNewTrip({...newTrip, pickupMode: 'text'})}
                  >
                    <Type className="h-3 w-3" /> Бичих
                  </button>
                  <button 
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                <div className="h-24 w-full rounded-md border border-dashed border-input bg-muted/50 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2 hover:bg-muted/80 transition-colors cursor-pointer">
                  <MapPin className="h-6 w-6 opacity-50" />
                  <span>Газрын зураг дээр сонгох</span>
                </div>
              )}
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
                <div className="h-24 w-full rounded-md border border-dashed border-input bg-muted/50 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2 hover:bg-muted/80 transition-colors cursor-pointer">
                  <MapPin className="h-6 w-6 opacity-50" />
                  <span>Газрын зураг дээр сонгох</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="vehicle">Машины төрөл</Label>
                <div className="relative">
                  <Car className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <select
                    id="vehicle"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newTrip.vehicleModel}
                    onChange={(e) => setNewTrip({...newTrip, vehicleModel: e.target.value})}
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
