import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Edit2, Calculator, Save, X, Truck, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const PricingRules = () => {
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Edit State
  const [editingRule, setEditingRule] = useState(null);
  const [editForm, setEditForm] = useState({ basePrice: '', pricePerKm: '' });
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Calculator State
  const [calcDistance, setCalcDistance] = useState('');
  const [calcVehicle, setCalcVehicle] = useState(null);
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    fetchPricing();
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
    } finally {
      setLoading(false);
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
      // Toast would go here
      // toast.success("Тариф амжилттай шинэчлэгдлээ");
    } catch (error) {
      console.error('Error updating pricing:', error);
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
        <p className="text-muted-foreground">Хот дотор Tow Truck үйлчилгээний үнийг эндээс удирдана</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pricing Table Section */}
        <Card className="lg:col-span-2 border-green-500/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-500" />
              <CardTitle>Машины төрлийн тариф</CardTitle>
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

        {/* Calculator Section */}
        <Card className="border-green-500/20 h-fit">
          <CardHeader className="bg-green-500/10 border-b border-green-500/10">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-500" />
              <CardTitle>Үнэ тооцоолох тест</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Машины төрөл</Label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={calcVehicle?._id || ''}
                onChange={(e) => setCalcVehicle(pricingRules.find(r => r._id === e.target.value))}
              >
                {pricingRules.map(r => (
                  <option key={r._id} value={r._id}>{r.vehicleType}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Зай (км)</Label>
              <Input 
                type="number" 
                placeholder="Жишээ: 15" 
                value={calcDistance}
                onChange={(e) => {
                  setCalcDistance(e.target.value);
                  setCalcResult(null); // Reset result on change
                }}
              />
            </div>

            <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold" onClick={handleCalculate}>
              Тооцоолох
            </Button>

            {calcResult !== null && (
              <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center animate-in fade-in zoom-in duration-300">
                <p className="text-sm text-muted-foreground mb-1">Тооцоолсон үнэ</p>
                <p className="text-3xl font-bold text-green-500">{calcResult.toLocaleString()}₮</p>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded border border-border">
              <p className="font-semibold mb-1">Томьёо:</p>
              <p>• ≤ 4км: Суурь үнэ</p>
              <p>• &gt; 4км: Суурь + (Зай - 4) × Нэмэгдэл</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] border-green-500/20">
          <DialogHeader>
            <DialogTitle>Тариф засах</DialogTitle>
          </DialogHeader>
          
          {editingRule && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Машины төрөл</Label>
                <div className="p-2 rounded bg-muted text-sm font-medium">
                  {editingRule.vehicleType}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Суурь үнэ (₮)</Label>
                  <Input 
                    type="number" 
                    value={editForm.basePrice}
                    onChange={(e) => setEditForm({...editForm, basePrice: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground">4км хүртэлх үнэ</p>
                </div>
                <div className="space-y-2">
                  <Label>1км нэмэгдэл (₮)</Label>
                  <Input 
                    type="number" 
                    value={editForm.pricePerKm}
                    onChange={(e) => setEditForm({...editForm, pricePerKm: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground">4км-ээс дээш</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Цуцлах</Button>
            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white font-bold">
              <Save className="w-4 h-4 mr-2" />
              Хадгалах
            </Button>
          </DialogFooter>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-green-500 justify-center">
            <CheckCircle2 className="w-3 h-3" />
            <span>Үнэ хадгалагдмагц Driver App дээр шууд шинэчлэгдэнэ</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingRules;
