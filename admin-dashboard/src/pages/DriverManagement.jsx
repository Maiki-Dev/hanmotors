import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Plus, Search, Pencil, Trash2, MoreHorizontal, Eye, CheckCircle } from 'lucide-react';
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
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', email: '', status: '' });
  const [addFormData, setAddFormData] = useState({ firstName: '', lastName: '', phone: '', email: '', password: 'password', vehicleType: 'Ride' });
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
    setAddFormData({ firstName: '', lastName: '', phone: '', email: '', password: 'password', vehicleType: 'Ride' });
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
      status: driver.status
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
      const updatedDriver = await driverService.updateDriver(selectedDriver._id, { status: 'active' });
      setDrivers(prev => prev.map(d => d._id === updatedDriver._id ? updatedDriver : d));
      setSelectedDriver(updatedDriver); // Update local selected driver to reflect changes
      // Optional: Close dialog or keep it open with updated status
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Шинэ жолооч нэмэх</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label>Овог</label>
                <Input 
                  value={addFormData.lastName} 
                  onChange={(e) => setAddFormData({...addFormData, lastName: e.target.value})} 
                  placeholder="Овог"
                />
              </div>
              <div className="space-y-2">
                <label>Нэр</label>
                <Input 
                  value={addFormData.firstName} 
                  onChange={(e) => setAddFormData({...addFormData, firstName: e.target.value})} 
                  placeholder="Нэр"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label>Утас</label>
              <Input 
                value={addFormData.phone} 
                onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})} 
                placeholder="Утасны дугаар"
              />
            </div>
            <div className="space-y-2">
              <label>Имэйл</label>
              <Input 
                value={addFormData.email} 
                onChange={(e) => setAddFormData({...addFormData, email: e.target.value})} 
                placeholder="driver@example.com"
              />
            </div>
            <div className="space-y-2">
              <label>Нууц үг (Анхдагч)</label>
              <Input 
                value={addFormData.password} 
                onChange={(e) => setAddFormData({...addFormData, password: e.target.value})} 
                type="password"
              />
            </div>
            <div className="space-y-2">
              <label>Тээврийн хэрэгслийн төрөл</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={addFormData.vehicleType} 
                onChange={(e) => setAddFormData({...addFormData, vehicleType: e.target.value})}
              >
                <option value="Ride">Ride</option>
                <option value="Cargo">Cargo</option>
                <option value="Tow">Tow (Ачигч)</option>
              </select>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Жолоочийн мэдээлэл засах</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label>Овог</label>
                <Input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label>Нэр</label>
                <Input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label>Утас</label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label>Имэйл</label>
              <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label>Төлөв</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Болих</Button>
            <Button onClick={handleSave}>Хадгалах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Жолоочийн дэлгэрэнгүй мэдээлэл</DialogTitle>
          </DialogHeader>
          
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
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">Жолооны үнэмлэх:</span>
                      {selectedDriver.documents?.licenseUrl ? (
                        <div className="h-32 bg-muted rounded-md flex items-center justify-center overflow-hidden border">
                           {/* Placeholder for image - in real app use <img> */}
                           <span className="text-xs text-muted-foreground">Зураг байна</span>
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

          <DialogFooter className="sm:justify-between">
             <div className="flex items-center text-sm text-muted-foreground">
                {selectedDriver?.status === 'active' ? (
                  <span className="flex items-center text-green-600 font-medium">
                    <CheckCircle className="mr-2 h-4 w-4" /> Баталгаажсан жолооч
                  </span>
                ) : (
                  <span>Баталгаажуулах шаардлагатай</span>
                )}
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
