import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Edit2, Calculator, Save, X, Truck, CheckCircle2, Plus } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const PricingRules = () => {
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Edit State
  const [editingRule, setEditingRule] = useState(null);
  const [editForm, setEditForm] = useState({ basePrice: '', pricePerKm: '' });
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Additional Services State
  const [additionalServices, setAdditionalServices] = useState([]);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '' });

  // Calculator State
  const [calcDistance, setCalcDistance] = useState('');
  const [calcVehicle, setCalcVehicle] = useState(null);
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    fetchPricing();
    fetchAdditionalServices();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/pricing');
      setPricingRules(res.data);
      // Set default for calculator
      if (res.data.length > 0) setCalcVehicle(res.data[0]);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast({
        title: "Алдаа",
        description: "Тарифын мэдээлэл авахад алдаа гарлаа",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalServices = async () => {
    try {
      const res = await api.get('/admin/additional-services');
      setAdditionalServices(res.data);
    } catch (error) {
      console.error('Error fetching additional services:', error);
      toast({
        title: "Алдаа",
        description: "Нэмэлт үйлчилгээний мэдээлэл авахад алдаа гарлаа",
        status: "error"
      });
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setEditForm({ 
      basePrice: rule.basePrice.toString(), 
      pricePerKm: rule.pricePerKm.toString() 
    });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    try {
      await api.put(`/admin/pricing/${editingRule._id}`, {
        basePrice: Number(editForm.basePrice),
        pricePerKm: Number(editForm.pricePerKm)
      });
      setIsEditOpen(false);
      fetchPricing();
      toast({
        title: "Амжилттай",
        description: "Тариф шинэчлэгдлээ",
        status: "success"
      });
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast({
        title: "Алдаа",
        description: "Тариф шинэчлэхэд алдаа гарлаа",
        status: "error"
      });
    }
  };

  const handleAddService = async () => {
    try {
      await api.post('/admin/additional-services', {
        name: serviceForm.name,
        price: Number(serviceForm.price)
      });
      setIsAddServiceOpen(false);
      fetchAdditionalServices();
      setServiceForm({ name: '', price: '' });
      toast({
        title: "Амжилттай",
        description: "Нэмэлт үйлчилгээ нэмэгдлээ",
        status: "success"
      });
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "Алдаа",
        description: "Нэмэлт үйлчилгээ нэмэхэд алдаа гарлаа",
        status: "error"
      });
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({ name: service.name, price: service.price.toString() });
    setIsEditServiceOpen(true);
  };

  const handleUpdateService = async () => {
    try {
      await api.put(`/admin/additional-services/${editingService._id}`, {
        name: serviceForm.name,
        price: Number(serviceForm.price)
      });
      setIsEditServiceOpen(false);
      fetchAdditionalServices();
      setEditingService(null);
      setServiceForm({ name: '', price: '' });
      toast({
        title: "Амжилттай",
        description: "Нэмэлт үйлчилгээ шинэчлэгдлээ",
        status: "success"
      });
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Алдаа",
        description: "Нэмэлт үйлчилгээ шинэчлэхэд алдаа гарлаа",
        status: "error"
      });
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Та энэ үйлчилгээг устгахдаа итгэлтэй байна уу?')) return;
    try {
      await api.delete(`/admin/additional-services/${id}`);
      fetchAdditionalServices();
      toast({
        title: "Амжилттай",
        description: "Нэмэлт үйлчилгээ устгагдлаа",
        status: "success"
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Алдаа",
        description: "Нэмэлт үйлчилгээ устгахад алдаа гарлаа",
        status: "error"
      });
    }
  };

  const handleCalculate = () => {
    if (!calcVehicle || !calcDistance) return;
    const dist = Number(calcDistance);
    const base = calcVehicle.basePrice;
    const extra = calcVehicle.pricePerKm;
    
    let price = base;
    if (dist > 4) {
      price += (dist - 4) * extra;
    }
    setCalcResult(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-green-500">Тарифын тохиргоо</h1>
        <p className="text-muted-foreground">Хот дотор Tow Truck үйлчилгээний үнэ болон нэмэлт үйлчилгээг эндээс удирдана</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="vehicle" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-green-500/10">
              <TabsTrigger value="vehicle" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Машины төрлийн тариф
              </TabsTrigger>
              <TabsTrigger value="additional" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Нэмэлт үйлчилгээ
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="vehicle">
              <Card className="border-green-500/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-green-500" />
                    <div>
                      <CardTitle>Машины төрлийн тариф</CardTitle>
                      <CardDescription>Тээврийн хэрэгслийн төрлөөс хамаарсан үндсэн тариф</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-green-500/20">
                        <TableHead className="text-green-500">Машины төрөл</TableHead>
                        <TableHead className="text-right text-green-500">Суурь үнэ (4км)</TableHead>
                        <TableHead className="text-right text-green-500">Нэмэгдэл (1км)</TableHead>
                        <TableHead className="text-center text-green-500">Төлөв</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingRules.map((rule) => (
                        <TableRow key={rule._id} className="border-green-500/10 hover:bg-green-500/5">
                          <TableCell className="font-medium">{rule.vehicleType}</TableCell>
                          <TableCell className="text-right font-mono text-lg">{rule.basePrice.toLocaleString()}₮</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">+{rule.pricePerKm.toLocaleString()}₮</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={rule.isActive ? "success" : "secondary"} className={rule.isActive ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : ""}>
                              {rule.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)} className="hover:text-green-500 hover:bg-green-500/10">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="additional">
              <Card className="border-green-500/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <CardTitle>Нэмэлт үйлчилгээ</CardTitle>
                        <CardDescription>Дугуй тавих, гараж руу оруулах зэрэг нэмэлт үйлчилгээнүүд</CardDescription>
                      </div>
                    </div>
                    <Button onClick={() => setIsAddServiceOpen(true)} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" /> Нэмэх
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-green-500/20">
                        <TableHead className="text-green-500">Үйлчилгээний нэр</TableHead>
                        <TableHead className="text-right text-green-500">Үнэ</TableHead>
                        <TableHead className="w-[100px] text-right text-green-500">Үйлдэл</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {additionalServices.map((service) => (
                        <TableRow key={service._id} className="hover:bg-green-500/5 border-green-500/10">
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell className="text-right font-bold">{service.price.toLocaleString()}₮</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditService(service)} className="hover:text-green-500 hover:bg-green-500/10">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteService(service._id)} className="hover:text-destructive hover:bg-destructive/10">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Calculator Section */}
        <div className="lg:col-span-1">
          <Card className="border-green-500/20 bg-card/50 backdrop-blur sticky top-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-500" />
                <CardTitle>Үнэ тооцоолох</CardTitle>
              </div>
              <CardDescription>Туршилтын тооцоолол хийх</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Машины төрөл</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  onChange={(e) => setCalcVehicle(pricingRules.find(r => r._id === e.target.value))}
                  value={calcVehicle?._id || ''}
                >
                  {pricingRules.map(rule => (
                    <option key={rule._id} value={rule._id}>{rule.vehicleType}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Зай (км)</Label>
                <Input 
                  type="number" 
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(e.target.value)}
                  placeholder="0"
                />
              </div>

              <Button onClick={handleCalculate} className="w-full bg-green-600 hover:bg-green-700">
                Тооцоолох
              </Button>

              {calcResult !== null && (
                <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <span className="text-sm text-muted-foreground">Тооцоолсон үнэ</span>
                  <div className="text-2xl font-bold text-green-500">
                    {calcResult.toLocaleString()}₮
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Тариф засах</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Машины төрөл</Label>
              <Input value={editingRule?.vehicleType} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Суурь үнэ (эхний 4км)</Label>
              <Input 
                type="number"
                value={editForm.basePrice}
                onChange={(e) => setEditForm({...editForm, basePrice: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Км тутмын үнэ (4км-с хойш)</Label>
              <Input 
                type="number"
                value={editForm.pricePerKm}
                onChange={(e) => setEditForm({...editForm, pricePerKm: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Болих</Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Хадгалах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нэмэлт үйлчилгээ нэмэх</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Үйлчилгээний нэр</Label>
              <Input 
                value={serviceForm.name}
                onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                placeholder="Жишээ: Дугуй солих"
              />
            </div>
            <div className="grid gap-2">
              <Label>Үнэ</Label>
              <Input 
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddServiceOpen(false)}>Болих</Button>
            <Button onClick={handleAddService} className="bg-green-600 hover:bg-green-700">Нэмэх</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нэмэлт үйлчилгээ засах</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Үйлчилгээний нэр</Label>
              <Input 
                value={serviceForm.name}
                onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Үнэ</Label>
              <Input 
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditServiceOpen(false)}>Болих</Button>
            <Button onClick={handleUpdateService} className="bg-green-600 hover:bg-green-700">Хадгалах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingRules;
