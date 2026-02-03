import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Plus, Search, Pencil, Trash2, MoreHorizontal, Eye, CheckCircle, User, Phone, Mail, Lock, Car } from 'lucide-react';
import { driverService } from '../services/driverService';
import { socket } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    phone: '', 
    email: '', 
    status: '',
    vehicleType: '',
    vehicle: { plateNumber: '', model: '', color: '', year: '' }
  });
  const [addFormData, setAddFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    phone: '', 
    email: '', 
    password: 'password', 
    vehicleType: 'Ride',
    vehicle: { plateNumber: '', model: '', color: '', year: '' }
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const data = await driverService.getAllDrivers();
        setDrivers(data);
      } catch (error) {
        console.error("Failed to fetch drivers", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();

    socket.emit('adminJoin'); // Ensure admin joins the room
    socket.on('driverStatusUpdated', ({ driverId, isOnline }) => {
      setDrivers(prev => prev.map(d => 
        d._id === driverId ? { ...d, isOnline } : d
      ));
    });

    return () => {
      socket.off('driverStatusUpdated');
    };
  }, []);

  const handleAddClick = () => {
    setAddFormData({ 
      firstName: '', 
      lastName: '', 
      phone: '', 
      email: '', 
      password: 'password', 
      vehicleType: 'Ride',
      vehicle: { plateNumber: '', model: '', color: '', year: '' }
    });
    setIsAddOpen(true);
    setError(null);
  };

  const handleCreate = async () => {
    try {
      setError(null);
      if (!addFormData.firstName || !addFormData.lastName || !addFormData.phone || !addFormData.email) {
        setError("Бүх талбарыг бөглөнө үү.");
        return;
      }
      const newDriver = await driverService.createDriver(addFormData);
      setDrivers(prev => [newDriver, ...prev]);
      setIsAddOpen(false);
    } catch (error) {
      console.error("Failed to create driver", error);
      setError("Жолооч нэмэхэд алдаа гарлаа. " + (error.response?.data?.message || error.message));
    }
  };

  const handleEditClick = (driver) => {
    setSelectedDriver(driver);
    const nameParts = driver.name ? driver.name.split(' ') : ['', ''];
    setFormData({
      firstName: driver.firstName || nameParts.slice(1).join(' ') || '',
      lastName: driver.lastName || nameParts[0] || '',
      phone: driver.phone,
      email: driver.email,
      status: driver.status,
      vehicleType: driver.vehicleType || 'Tow',
      vehicle: {
        plateNumber: driver.vehicle?.plateNumber || '',
        model: driver.vehicle?.model || '',
        color: driver.vehicle?.color || '',
        year: driver.vehicle?.year || ''
      }
    });
    setIsEditOpen(true);
    setError(null);
  };

  const handleDeleteClick = (driver) => {
    setSelectedDriver(driver);
    setIsDeleteOpen(true);
    setError(null);
  };

  const handleDetailClick = (driver) => {
    setSelectedDriver(driver);
    setIsDetailOpen(true);
    setError(null);
  };

  const handleVerify = async () => {
    try {
      setError(null);
      // Approve all documents and activate driver
      const updates = {
        status: 'active',
        documents: {
          ...selectedDriver.documents,
          license: { ...selectedDriver.documents?.license, status: 'approved' },
          vehicleRegistration: { ...selectedDriver.documents?.vehicleRegistration, status: 'approved' },
          insurance: { ...selectedDriver.documents?.insurance, status: 'approved' },
          isVerified: true
        }
      };
      
      const updatedDriver = await driverService.updateDriver(selectedDriver._id, updates);
      setDrivers(prev => prev.map(d => d._id === updatedDriver._id ? updatedDriver : d));
      setSelectedDriver(updatedDriver); 
    } catch (error) {
      console.error("Failed to verify driver", error);
      setError("Баталгаажуулахад алдаа гарлаа. " + (error.response?.data?.message || error.message));
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      const updatedDriver = await driverService.updateDriver(selectedDriver._id, formData);
      setDrivers(prev => prev.map(d => d._id === updatedDriver._id ? updatedDriver : d));
      setIsEditOpen(false);
    } catch (error) {
      console.error("Failed to update driver", error);
      setError("Хадгалахад алдаа гарлаа. " + (error.response?.data?.message || error.message));
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setError(null);
      await driverService.deleteDriver(selectedDriver._id);
      setDrivers(prev => prev.filter(d => d._id !== selectedDriver._id));
      setIsDeleteOpen(false);
    } catch (error) {
      console.error("Failed to delete driver", error);
      setError("Устгахад алдаа гарлаа. " + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status, isOnline) => {
    if (isOnline) return <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>;
    switch (status) {
      case 'active': return <Badge className="bg-blue-600">Active</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      case 'pending': return <Badge className="bg-yellow-600">Pending</Badge>;
      case 'blocked': return <Badge variant="destructive">Blocked</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Жолоочийн удирдлага</h2>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" /> Шинэ жолооч нэмэх
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Жолооч нарын жагсаалт</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Хайх..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Нэр</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-center">Үнэлгээ</TableHead>
                <TableHead className="text-right">Бүртгүүлсэн</TableHead>
                <TableHead className="w-[100px] text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver._id || driver.id}>
                  <TableCell className="font-medium">{(driver._id || driver.id).substring(0, 8)}...</TableCell>
                  <TableCell>{driver.name}</TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>{getStatusBadge(driver.status, driver.isOnline)}</TableCell>
                  <TableCell className="text-center">{driver.rating || '-'}</TableCell>
                  <TableCell className="text-right">
                    {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : (driver.joinedDate || '-')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Үйлдэл</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleDetailClick(driver)}>
                          <Eye className="mr-2 h-4 w-4" /> Дэлгэрэнгүй
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(driver._id || driver.id)}>
                          ID хуулах
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClick(driver)}>
                          <Pencil className="mr-2 h-4 w-4" /> Засах
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(driver)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Устгах
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

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Шинэ жолооч нэмэх</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lastName">Овог</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="lastName"
                    value={addFormData.lastName} 
                    onChange={(e) => setAddFormData({...addFormData, lastName: e.target.value})} 
                    placeholder="Овог"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="firstName">Нэр</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="firstName"
                    value={addFormData.firstName} 
                    onChange={(e) => setAddFormData({...addFormData, firstName: e.target.value})} 
                    placeholder="Нэр"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Утас</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="phone"
                  value={addFormData.phone} 
                  onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})} 
                  placeholder="Утасны дугаар"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Имэйл</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email"
                  value={addFormData.email} 
                  onChange={(e) => setAddFormData({...addFormData, email: e.target.value})} 
                  placeholder="driver@example.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Нууц үг (Анхдагч)</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password"
                  value={addFormData.password} 
                  onChange={(e) => setAddFormData({...addFormData, password: e.target.value})} 
                  type="password"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicleType">Тээврийн хэрэгслийн төрөл</Label>
              <div className="relative">
                 <Car className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <select 
                    id="vehicleType"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={addFormData.vehicleType} 
                    onChange={(e) => setAddFormData({...addFormData, vehicleType: e.target.value})}
                  >
                    <option value="Ride">Ride</option>
                    <option value="Cargo">Cargo</option>
                    <option value="Tow">Tow (Ачигч)</option>
                  </select>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-semibold mb-3">Тээврийн хэрэгсэл</h4>
              <div className="grid gap-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="add-plate">Улсын дугаар</Label>
                      <Input 
                        id="add-plate"
                        value={addFormData.vehicle.plateNumber} 
                        onChange={(e) => setAddFormData({
                          ...addFormData, 
                          vehicle: { ...addFormData.vehicle, plateNumber: e.target.value }
                        })} 
                        placeholder="1234 УБА"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="add-model">Загвар</Label>
                      <Input 
                        id="add-model"
                        value={addFormData.vehicle.model} 
                        onChange={(e) => setAddFormData({
                          ...addFormData, 
                          vehicle: { ...addFormData.vehicle, model: e.target.value }
                        })} 
                        placeholder="Porter"
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="add-year">Он</Label>
                      <Input 
                        id="add-year"
                        value={addFormData.vehicle.year} 
                        onChange={(e) => setAddFormData({
                          ...addFormData, 
                          vehicle: { ...addFormData.vehicle, year: e.target.value }
                        })} 
                        placeholder="2015"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="add-color">Өнгө</Label>
                      <Input 
                        id="add-color"
                        value={addFormData.vehicle.color} 
                        onChange={(e) => setAddFormData({
                          ...addFormData, 
                          vehicle: { ...addFormData.vehicle, color: e.target.value }
                        })} 
                        placeholder="Цагаан"
                      />
                    </div>
                 </div>
              </div>
            </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Болих</Button>
            <Button onClick={handleCreate}>Нэмэх</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Жолоочийн мэдээлэл засах</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">Овог</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="edit-lastName"
                    value={formData.lastName} 
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">Нэр</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="edit-firstName"
                    value={formData.firstName} 
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Утас</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="edit-phone"
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Имэйл</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="edit-email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Төлөв</Label>
              <div className="relative">
                 <CheckCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <select 
                    id="edit-status"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.status} 
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                    <option value="pending">Pending</option>
                  </select>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-semibold mb-3">Тээврийн хэрэгсэл</h4>
              <div className="grid gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="edit-vehicleType">Төрөл</Label>
                    <div className="relative">
                       <Car className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <select 
                          id="edit-vehicleType"
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={formData.vehicleType} 
                          onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                        >
                          <option value="Ride">Ride</option>
                          <option value="Cargo">Cargo</option>
                          <option value="Tow">Tow (Ачигч)</option>
                        </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-plate">Улсын дугаар</Label>
                      <Input 
                        id="edit-plate"
                        value={formData.vehicle.plateNumber} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          vehicle: { ...formData.vehicle, plateNumber: e.target.value }
                        })} 
                        placeholder="1234 УБА"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-model">Загвар</Label>
                      <Input 
                        id="edit-model"
                        value={formData.vehicle.model} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          vehicle: { ...formData.vehicle, model: e.target.value }
                        })} 
                        placeholder="Porter"
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-year">Он</Label>
                      <Input 
                        id="edit-year"
                        value={formData.vehicle.year} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          vehicle: { ...formData.vehicle, year: e.target.value }
                        })} 
                        placeholder="2015"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-color">Өнгө</Label>
                      <Input 
                        id="edit-color"
                        value={formData.vehicle.color} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          vehicle: { ...formData.vehicle, color: e.target.value }
                        })} 
                        placeholder="Цагаан"
                      />
                    </div>
                 </div>
              </div>
            </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Болих</Button>
            <Button onClick={handleSave}>Хадгалах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Жолоочийг устгах уу?</DialogTitle>
            <DialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. {selectedDriver?.name} жолоочийг системээс бүрмөсөн устгах болно.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Болих</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Устгах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail & Verify Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Жолоочийн дэлгэрэнгүй мэдээлэл</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            {selectedDriver && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Profile Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedDriver.profilePhoto} />
                    <AvatarFallback className="text-2xl">{selectedDriver.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedDriver.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(selectedDriver.status, selectedDriver.isOnline)}
                      <span className="text-sm text-muted-foreground">ID: {(selectedDriver._id || selectedDriver.id).substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border rounded-md p-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase">Хувийн мэдээлэл</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">Утас:</span>
                    <span className="font-medium">{selectedDriver.phone}</span>
                    <span className="text-muted-foreground">Имэйл:</span>
                    <span className="font-medium">{selectedDriver.email}</span>
                    <span className="text-muted-foreground">Бүртгүүлсэн:</span>
                    <span>{selectedDriver.createdAt ? new Date(selectedDriver.createdAt).toLocaleDateString() : '-'}</span>
                  </div>
                </div>

                <div className="space-y-2 border rounded-md p-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase">Тээврийн хэрэгсэл</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">Төрөл:</span>
                    <span className="font-medium">{selectedDriver.vehicleType}</span>
                    <span className="text-muted-foreground">Загвар:</span>
                    <span>{selectedDriver.vehicle?.model || '-'}</span>
                    <span className="text-muted-foreground">Улсын дугаар:</span>
                    <span className="font-medium">{selectedDriver.vehicle?.plateNumber || '-'}</span>
                    <span className="text-muted-foreground">Өнгө:</span>
                    <span>{selectedDriver.vehicle?.color || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Documents & Wallet Section */}
              <div className="space-y-4">
                 {/* Wallet Section */}
                 <div className="space-y-2 border rounded-md p-4 bg-muted/20">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="font-semibold text-sm text-muted-foreground uppercase">Данс & Төлбөр</h4>
                       <Badge variant="outline" className="text-primary border-primary">
                         {selectedDriver.wallet?.balance?.toLocaleString() || 0}₮
                       </Badge>
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-xs text-muted-foreground font-medium mb-1">Сүүлийн гүйлгээнүүд:</p>
                       {selectedDriver.wallet?.transactions && selectedDriver.wallet.transactions.length > 0 ? (
                         <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                           {selectedDriver.wallet.transactions.slice(0, 5).map((tx, idx) => (
                             <div key={idx} className="flex justify-between text-xs border-b pb-1 last:border-0">
                               <div>
                                 <span className={tx.type === 'credit' ? 'text-green-600 font-bold mr-1' : 'text-red-600 font-bold mr-1'}>
                                   {tx.type === 'credit' ? '+' : '-'}{tx.amount?.toLocaleString()}₮
                                 </span>
                                 <span className="text-muted-foreground">{tx.description}</span>
                               </div>
                               <span className="text-[10px] text-muted-foreground">
                                 {new Date(tx.date).toLocaleDateString()}
                               </span>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-xs text-muted-foreground italic">Гүйлгээ хийгдээгүй байна.</p>
                       )}
                    </div>
                 </div>

                 <div className="space-y-2 border rounded-md p-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-4">Баримт бичиг</h4>
                  
                  <div className="space-y-6">
                    {/* License */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Жолооны үнэмлэх</span>
                        {selectedDriver.documents?.license?.status && (
                           <Badge variant={selectedDriver.documents.license.status === 'approved' ? 'default' : selectedDriver.documents.license.status === 'rejected' ? 'destructive' : 'secondary'}>
                             {selectedDriver.documents.license.status}
                           </Badge>
                        )}
                      </div>
                      {selectedDriver.documents?.license?.url ? (
                        <div className="h-48 bg-muted rounded-md overflow-hidden border relative group">
                           <img 
                             src={selectedDriver.documents.license.url} 
                             alt="License" 
                             className="w-full h-full object-contain bg-black/5" 
                           />
                           <a href={selectedDriver.documents.license.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium cursor-pointer">
                             Томоор харах
                           </a>
                        </div>
                      ) : (
                        <div className="h-32 bg-muted/50 rounded-md flex items-center justify-center border border-dashed">
                          <span className="text-xs text-muted-foreground">Зураг байхгүй</span>
                        </div>
                      )}
                    </div>

                    {/* Vehicle Registration */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Тээврийн хэрэгслийн гэрчилгээ</span>
                         {selectedDriver.documents?.vehicleRegistration?.status && (
                           <Badge variant={selectedDriver.documents.vehicleRegistration.status === 'approved' ? 'default' : selectedDriver.documents.vehicleRegistration.status === 'rejected' ? 'destructive' : 'secondary'}>
                             {selectedDriver.documents.vehicleRegistration.status}
                           </Badge>
                        )}
                      </div>
                      {selectedDriver.documents?.vehicleRegistration?.url ? (
                        <div className="h-48 bg-muted rounded-md overflow-hidden border relative group">
                           <img 
                             src={selectedDriver.documents.vehicleRegistration.url} 
                             alt="Vehicle Registration" 
                             className="w-full h-full object-contain bg-black/5" 
                           />
                           <a href={selectedDriver.documents.vehicleRegistration.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium cursor-pointer">
                             Томоор харах
                           </a>
                        </div>
                      ) : (
                        <div className="h-32 bg-muted/50 rounded-md flex items-center justify-center border border-dashed">
                          <span className="text-xs text-muted-foreground">Зураг байхгүй</span>
                        </div>
                      )}
                    </div>

                    {/* Insurance */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Жолоочийн хариуцлагын даатгал</span>
                         {selectedDriver.documents?.insurance?.status && (
                           <Badge variant={selectedDriver.documents.insurance.status === 'approved' ? 'default' : selectedDriver.documents.insurance.status === 'rejected' ? 'destructive' : 'secondary'}>
                             {selectedDriver.documents.insurance.status}
                           </Badge>
                        )}
                      </div>
                      {selectedDriver.documents?.insurance?.url ? (
                        <div className="h-48 bg-muted rounded-md overflow-hidden border relative group">
                           <img 
                             src={selectedDriver.documents.insurance.url} 
                             alt="Insurance" 
                             className="w-full h-full object-contain bg-black/5" 
                           />
                           <a href={selectedDriver.documents.insurance.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium cursor-pointer">
                             Томоор харах
                           </a>
                        </div>
                      ) : (
                        <div className="h-32 bg-muted/50 rounded-md flex items-center justify-center border border-dashed">
                          <span className="text-xs text-muted-foreground">Зураг байхгүй</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between">
             <div className="text-sm text-muted-foreground">
               {selectedDriver?.status === 'pending' && "Шалгаж баталгаажуулна уу."}
             </div>
             <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Хаах</Button>
                {selectedDriver?.status !== 'active' && (
                  <Button onClick={handleVerify} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" /> Баталгаажуулах
                  </Button>
                )}
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverManagement;
