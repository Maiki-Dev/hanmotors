import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Eye, MapPin, Plus, Car, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
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
import api from '../services/api';

const TripManagement = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tripsRes, driversRes] = await Promise.all([
        api.get('/admin/trips'),
        api.get('/admin/drivers')
      ]);
      setTrips(tripsRes.data);
      setDrivers(driversRes.data.filter(d => d.status === 'active')); // Only active drivers
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
        serviceType: 'Tow',
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Шинэ дуудлага бүртгэх</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Авах хаяг</label>
                <div className="flex space-x-2 text-xs bg-muted p-1 rounded-md">
                  <button 
                    className={`px-2 py-0.5 rounded ${newTrip.pickupMode === 'text' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setNewTrip({...newTrip, pickupMode: 'text'})}
                  >
                    Бичих
                  </button>
                  <button 
                    className={`px-2 py-0.5 rounded ${newTrip.pickupMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setNewTrip({...newTrip, pickupMode: 'map'})}
                  >
                    Газрын зураг
                  </button>
                </div>
              </div>
              {newTrip.pickupMode === 'text' ? (
                <Input 
                  value={newTrip.pickupLocation.address}
                  onChange={(e) => setNewTrip({...newTrip, pickupLocation: {...newTrip.pickupLocation, address: e.target.value}})}
                  placeholder="Сүхбаатар талбай"
                />
              ) : (
                <div className="h-20 w-full rounded-md border border-dashed border-input bg-muted/50 flex flex-col items-center justify-center text-sm text-muted-foreground gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>Газрын зураг сонгох хэсэг</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Хүргэх хаяг</label>
                <div className="flex space-x-2 text-xs bg-muted p-1 rounded-md">
                  <button 
                    className={`px-2 py-0.5 rounded ${newTrip.dropoffMode === 'text' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setNewTrip({...newTrip, dropoffMode: 'text'})}
                  >
                    Бичих
                  </button>
                  <button 
                    className={`px-2 py-0.5 rounded ${newTrip.dropoffMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setNewTrip({...newTrip, dropoffMode: 'map'})}
                  >
                    Газрын зураг
                  </button>
                </div>
              </div>
              {newTrip.dropoffMode === 'text' ? (
                <Input 
                  value={newTrip.dropoffLocation.address}
                  onChange={(e) => setNewTrip({...newTrip, dropoffLocation: {...newTrip.dropoffLocation, address: e.target.value}})}
                  placeholder="Зайсан"
                />
              ) : (
                <div className="h-20 w-full rounded-md border border-dashed border-input bg-muted/50 flex flex-col items-center justify-center text-sm text-muted-foreground gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>Газрын зураг сонгох хэсэг</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Үнэ (₮)</label>
              <Input 
                type="number"
                value={newTrip.price}
                onChange={(e) => setNewTrip({...newTrip, price: e.target.value})}
                placeholder="15000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ямар машин</label>
              <Input 
                value={newTrip.vehicleModel}
                onChange={(e) => setNewTrip({...newTrip, vehicleModel: e.target.value})}
                placeholder="Приус 20, Портер г.м"
              />
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium">Эвдрэл гэмтэл байгаа эсэх</label>
               <select 
                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 value={newTrip.hasDamage.toString()}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Дуудлага засах</DialogTitle>
          </DialogHeader>
          {editingTrip && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Авах хаяг</label>
                <Input 
                  value={editingTrip.pickupLocation.address}
                  onChange={(e) => setEditingTrip({...editingTrip, pickupLocation: {...editingTrip.pickupLocation, address: e.target.value}})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Хүргэх хаяг</label>
                <Input 
                  value={editingTrip.dropoffLocation.address}
                  onChange={(e) => setEditingTrip({...editingTrip, dropoffLocation: {...editingTrip.dropoffLocation, address: e.target.value}})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Үнэ (₮)</label>
                <Input 
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Жолооч хуваарилах</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Жолооч сонгох</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
